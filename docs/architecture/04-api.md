# 04 — API Architecture

> Section F. REST over HTTP/JSON. Base path `/v1`. OpenAPI generated from the Zod schemas.

## Conventions

**Org scoping is explicit in the path**: `/v1/orgs/{orgId}/conversations`. Not an `X-Org-Id` header, not an
implicit "current org" in the session. Reasons: the authorization check becomes structurally unavoidable
(a plugin on the `/v1/orgs/:orgId` prefix resolves membership once and every child route inherits it), URLs
are unambiguous in logs and audit records, and a user in two orgs can have both open in two tabs.

**Verbs and status codes**: `POST` create → `201` + `Location`, or `202` when the effect is asynchronous.
`PATCH` for partial update, never `PUT`. `DELETE` → `204`. Reads → `200`.
**`404` not `403` for cross-tenant access** — a `403` confirms the resource exists, which is an information
leak that helps an attacker enumerate.

**Error envelope** — one shape, everywhere, including 500s:

```json
{ "error": {
    "type": "validation_error",
    "code": "recipient_suppressed",
    "message": "This address is on your suppression list after a hard bounce.",
    "details": [{ "path": "to[0]", "message": "suppressed" }],
    "request_id": "req_01J8X2..." } }
```

`type` is the coarse machine class (`validation_error`, `authentication_error`, `permission_error`,
`not_found`, `conflict`, `rate_limited`, `quota_exceeded`, `provider_error`, `internal_error`).
`code` is the specific, stable, documented reason a client may branch on. `message` is human-readable and
**never contains internal detail** — no stack traces, no SQL, no provider payloads. `request_id` is in every
response and every log line, so a user can paste it into support and you can find the request.

**Pagination**: cursor only. The cursor is opaque base64 of `(sort_key, id)` — never an offset, because
`OFFSET 10000` on the messages table is a sequential scan and because new messages arriving mid-pagination
shift offsets and silently skip rows.

```
GET /v1/orgs/{org}/conversations?status=open&limit=50&cursor=eyJ0IjoiMjAyNi0wOC0yMy4uLiJ9
→ { "data": [...], "next_cursor": "eyJ0Ijo...", "has_more": true }
```

No total count by default (it costs a second full scan). Offer `?include_count=true` for the cases that need it.

**Idempotency**: required on every `POST` with an external side effect (message send, checkout, integration
connect). Client sends `Idempotency-Key: <uuid>`. Server: insert into `idempotency_keys` with
`state='in_progress'` and a fingerprint of method+path+body; on conflict, if `completed` replay the stored
response byte-for-byte, if `in_progress` return `409 request_in_progress`, if the fingerprint differs return
`422 idempotency_key_reuse`. TTL 24h.

**Validation**: one Zod schema per route, in `packages/contracts`, imported by both API and frontend. Reject
unknown properties (`.strict()`) — silently ignoring a misspelled field is how clients ship bugs that surface
in production. `fastify-type-provider-zod` derives both the runtime validation and the OpenAPI document from
the same object, so the docs cannot drift.

**Rate limiting**: Redis token bucket, layered — per-IP on unauthenticated routes (login, signup, password
reset), per-org on writes, per-org-per-channel on sends, and a global circuit breaker per provider. Respond
`429` with `Retry-After` and `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` headers.

**Versioning**: `/v1` in the path. Within a version, only additive changes (new optional fields, new
endpoints). Breaking changes get `/v2` and a documented sunset window. Do not do date-pinned versioning yet;
it's a lot of machinery for a v1 with one client.

## Surface

