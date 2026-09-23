# 00 — Executive Assessment & Current State

> Sections A and B of the architecture review. Written 2026-08-23 against commit `4191a69`.

---

## A. Executive assessment

### Is the project technically coherent?

**The vision is coherent. The vision and the repository are two different products.**

The vision is a **multi-tenant, multi-channel shared inbox** (a Front/Intercom/Missive competitor). The
repository is a **single-user, bring-your-own-Resend-API-key email sender** with a marketing site attached.
These are not the same product at different stages of completion. They differ in their tenancy root, their
credential model, their billing model, and their core entity (`Email` row vs `Conversation`). There is no
incremental path from one to the other; the messaging core has to be built, not extended.

That is fine — but it must be named. Do not think of this as "adding organizations to MailDesk." Think of it
as "MailDesk v2 is a new backend, and v1 is a landing page plus a working Resend spike that taught us the
provider's shape."

### Good

- **The provider-agnostic instinct is correct and is the single most valuable decision in this document.**
  Normalizing Telegram/Instagram/email into one internal model is exactly right, and it is where most
  competitors' architectures rot. Getting it right early is worth real time.
- **Wanting to own the backend is correct for your stated goal.** Not because managed platforms are bad, but
  because you cannot learn what you never operate. This is a legitimate, well-reasoned trade of velocity for
  understanding, and I'd make the same call.
- **Entitlement-based billing over `if (plan === 'pro')` is right.** Most people learn this the hard way after
  the conditionals have metastasised across 200 files.
- **Treating webhooks as unreliable (Rule 6) is the right mental model** and it is not yet reflected in the code.
- **The existing encryption module is genuinely decent.** AES-256-GCM, per-record 64-byte salt, per-record IV,
  PBKDF2-SHA256 at 100k iterations, auth tag verified. Most projects at this stage have `base64` and a comment
  saying "TODO encrypt". It has three fixable flaws (below) but the shape is right.
- **Every dashboard query is `userId`-scoped.** The habit is already there; it needs to become `orgId` and it
  needs a mechanism instead of discipline.

### Questionable

- **`Fastify` + `Next.js` split.** I agree with it, but not for the reason you probably think. It is not that
  Next.js API routes are bad — it is that you need **long-lived processes** for workers, SSE fan-out, and
  scheduled jobs, and a serverless deployment target cannot provide them. Adopt the split for that reason and
  you will make correct decisions downstream.
- **Prisma vs Drizzle.** You listed both. They are not equivalent for your goals — see `01-stack.md`.
  Recommendation: **switch to Drizzle now**, while the schema is being rewritten anyway. Switching later is
  a multi-week tax.
- **"WebSockets" as the assumed realtime mechanism.** You need server→client push. You do not yet need
  client→server push (REST covers that). SSE is dramatically cheaper to operate and gets reconnect-with-replay
  for free. See `02-system.md`. This is me disagreeing with your list.
- **NextAuth v5 as the auth layer for a separate API service.** Auth.js is Next-shaped. Once Fastify is the
  authority for WebSocket/SSE tickets, worker-initiated actions, and API keys, you will be reverse-engineering
  Auth.js's JWE format from another process. Own the session layer. See `07-security.md`.
- **Milestone 16 "Security hardening"** directly contradicts your own Rule 7 and your own §12 statement
  ("do not treat security as a final polishing phase"). Security belongs in every milestone's Definition of
  Done, with one *additional* dedicated audit milestone. Fixed in `09-roadmap.md`.
- **Milestone 17 "Load testing."** Load-testing a system with no users measures your test script. Replace with
  a cheap capacity baseline plus a k6 smoke test in CI, done early. Real load testing waits for real traffic
  patterns.

### Dangerous

1. **The BYO-API-key model makes your billing model impossible.** If customers send through *their own* Resend
   account, MailDesk cannot meter messages, cannot enforce `monthly_messages`, cannot control deliverability,
   and cannot suppress bounces. Your §10 entitlement list (`monthly_messages`) and your §6 provider model are
   in direct contradiction. **Resolve this before the schema is designed** — it changes `credentials`,
   `channels`, billing, and the entire deliverability story. Recommendation in `05-integrations.md`.
