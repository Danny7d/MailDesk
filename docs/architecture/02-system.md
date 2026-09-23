# 02 — System Architecture

> Section D. Services, responsibilities, and the seven flows that define the system.

## D.1 Topology

```
                          Internet
                             │
                    ┌────────▼─────────┐
                    │   Cloudflare     │  DNS, TLS edge, WAF, bot rules, caching
                    │   (proxy on)     │  MX → Resend inbound
                    └────────┬─────────┘
                             │  TLS
                    ┌────────▼─────────┐
                    │   nginx          │  single public entrypoint on the VPS
                    │   :443           │  ACME, real-IP, buffering rules, body limits
                    └───┬────┬────┬────┘
             ┌──────────┘    │    └──────────────┐
             │               │                   │
    ┌────────▼──────┐ ┌──────▼───────┐  ┌────────▼────────┐
    │  web          │ │  api         │  │ api (SSE loc.)  │
    │  Next.js      │ │  Fastify     │  │ proxy_buffering │
    │  :3000        │ │  :4000       │  │      off        │
    └───────────────┘ └──┬───┬───┬───┘  └─────────────────┘
                         │   │   │
        ┌────────────────┘   │   └──────────────┐
        │                    │                  │
┌───────▼────────┐  ┌────────▼───────┐  ┌───────▼────────┐
│  PostgreSQL    │  │  Redis         │  │  R2 / MinIO    │
│  :5432         │  │  :6379         │  │  object store  │
│  system of     │  │  sessions,     │  │  attachments   │
│  record + RLS  │  │  queues,       │  │                │
│                │  │  pub/sub,      │  │                │
│                │  │  rate limits,  │  │                │
│                │  │  cache         │  │                │
└───────▲────────┘  └────────▲───────┘  └───────▲────────┘
        │                    │                  │
        └──────────┬─────────┴──────────────────┘
                   │
          ┌────────▼─────────┐
          │  worker          │  BullMQ consumers, outbox relay, cron
          │  (N replicas)    │  no inbound ports
          └────────┬─────────┘
                   │  egress only
        ┌──────────┼──────────┬──────────┬─────────┐
        ▼          ▼          ▼          ▼         ▼
     Resend    Telegram     Meta      Stripe   Anthropic
```

nginx is the **only** process with a published port. Postgres, Redis, and the object store are on a private
Docker network with no host port bindings in production.

## D.2 Services and responsibilities

### `web` — Next.js
Marketing site and dashboard. **Owns no business logic and holds no database credentials.** It calls the API
over HTTP, forwarding the session cookie. Server Components may call the API server-side (same host, via the
internal Docker network) to render the first paint; everything else is client-side fetch.

> This is a deliberate change from today, where Server Components query Prisma directly. Direct DB access from
> the frontend means the tenancy rules live in two places. One authority.

### `api` — Fastify
The only writer to Postgres on the request path. Responsibilities:
authentication and session lifecycle · authorization and tenant context · request validation ·
webhook ingestion (verify + persist + enqueue, nothing more) · SSE fan-out · rate limiting ·
idempotency handling · presigned URL minting · audit logging.

**Explicitly not:** calling third-party APIs on the request path, sending messages, parsing MIME, generating
AI output, processing attachments. All of that is the worker's.

### `worker` — Node, same image, different entrypoint
No inbound ports. Responsibilities:
outbox relay · provider event normalization · outbound message delivery · attachment fetch/scan/store ·
MIME parsing · OAuth token refresh · domain DNS re-verification · usage rollups · AI enrichment ·
scheduled maintenance · Stripe reconciliation.

Runs multiple named queues with independent concurrency so a slow attachment download cannot starve outbound
sends. Scales by adding replicas.

### Datastores
- **PostgreSQL** — the system of record. Every durable fact lives here. RLS is the tenancy backstop.
- **Redis** — everything *derived or ephemeral*: session cache, rate-limit counters, BullMQ, pub/sub for SSE,
  short-lived provider response caches, distributed locks. **Rule: losing all of Redis must never lose
  customer data.** It costs a cold cache and re-queued jobs (the outbox re-drives them), nothing more.
- **Object store** — attachment bytes only, keyed by org. Metadata lives in Postgres.

## D.3 Inbound message flow (the most important flow in the system)