```
── Auth (no org scope) ──────────────────────────────────────────────
POST   /v1/auth/signup                    email+password → verification email
POST   /v1/auth/login                     → session cookie, or {mfa_required}
POST   /v1/auth/mfa/verify
POST   /v1/auth/logout                    revoke this session
POST   /v1/auth/logout-all                revoke every session for the user
GET    /v1/auth/oauth/google              → 302 (state + PKCE)
GET    /v1/auth/oauth/google/callback
POST   /v1/auth/verify-email              {token}
POST   /v1/auth/password/forgot           always 202, never reveal existence
POST   /v1/auth/password/reset            {token, password} → revokes all sessions
GET    /v1/me                             user + org memberships
PATCH  /v1/me
GET    /v1/me/sessions                    list devices
DELETE /v1/me/sessions/{id}
POST   /v1/me/mfa/enroll  ·  POST /v1/me/mfa/confirm  ·  DELETE /v1/me/mfa
DELETE /v1/me                             account deletion (scheduled, not immediate)

── Organizations ────────────────────────────────────────────────────
POST   /v1/orgs                           create org, caller becomes owner
GET    /v1/orgs/{org}
PATCH  /v1/orgs/{org}                     admin+
DELETE /v1/orgs/{org}                     owner; schedules purge, 30-day window
GET    /v1/orgs/{org}/members
PATCH  /v1/orgs/{org}/members/{userId}    change role; cannot demote the last owner
DELETE /v1/orgs/{org}/members/{userId}
POST   /v1/orgs/{org}/invitations         admin+
GET    /v1/orgs/{org}/invitations
DELETE /v1/orgs/{org}/invitations/{id}
POST   /v1/invitations/{token}/accept      (unscoped: the invitee may not be a member yet)
GET    /v1/orgs/{org}/audit-logs          admin+, cursor-paginated
GET    /v1/orgs/{org}/api-keys  ·  POST  ·  DELETE /{id}     admin+; token shown ONCE

── Integrations & channels ──────────────────────────────────────────
GET    /v1/orgs/{org}/integrations
POST   /v1/orgs/{org}/integrations                 provider + credentials
GET    /v1/orgs/{org}/integrations/{id}
PATCH  /v1/orgs/{org}/integrations/{id}
DELETE /v1/orgs/{org}/integrations/{id}
POST   /v1/orgs/{org}/integrations/{id}/test       health probe, rate-limited
GET    /v1/orgs/{org}/integrations/oauth/{provider}/start
GET    /v1/orgs/{org}/integrations/oauth/{provider}/callback
GET    /v1/orgs/{org}/channels
PATCH  /v1/orgs/{org}/channels/{id}
GET    /v1/orgs/{org}/domains                      email: DNS records + status
POST   /v1/orgs/{org}/domains
POST   /v1/orgs/{org}/domains/{id}/verify          enqueues a check; 202

── Conversations & messages ─────────────────────────────────────────
GET    /v1/orgs/{org}/conversations                ?status &channel_id &assignee &tag &q &cursor
GET    /v1/orgs/{org}/conversations/{id}
PATCH  /v1/orgs/{org}/conversations/{id}           status, assignee, priority, snoozed_until
                                                   If-Match: <version> → 412 on conflict
POST   /v1/orgs/{org}/conversations                start an outbound conversation
POST   /v1/orgs/{org}/conversations/{id}/read
GET    /v1/orgs/{org}/conversations/{id}/messages   cursor
POST   /v1/orgs/{org}/conversations/{id}/messages   → 202  {status:"queued"}
POST   /v1/orgs/{org}/conversations/{id}/notes      internal, never sent
GET    /v1/orgs/{org}/conversations/{id}/tags · POST · DELETE /{tagId}
GET    /v1/orgs/{org}/messages/{id}
GET    /v1/orgs/{org}/messages/{id}/status-events   the append-only delivery history
GET    /v1/orgs/{org}/search                        ?q, tsvector, org-scoped

── Contacts ─────────────────────────────────────────────────────────
GET/POST /v1/orgs/{org}/contacts   ·  GET/PATCH/DELETE /{id}
POST   /v1/orgs/{org}/contacts/{id}/merge          {source_contact_id}, audited, reversible
GET    /v1/orgs/{org}/contacts/{id}/conversations
GET    /v1/orgs/{org}/suppressions  ·  POST  ·  DELETE /{channelType}/{value}

── Attachments ──────────────────────────────────────────────────────
POST   /v1/orgs/{org}/attachments/upload-url       → presigned PUT + attachment_id
POST   /v1/orgs/{org}/attachments/{id}/complete    client confirms; enqueues sniff+scan
GET    /v1/orgs/{org}/attachments/{id}             metadata
GET    /v1/orgs/{org}/attachments/{id}/download    → 302 to short-lived presigned GET
                                                     403 while scan_status='pending'

── Billing & usage ──────────────────────────────────────────────────
GET    /v1/plans                                   public
GET    /v1/orgs/{org}/subscription
POST   /v1/orgs/{org}/billing/checkout              owner → Stripe Checkout URL
POST   /v1/orgs/{org}/billing/portal                owner → Stripe Portal URL
GET    /v1/orgs/{org}/entitlements                  materialized limits + current usage
GET    /v1/orgs/{org}/usage                         ?period

── Realtime ─────────────────────────────────────────────────────────
GET    /v1/orgs/{org}/events                        SSE; Last-Event-ID replay

── Webhooks (NO session, NO CSRF, signature auth only, raw body) ────
POST   /webhooks/resend
POST   /webhooks/telegram/{channelToken}            secret path segment + secret_token header
POST   /webhooks/meta          GET for the hub.challenge handshake
POST   /webhooks/stripe

── Ops (not public; bound to the internal network or protected) ─────
GET    /healthz     liveness: process is up. NO dependency checks.
GET    /readyz      readiness: Postgres + Redis reachable.
GET    /metrics     Prometheus.
```