2. **Webhook handlers that do work are an availability and data-loss bug.**
   `src/app/api/webhooks/resend/route.ts` calls `resend.emails.receiving.get()` *inside* the handler and returns
   `404` when the recipient is unknown and `500` when the provider call fails. Both are wrong:
   - Providers retry non-2xx. A permanently-unroutable address becomes an infinite retry loop.
   - Provider latency becomes your webhook timeout, which becomes a retry storm, which duplicates work.
   - `findUnique` → `create` is a TOCTOU race. Two concurrent deliveries of the same event both pass the check;
     the unique constraint saves you by throwing, which returns 500, which triggers another retry.
   The correct pattern is verify → persist raw → 200, and do everything else in a worker. See
   `06-queues-workers.md`.
3. **There is no suppression list, and this is not optional.** Once MailDesk sends on behalf of businesses, it
   is a spam vector. Hard bounces and complaints must be permanently suppressed *before* the next send, per
   org and globally. Without it you will be blocklisted, and your provider will terminate you. This is absent
   from your §6 list entirely.
4. **Inbound HTML email rendering is an XSS vector waiting to be opened.** The current code punts
   (`"HTML rendering will be available in a future update"`) and is accidentally safe. The moment someone
   renders `htmlBody`, an attacker emails a payload and owns your dashboard session. It must be sanitized
   server-side *and* rendered in a sandboxed iframe on a **separate origin**. See `07-security.md`.
5. **Self-hosted Postgres without a tested restore is the largest risk in this entire plan.** Not backups —
   *restores*. An untested backup is a belief, not a capability. If you self-host (and for learning you should),
   the Definition of Done for the deployment milestone must include a restore performed from scratch into a
   fresh container, with the timing recorded.
6. **In-memory rate limiting is currently a no-op.** `src/app/api/emails/send/route.ts:10` uses a
   module-scoped `Map` on a serverless deployment. It resets per cold start, is per-instance, and never prunes
   (unbounded growth). The README advertises "Rate limiting (10 emails/minute per user)" as a security control.
   It isn't one.
7. **Encryption cannot be rotated.** `credentials` have no `key_version`. Add it before storing a single real
   credential in the new schema, or key rotation later means decrypt-everything-with-downtime.

### Unnecessary / over-engineered

- **Kubernetes: explicitly premature.** One VPS with Docker Compose will serve MailDesk past its first paying
  cohort. Adopt k8s when you have a team that needs isolation between deploys, not before. You will learn more
  from `systemd`, `nginx`, and `docker compose` than from a managed control plane.
- **Meta (Messenger/Instagram) in the early roadmap.** App Review plus Business Verification is a multi-week
  *external* dependency you cannot schedule. Design for it; build it last.
- **WhatsApp.** Worse than Meta: BSP onboarding, per-conversation pricing, template pre-approval. Not a v1 item.
- **Gmail API integration.** Restricted scopes (`gmail.readonly` and friends) require an annual third-party
  CASA security assessment at real cost, on top of OAuth verification. Treat Google as *authentication* for v1
  and keep Gmail as a deliberately deferred, separately-budgeted project. Verify current requirements before
  committing.
- **A dedicated vector database.** `pgvector` in the Postgres you already run. Adding a second datastore for
  embeddings before you have embeddings is textbook premature.
- **Microservices.** A modular monolith (API) plus one worker binary is the correct topology, probably forever
  at your scale.
- **Kafka / NATS.** BullMQ on the Redis you already need.
- **`supabase-schema.sql`.** A hand-maintained duplicate of migration 1, already stale (missing `EmailAddress`
  and `IncomingEmail`). Two sources of schema truth is a bug generator. Delete it.

### Missing — things absent from your brief that will hurt

These are ordered by how much pain they cause when discovered late.

1. **Email is much harder than "send and receive."** Absent from your §6: MIME multipart parsing,
   quoted-printable and base64 transfer encodings, inline `cid:` images, charset detection, reply-quote and
   signature stripping, DSN/bounce-message parsing, and **mail loop prevention** (never auto-reply to a message
   carrying `Auto-Submitted: auto-*` or `Precedence: bulk`, or you and an out-of-office responder will
   generate mail forever). This is the single most underestimated body of work in the project.
2. **Suppression lists and deliverability governance.** Per-org bounce/complaint rates, automatic sending
   suspension above thresholds, domain-ownership proof before first send, unsubscribe handling.