```
 Provider (Resend / Telegram / Meta)
   │
   │ POST /webhooks/{provider}          raw body, provider signature
   ▼
┌──────────────────────── api ─────────────────────────┐
│ 1  read RAW body (no JSON parse yet)                 │
│ 2  verify signature — constant-time compare          │  ✗ → 401, log, stop
│ 3  check timestamp freshness (±5 min replay window)  │  ✗ → 401
│ 4  BEGIN                                             │
│ 5    INSERT provider_events (provider, event_id, …)  │
│         ON CONFLICT (provider, provider_event_id)    │
│         DO NOTHING                                   │  0 rows → duplicate → 200 {dup}
│ 6    INSERT outbox (topic='provider_event.received') │
│ 7  COMMIT                                            │
│ 8  return 200 {received:true}         target < 50 ms │
└──────────────────────────────────────────────────────┘
   │                                    NO external calls. NO business logic.
   │ outbox relay (≤1 s)
   ▼
┌──────────────────────── worker ──────────────────────┐
│  9  claim provider_event (FOR UPDATE SKIP LOCKED)    │
│ 10  adapter.parse(payload) → NormalizedEvent[]       │
│ 11  resolve channel   (address / bot_id / page_id)   │  unresolvable → status='unrouted', alert
│ 12  → org_id is now known; open tenant transaction   │
│ 13  BEGIN; SET LOCAL app.current_org_id              │
│ 14    upsert contact + contact_identity              │
│ 15    resolve or create conversation (thread key)    │
│ 16    INSERT message ON CONFLICT (org,conv,prov_id)  │  ← idempotent
│ 17    INSERT message_status_event                    │
│ 18    recompute conversation denormals               │
│ 19    INSERT outbox (attachments.fetch × N)          │
│ 20    INSERT outbox (realtime.publish)               │
│ 21    INSERT audit_log                               │
│ 22  COMMIT                                           │
│ 23  mark provider_event processed                    │
└──────────────────────────────────────────────────────┘
   │
   ├─→ attachment worker: fetch → sniff → scan → R2 → update row → realtime.publish
   └─→ Redis PUBLISH org:{id}:events
          │
          ▼
      api SSE handlers holding connections for that org → browser
```

**Why the steps are in that order.** Signature before parse, because parsing attacker-controlled JSON is
attack surface. Persist before process, because the raw payload is the only evidence you will have when
normalization has a bug — you can re-drive from `provider_events` forever. Resolve the channel *before*
opening the tenant transaction, because at ingest time you do not yet know the org, and guessing is how
cross-tenant leaks happen.

**Non-negotiable rules:**
1. A webhook handler never calls an external API.
2. A webhook returns 2xx unless the *signature* is bad or *your own datastore* is down. Business problems —
   unknown recipient, unparseable body, suspended org — are 200 + parked row + alert. Non-2xx means "please
   retry," and you must only say that when you mean it.
3. Every write in the worker is idempotent, because at-least-once delivery guarantees you will replay.

## D.4 Outbound message flow

```
POST /v1/orgs/{org}/conversations/{id}/messages
  Idempotency-Key: <client uuid>
  │
  ├─ authn (session or API key) → authz (membership role ≥ agent)
  ├─ replay check: idempotency_keys → hit? return stored response verbatim
  ├─ entitlement: assertQuota(org,'monthly_messages',1)
  ├─ policy gates:
  │    • channel active?
  │    • reply window open?  (Telegram/Meta have hard windows)
  │    • recipient on suppression list?  → 422, never send
  │    • sender identity verified for this org?
  ├─ sanitize body (server-side, allowlist)
  ├─ BEGIN
  │    INSERT message (direction=outbound, status='queued')
  │    INSERT message_status_event('queued')
  │    INSERT usage_event (idempotent on key)
  │    INSERT outbox ('message.send')
  │    INSERT audit_log
  │  COMMIT
  └─ 202 Accepted { message_id, status:'queued' }      ← never block on the provider

worker: message.send
  ├─ load message + channel + credentials (decrypt, key_version aware)
  ├─ transport.send(normalized) →  provider_message_id
  ├─ status → 'sent'; record provider id; realtime.publish
  ├─ retryable failure (5xx, 429, timeout) → BullMQ backoff, max 5
  └─ terminal failure (422 invalid recipient) → status 'failed', reason, no retry,
       refund the usage counter, realtime.publish
```

The API returns **202, not 200**. The message is accepted, not sent. The UI renders it optimistically as
"sending" and updates over SSE. This is the single most important API-shape decision for perceived
performance, and it is also what makes provider outages survivable.

## D.5 Delivery-event flow and out-of-order handling

Delivery events (`sent`, `delivered`, `bounced`, `complained`, `opened`) arrive **out of order** and
**more than once**. Never `UPDATE messages SET status = $incoming`.