> **`/healthz` must not check the database.** If it does, a 30-second Postgres blip makes the orchestrator
> kill every API container, turning a brief degradation into a full outage. Liveness answers "should I be
> restarted"; readiness answers "should I get traffic". Conflating them is a classic self-inflicted outage.

## Authentication mechanisms

| Caller | Mechanism | Notes |
|---|---|---|
| Dashboard | `__Host-mdsid` cookie | HttpOnly, Secure, SameSite=Lax |
| Programmatic | `Authorization: Bearer mdk_live_…` | `api_keys`, scoped, prefix stored for display, hash compared |
| Provider webhooks | provider signature over the raw body | no session, exempt from CSRF/CORS |
| Internal (worker→API) | mTLS or a shared secret on the private network | prefer no such calls at all |

API key format: `mdk_{env}_{16-char-public-id}_{32-char-secret}`. Store `token_prefix` (for the UI) and
`sha256(secret)`. Show the full key exactly once. Include the public id so a leaked key found in a repo can be
attributed and revoked without knowing the secret.

## Authorization

Two independent gates on every scoped request, in this order:

1. **Membership** — `memberships(org_id, user_id)` exists. Absent → `404`.
2. **Capability** — `can(role, action)` where actions are strings like `message:send`, `integration:write`,
   `billing:manage`, `org:delete`. One table in code, one function, no scattered `role === 'admin'` checks.

| | viewer | agent | admin | owner |
|---|---|---|---|---|
| read conversations/messages | ✓ | ✓ | ✓ | ✓ |
| send, assign, tag, note | | ✓ | ✓ | ✓ |
| manage integrations/channels/domains | | | ✓ | ✓ |
| manage members, invitations, API keys | | | ✓ | ✓ |
| read audit log | | | ✓ | ✓ |
| billing, delete org, transfer ownership | | | | ✓ |

Then a third, orthogonal gate on writes: **entitlement/quota** (`402 quota_exceeded`), and a fourth:
**org status** (`read_only` org → `403 org_read_only` on all writes except billing).

## What must never appear in a response

Enforced by explicit output serializers per resource — never `res.send(row)`:

`password_hash` · `mfa_secret_ct` · any `credentials.ciphertext` or decrypted value · raw
`provider_events.payload` · `token_hash` for any token type · another org's IDs · stack traces ·
internal error strings · unsanitized `body_html`.

Write a test that fetches every endpoint's response and asserts none of these key names appear anywhere in the
JSON tree. Cheap, and it catches the accidental `select *` forever.