3. **Conversation threading is a real algorithm, not a field.** How a reply arriving from a stranger's
   `Gmail` client lands on the correct existing conversation is a design problem with no perfect answer.
   Designed in `03-database.md` and `05-integrations.md`.
4. **The collaboration model is what makes a shared inbox a product.** Assignment alone is not enough:
   internal notes, tags, snooze, canned replies, "who is looking at this right now" collision avoidance, and
   an SLA/first-response clock. Your entity list has `Assignment` and stops.
5. **You are a data processor, not just a controller.** MailDesk stores personal data belonging to your
   customers' customers. That implies a DPA, a retention policy, data-subject export and erasure that cascades
   into object storage, and sub-processor disclosure. Not optional for selling to EU businesses.
6. **Client-facing idempotency.** You listed idempotency for webhooks (inbound). You also need
   `Idempotency-Key` on your *own* API's mutating endpoints, or a double-clicked Send button sends twice.
7. **Zero-downtime migration discipline.** Expand/contract: every migration must be safe with the previous
   version of the code still running, because during a deploy both run.
8. **A testing strategy.** There are currently zero tests and no test framework. Retrofitting tests after ten
   milestones is how projects like this die. It is Milestone 1 work, not Milestone 14 work.
9. **Cost model.** Entitlements without unit economics price the plan wrong. Know your cost per 1k emails, per
   GB stored, per AI call before you publish a pricing page.
10. **Clock discipline.** Provider timestamps, your timestamps, and clock skew. Store `occurred_at` (provider)
    separately from `created_at` (yours), always `timestamptz`, always UTC.

---

## B. Current-state assessment

Reconstructed by reading the repository at `4191a69`. 72 tracked files, 23 commits.

### B.1 Confirmed present (read directly)

**Application shell**
- Next.js `16.3.0` App Router, React `19.2.8`, TypeScript `strict: true`, Tailwind CSS 4.
- Single Next.js process serving both marketing site and dashboard. No separate backend.
- `tsc --noEmit` currently passes.

**Authentication** — `src/lib/auth.ts`, `src/auth.ts`
- NextAuth v5 `5.0.0-beta.32`, **Credentials provider only**. Email + password, `bcryptjs` cost 12.
- JWT session strategy; `jwt`/`session` callbacks copy `user.id` onto the token (both typed `any` with
  eslint-disable comments).
- **No** OAuth provider, **no** email verification, **no** password reset, **no** MFA, **no** account
  lockout or login rate limiting, **no** `middleware.ts` (so route protection is per-page `auth()` calls only).

**Database** — `prisma/schema.prisma`, 2 migrations
- Prisma `7.9.1` with `@prisma/adapter-pg`. Postgres, reached via `DIRECT_URL || DATABASE_URL`.
- Five models, **all rooted at `User`**: `User`, `ConnectedProvider`, `Email`, `EmailAddress`, `IncomingEmail`.
- Primary keys are `cuid()` stored as `text`.
- **No** `Organization`, `Membership`, or `Role` — no tenancy concept whatsoever.
- **No** `Attachment` model, despite the brief listing "Email attachment models" as existing. It does not exist.
- **No** `Conversation` — inbound and outbound mail are unrelated flat tables with no thread linkage.
- **No** `provider_events` table — webhook payloads are not persisted.

**API routes** (7 total, all under `src/app/api/`)
| Route | Auth | Notes |
|---|---|---|
| `auth/[...nextauth]` | — | NextAuth handlers |
| `auth/signup` (POST) | none | zod-validated; creates `User` + generated inbound `EmailAddress` |
| `emails/send` (POST) | session | in-memory rate limit, decrypts key, sends via Resend, records `Email` |
| `providers/resend/connect` (POST) | session | validates key against Resend, requires ≥1 verified domain, encrypts |
| `providers/resend/disconnect` (POST) | session | `deleteMany` on the connection |
| `providers/resend/senders` (GET) | session | decrypts key, live-calls Resend on every request |
| `webhooks/resend` (POST) | svix signature | handles `email.received` only |

**Encryption** — `src/lib/encryption.ts`
- AES-256-GCM. Layout: `salt(64) ‖ iv(16) ‖ tag(16) ‖ ciphertext`, base64. PBKDF2-SHA256, 100k iterations,
  fresh salt and IV per record. Auth tag set and verified on decrypt.