Two mechanisms together:

**1. Append-only event log.** Every event becomes a `message_status_events` row, unique on
`(org_id, provider_event_id)`. Nothing is ever overwritten; the history is the truth.

**2. Monotonic projection.** `messages.status` is a cache of the log, advanced only forward through a
precedence lattice:

```
queued(10) → sending(20) → sent(30) → delivered(40) → read(50)
                     ↘ terminal, sticky, wins over everything: bounced(90), complained(95), failed(85)
```

```sql
UPDATE messages
   SET status = $new, status_rank = $new_rank, status_at = $occurred_at
 WHERE id = $id
   AND org_id = $org
   AND ($new_rank > status_rank
        OR (status_rank < 85 AND $new_rank >= 85));  -- terminal always applies
```

So a late-arriving `sent` after `delivered` is recorded in the log and ignored by the projection. A `bounced`
arriving after `delivered` (which happens — soft bounce after acceptance) wins, because a bounce is a fact you
must act on. **`bounced` and `complained` additionally write to `suppressions` in the same transaction.**

## D.6 Authentication flow

```
Password login
  POST /v1/auth/login  {email, password}
    ├─ Redis rate limit: per-IP AND per-email  (both; per-IP alone allows credential stuffing
    │                                            from a botnet, per-email alone allows IP-based spraying)
    ├─ lookup user by lower(email)
    ├─ argon2id verify  — on unknown user, verify against a dummy hash anyway
    │                     (constant-ish time; prevents user enumeration by timing)
    ├─ require email_verified_at, check status != suspended
    ├─ if mfa_enabled → 200 {mfa_required, mfa_token} and stop
    ├─ token = randomBytes(32); INSERT sessions (token_hash = sha256(token), ip, ua, expires_at)
    ├─ Set-Cookie: __Host-mdsid=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=…
    └─ 200 {user, organizations:[…]}

Google OAuth  (arctic)
  GET  /v1/auth/oauth/google        → state + PKCE verifier in a short-lived signed cookie, 302 to Google
  GET  /v1/auth/oauth/google/callback
      ├─ verify state (CSRF) and exchange code with PKCE verifier
      ├─ validate the ID token: signature, iss, aud, exp, nonce
      ├─ REQUIRE email_verified === true from Google
      │     ← without this check, an attacker registers an unverified Google account
      │       with your victim's address and takes over by "linking"
      ├─ link by verified email, or create user
      └─ issue session exactly as above

Every subsequent request
  cookie → sha256 → sessions lookup (Redis first, Postgres on miss)
    ├─ expired / revoked → 401 + clear cookie
    ├─ sliding refresh: touch last_seen_at at most once per 60 s
    └─ attach { userId } to the request

Org scoping — resolved per request, never trusted from the client
  path /v1/orgs/{orgId}/…
    ├─ SELECT role FROM memberships WHERE user_id AND org_id   (Redis-cached, short TTL)
    ├─ no row → 404 (not 403 — a 403 confirms the org exists)
    └─ attach { userId, orgId, role } and open the tx with SET LOCAL app.current_org_id
```

CSRF: `SameSite=Lax` blocks cross-site POSTs from forms, and the API requires
`Content-Type: application/json` plus rejects cross-origin requests not on the allowlist — together that is
sufficient for a same-site cookie API. **Webhook routes are exempt from all of it** and authenticate purely by
signature.

## D.7 Billing flow

```
Upgrade
  POST /v1/orgs/{org}/billing/checkout   (role = owner only)
    → find-or-create Stripe customer, store stripe_customer_id
    → Checkout Session (price_id, client_reference_id = org_id, idempotency key)
    → 200 {url};  browser redirects to Stripe

Stripe → POST /webhooks/stripe
    → verify signature (raw body)  → persist provider_event → 200
    worker:
      checkout.session.completed          → subscription row, materialize entitlements
      customer.subscription.updated       → plan/status change → re-materialize
      customer.subscription.deleted       → downgrade to free entitlements at period end
      invoice.payment_failed              → grace period, notify owners, mark past_due
      invoice.paid                        → clear past_due, reset period usage counters

Enforcement — one call site, never a plan conditional
  assertEntitlement(ctx, 'max_integrations')          → boolean/limit gate
  assertQuota(ctx, 'monthly_messages', 1)             → atomic counter, throws 402 over limit

Lapse policy (decide it now, not during an incident)
  past_due          → full function for 7 days, banner
  after grace       → READ-ONLY: inbound still received and stored, outbound blocked
  canceled          → read-only + export available for 30 days, then scheduled deletion
  NEVER             → drop inbound messages or delete data on non-payment
```