**Resend adapter** — `src/lib/resend.ts`
- `validateResendApiKey`, `getSenderIdentities`, `sendEmail`, `getEmailStatus`. Reasonable seam; it is the
  closest thing in the repo to a provider abstraction.

**Webhook handling** — `src/app/api/webhooks/resend/route.ts`
- Reads raw body before parsing, verifies svix headers via `resend.webhooks.verify` — **correct**, and better
  than most first attempts.
- Then: ignores non-`email.received`, checks `IncomingEmail.emailId` for duplicates, resolves recipient →
  `EmailAddress` → user, **calls Resend to fetch full content**, writes `IncomingEmail`.

**Dashboard** (`src/app/dashboard/`)
- `inbox`, `inbox/[id]`, `sent`, `page.tsx` are server components querying Prisma directly, each scoped by
  `userId` from `auth()`.
- `compose` and `settings` are client components calling the API routes.

**Marketing site** — 16 components in `src/components/landing/`, framer-motion animations. **13 of the last
15 commits are landing-page work.**

**Deployment** — `.vercel/` present with `repo.json`. Deployed to Vercel.

### B.2 Confirmed absent

- No tests, no test framework, no `coverage` config.
- No `Dockerfile`, no `docker-compose.yml`.
- No `.github/` — no CI, no CD.
- No Redis, no queue, no worker process, no scheduled jobs.
- No structured logging (`console.error` throughout), no request IDs, no metrics, no health endpoints, no
  error tracking.
- No object storage; no attachment handling anywhere in the codebase.
- No realtime mechanism.
- No billing, no plans, no usage tracking.
- No audit log.
- No OpenAPI/schema documentation.
- No AI integration.

### B.3 Defects confirmed by reading the code

| # | Severity | Location | Finding |
|---|---|---|---|
| 1 | **High** | `dashboard/inbox/[id]/page.tsx:6` | Types `params` as `{id: string}` and reads `params.id` synchronously. Next 16 **removed** sync access to `params` (`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md:285`). `params.id` is `undefined` → the Prisma filter is dropped → the page shows *an arbitrary email of that user*, then `update({where:{id: undefined}})` throws. Not cross-tenant (still `userId`-scoped) but it is the wrong record. |
| 2 | **High** | `api/webhooks/resend/route.ts:99-105` | Returns `404` for an unknown recipient. Resend will retry indefinitely. Unroutable events must be accepted (`200`) and parked. |
| 3 | **High** | `api/webhooks/resend/route.ts:107-121` | Synchronous provider fetch inside the webhook handler; `500` on failure → retry storm, and the event payload is lost (never persisted). |
| 4 | **Medium** | `api/webhooks/resend/route.ts:73-79` | `findUnique`-then-`create` idempotency check is a TOCTOU race. Needs `INSERT … ON CONFLICT DO NOTHING`. |
| 5 | **Medium** | `api/emails/send/route.ts:10-29` | In-memory rate limiter: per-instance, reset on cold start, unbounded `Map` growth. Advertised as a security control in the README. |
| 6 | **Medium** | `api/emails/send/route.ts:32,87` | `sender` is `z.string().min(1)` — not validated as an email, and **not checked against the user's verified domains**. `message` is passed straight into the `html` field unsanitized. |
| 7 | **Medium** | `lib/encryption.ts:15` | PBKDF2 re-derived on *every* encrypt and decrypt (100k iterations per call) — a self-inflicted latency and CPU cost on a hot path. With a high-entropy 32-byte key from `openssl rand`, PBKDF2 adds nothing; use HKDF, or store the derived key. |
| 8 | **Medium** | `lib/encryption.ts` + `schema.prisma` | No `key_version` stored with ciphertext → key rotation is impossible without downtime. |
| 9 | **Low** | `lib/encryption.ts:6` | 16-byte IV for GCM. Works in Node, but GCM's specified IV is 96 bits; other lengths go through an extra GHASH derivation. Use 12. |
| 10 | **Medium** | `api/auth/signup/route.ts:60-86` | Collision handling regenerates the address once and *silently ignores* a second collision; and the response returns the *original* `inboundAddress` even when a different one was stored. Retry-with-`ON CONFLICT` or make the address a pure random token. |
| 11 | **Medium** | `api/auth/signup/route.ts:47-86` | User creation and `EmailAddress` creation are **not in a transaction**. A failure between them leaves a user with no inbound address and no recovery path. |
| 12 | **Low** | `api/auth/signup/route.ts:21` | Local part derived from user-supplied `name`, so inbound addresses leak the display name and are guessable-ish (4 random bytes = 32 bits). |
| 13 | **Medium** | `lib/resend.ts:33-57` | `getSenderIdentities` returns **domain names** in a field named `email`. The settings UI lists them under "Available sender identities." Mislabeled data flowing into the UI. |
| 14 | **Medium** | `api/providers/resend/senders/route.ts` | Decrypts the API key and live-calls Resend on **every page load** of Settings. No caching; provider outage breaks the page; unnecessary key handling. |
| 15 | **Medium** | `schema.prisma:45-63` | `Email.status` is only ever `sent`/`failed`. Delivery, bounce, and complaint events are never consumed (the webhook ignores everything but `email.received`), and `messageId` has no unique index, so events could not be matched idempotently even if they were. The README's "Delivery/bounce/complaint events" are not implemented. |
| 16 | **Low** | `api/auth/signup/route.ts:108-110` | Logs full error objects and stack traces to `console.error` in production. |
| 17 | **Low** | `supabase-schema.sql` | Hand-maintained duplicate of migration 1, already stale. Second source of schema truth. |
| 18 | **Low** | `.gitignore:38` + `.env.example` | `.env*` is ignored, so `.env.example` (currently empty, untracked) can never be committed. New contributors have no manifest of required config. Needs a `!.env.example` negation. |
| 19 | **Low** | `lib/db.ts:9` | Prefers `DIRECT_URL` over `DATABASE_URL` in the app runtime. `DIRECT_URL` conventionally bypasses the pooler and is meant for migrations only. |

### B.4 Verified *not* a problem

- **No secrets have ever been committed.** Commit `38cca40` ("Remove environment secrets from repository")
  changed only `.gitignore` (+1 line). No `.env` file appears in any commit's added-files list across all
  refs. Apparent secret matches in history are placeholders in `README.md` (`re_xxxxxxxxx`,
  `postgresql://postgres:password@…`) and in vendored skill documentation. **No history rewrite is needed.**
- Dashboard tenant scoping is consistently applied (`userId` on every query).
- `dangerouslySetInnerHTML` appears nowhere in `src/`.
- The webhook signature verification itself is correct, and reads the raw body before parsing.

### B.5 What must be inspected outside the repo

I cannot see these; you must confirm them:

1. **The live database.** Is there production data? Real users? That decides whether the v2 schema needs a
   migration path or can be greenfield. *Assumed greenfield below.*
2. **Where Postgres actually lives.** README says Supabase; `.env` has `DATABASE_URL` + `DIRECT_URL` (the
   Supabase/Neon pooler convention). Confirm the provider and version.
3. **Resend account state.** Which domains are verified, is inbound enabled, which webhook endpoints are
   registered, and is the account on a paid tier (inbound and volume limits differ).
4. **`MAILDESK_INBOUND_DOMAIN`.** Which domain, who controls DNS, and whether MX is already delegated.
5. **Vercel project.** Env vars set there, custom domains attached, and whether anything depends on it.
6. **Postgres major version** — decides `uuidv7()` availability and some index features.
7. **Stripe availability in your jurisdiction**, and whether you need a merchant-of-record for VAT.

### B.6 Assumptions this blueprint makes

Stated explicitly so you can correct them:

- **A1.** No production users; the database is disposable. Greenfield schema, no data migration.
- **A2.** MailDesk will send through **its own** provider account with per-org verified domains
  (platform-managed), with BYO-key as an optional advanced path. See `05-integrations.md` §Decision.
- **A3.** You have one Linux VPS available (or will provision one) and control DNS for at least one domain.
- **A4.** Budget is hobby-scale: single VPS, R2 or equivalent, Stripe test mode, free CI tier.
- **A5.** Learning is a first-class goal, so the blueprint prefers *operable* over *managed* wherever the
  operational burden is bounded — and says so explicitly where it does not (Sentry, Stripe, R2).
- **A6.** You are the only engineer; Devin is the implementer. Sequencing therefore optimizes for
  reviewability in small units, not for parallel team throughput.