Materialize `org_entitlements` from `plan_entitlements` + `entitlement_overrides` on every subscription
change, so the hot path is a single indexed read and never a join across billing tables.

## D.8 Background job flow

```
                 ┌──────────────┐
   API writes    │   outbox     │  Postgres, same tx as the state change
   ───────────►  │ (unpublished)│
                 └──────┬───────┘
                        │ relay: every 250 ms
                        │ SELECT … WHERE published_at IS NULL AND available_at <= now()
                        │ ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 100
                        ▼
                 ┌──────────────┐
                 │   BullMQ     │  Redis
                 └──────┬───────┘
        ┌───────────────┼───────────────┬──────────────┐
        ▼               ▼               ▼              ▼
  provider-events  outbound-send   attachments    maintenance
  conc. 10         conc. 5/channel  conc. 3       conc. 1
        │               │               │              │
        └───────────────┴───────┬───────┴──────────────┘
                                │ exhausted retries
                                ▼
                        ┌───────────────┐
                        │  dead_letters │  Postgres, not just Redis —
                        │  (inspectable)│  survives a Redis flush, queryable, re-drivable
                        └───────────────┘
```

**Synchronous (in the request) vs asynchronous (in a worker):**

| Sync — must be true before responding | Async — everything else |
|---|---|
| authn / authz / tenant resolution | any third-party API call |
| input validation | message delivery |
| entitlement + quota check | MIME parsing, attachment fetch, virus scan |
| the durable state write | delivery-event application |
| the outbox insert | AI summaries and suggestions |
| audit log write | usage rollups, notification emails |
| cheap derived reads | DNS re-verification, token refresh |

The test: *if this step fails, should the user's request fail?* Provider is down → the user's Send should
still succeed (queued). Quota exceeded → the request must fail. That is the whole rule.

## D.9 Realtime flow

```
browser  EventSource('/v1/orgs/{org}/events', {withCredentials:true})
   │        Last-Event-ID: 4821          ← browser sends this automatically on reconnect
   ▼
api  GET /v1/orgs/{org}/events
  ├─ authn + membership check (an SSE stream is an authorization boundary like any other)
  ├─ if Last-Event-ID: replay from event_log WHERE org_id AND id > $lastId  (bounded, e.g. 500)
  ├─ SUBSCRIBE org:{orgId}:events on a per-connection Redis subscriber
  ├─ stream frames; ':ka\n\n' keepalive every 20 s (under nginx's 60 s read timeout)
  └─ on client disconnect: unsubscribe, close, decrement gauge

Frame payload — deliberately minimal
  id: 4822
  event: message.created
  data: {"conversation_id":"…","message_id":"…","v":7}
```

**Push invalidation, not data.** The frame says *what changed*; the client refetches through the normal
authorized REST endpoint. This means a bug in channel subscription cannot leak message bodies — the worst case
is an unauthorized client learns that *an ID changed*, and the refetch is authorized independently.
Message bodies over a pub/sub channel is a data-leak class waiting for one wrong `orgId` interpolation.

nginx must set `proxy_buffering off`, `proxy_cache off`, `proxy_read_timeout 3600s`, and HTTP/1.1 for the SSE
location, or frames sit in a buffer and realtime silently doesn't work.

## D.10 Trust boundaries

```
┌─ UNTRUSTED ───────────────────────────────────────────────────┐
│ browsers · provider webhook payloads · inbound email bodies   │
│ attachment bytes · contact-supplied names · OAuth callbacks   │
└───────────────┬───────────────────────────────────────────────┘
                │ validate · verify signature · sanitize · sniff
┌─ SEMI-TRUSTED ▼──────────────────────────────────────────────┐
│ authenticated user within their org (may be malicious to     │
│ other orgs, to their own org's other members, and to you)    │
└───────────────┬──────────────────────────────────────────────┘
                │ authz · RLS · entitlements · rate limits · audit
┌─ TRUSTED ─────▼──────────────────────────────────────────────┐
│ api · worker · Postgres · Redis  (private network, no        │
│ published ports except via nginx)                            │
└──────────────────────────────────────────────────────────────┘
```

The boundary that gets violated in practice is the middle one. A logged-in user is *not* trusted: they will
try other orgs' IDs, replay their own requests, upload hostile files, and probe for IDOR. Design as if they
will, because they will.
