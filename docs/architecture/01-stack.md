# 01 — Recommended Technology Stack

> Section C. Every row is a decision with a reason and a rejected alternative. Where I disagree with the
> brief, it says **[CHANGED]**.

## Summary table

| Layer | Choice | Rejected |
|---|---|---|
| Frontend | Next.js 16 App Router, TS, Tailwind 4 | SPA + Vite; Remix |
| API | Fastify 5 + TypeScript, Node 22 LTS | Next API routes; NestJS; Hono; Go |
| Language | TypeScript everywhere, strict | Go/Rust for the worker |
| DB | PostgreSQL 17+, self-hosted in Docker | MySQL; Mongo; managed PG (v1) |
| Query layer | **Drizzle ORM** **[CHANGED]** | Prisma; Kysely; raw `pg` |
| Migrations | `drizzle-kit` generate → hand-reviewed SQL | Prisma Migrate; Atlas; Flyway |
| Cache / KV | Redis 7 | Memcached; in-process |
| Queue | BullMQ + **transactional outbox** | pg-boss; Kafka; SQS; naked BullMQ |
| Workers | Separate Node process, same image | In-API `setInterval`; serverless cron |
| Realtime | **SSE + Redis pub/sub** **[CHANGED]** | WebSockets (deferred); polling |
| Object storage | Cloudflare R2 (prod) / MinIO (dev) | AWS S3; Postgres bytea; local disk |
| Auth | **Own it in the API** **[CHANGED]** | NextAuth v5; Clerk; Auth0; Keycloak |
| Passwords | argon2id (`@node-rs/argon2`) | bcrypt; scrypt |
| OAuth | `arctic` | hand-rolled; NextAuth |
| Validation | Zod 4 + `fastify-type-provider-zod` | TypeBox; ajv; class-validator |
| Email | Resend (adapter behind a port) | Postmark; SES; SendGrid |
| Telegram | Bot API over HTTPS webhook, no SDK | `telegraf`; `grammy` |
| Meta | Graph API direct, deferred | any SDK |
| Google | OAuth 2.0 + OIDC for login only | Gmail API (deferred) |
| Billing | Stripe (Checkout + Portal + webhooks) | Paddle; Lemon Squeezy |
| AI | Anthropic API behind a port | LangChain; LlamaIndex; direct coupling |
| Vectors | `pgvector` in the same Postgres | Pinecone; Qdrant; Weaviate |
| Logging | `pino` → JSON on stdout → Loki | Winston; `console.log`; ELK |
| Metrics | `prom-client` + Prometheus + Grafana | Datadog; New Relic |
| Errors | Sentry (SaaS free tier) | self-hosted GlitchTip; nothing |
| Tracing | OpenTelemetry, deferred to M14 | day-one tracing |
| Containers | Docker + Docker Compose | Kubernetes; Nomad; bare systemd |
| Reverse proxy | nginx + certbot | Caddy; Traefik; HAProxy |
| DNS / CDN | Cloudflare (DNS + proxy) | Route53; bare authoritative DNS |
| CI/CD | GitHub Actions → GHCR → SSH deploy | Jenkins; self-hosted runners |
| Tests | Vitest + Testcontainers + Supertest + Playwright + k6 | Jest; Mocha |
| Monorepo | npm workspaces + Turborepo | pnpm; Nx; polyrepo |
| Secrets | `env_file` on host, `sops`+age in git | Vault; AWS SM (later) |

---

## Reasoning on the decisions that matter

### Fastify over Next.js API routes — agree, but for the right reason

Next.js route handlers are perfectly capable of serving REST. The reason to split is **process lifetime**.
MailDesk needs:

- A worker that holds Redis connections and processes jobs for hours.
- SSE connections held open for minutes, fanned out from Redis pub/sub.
- Scheduled jobs (token refresh, domain re-verification, usage rollups, outbox relay).
- A shared, warm Postgres connection pool.

None of those survive in a request-scoped serverless function. Once you accept a long-lived Node process, you
want a framework designed for it. Fastify: fastest of the mainstream Node frameworks, first-class schema
validation with type inference, a real plugin/encapsulation model (so `orgContext` can be injected once and
inherited), and `@fastify/*` covers cookies, CORS, rate limiting, multipart, and helmet-equivalent headers.

Rejected: **NestJS** — the DI/decorator ceremony hides exactly the HTTP mechanics you want to learn.
**Hono** — excellent, but its ecosystem assumes edge runtimes, which is the constraint you're escaping.
**Go** — genuinely better for a worker, but a second language doubles your surface while you're still learning
the domain. TypeScript everywhere means the normalized message types are *shared*, compile-checked, between
API, worker, and frontend. That is worth more than raw throughput here.

### Drizzle over Prisma — [CHANGED] from "either"

I'd normally say "use what's already there." Not this time, because four things you specifically want are
things Prisma actively obstructs:

1. **You want to learn SQL.** Drizzle's query builder is SQL with types. Prisma's is a different language that
   *compiles* to SQL you never see. You will not learn SQL through Prisma; that's the point of Prisma.
2. **Row-Level Security.** The tenancy backstop needs `SET LOCAL app.current_org_id` on the same connection,
   inside the transaction, for every query. Drizzle: `db.transaction(tx => { tx.execute(sql`SET LOCAL …`); … })`.
   Prisma: a client-extension workaround that fights the query engine.
3. **Schema features Prisma's DSL cannot express.** You need partial unique indexes (`WHERE deleted_at IS NULL`),
   generated `tsvector` columns with GIN indexes, composite foreign keys, `CHECK` constraints, `citext`, and
   `pgvector` columns. With Prisma you write these in hand-edited migration SQL that the schema file doesn't
   know about — permanent drift between `schema.prisma` and reality.
4. **The inbox queries are the hard part.** "Conversations for org X, filtered by status and tag, ordered by
   last message, with the last message preview and unread count, cursor-paginated" is a lateral join and a
   window function. In Prisma that becomes `$queryRaw` — at which point you have Drizzle's downsides with
   Prisma's weight.

**Do it now.** The schema is being rewritten from scratch for orgs anyway; there is no cheaper moment. Migrating
later costs weeks.

Honest counterpoints: Prisma Migrate's dev workflow and drift detection are better than `drizzle-kit`'s;
Prisma Studio has no equal (use `psql` and Postgres.app/DBeaver instead — and honestly, learning `psql`
serves you better). Prisma 7 + `adapter-pg` is a perfectly good stack. This is a "both are fine, one matches
your goals" call, not a "Prisma is bad" call.

Rejected **Kysely** (excellent, but no schema/migration story — you'd bolt one on) and **raw `pg`** (you'd
hand-write every mapper; educational for a week, then just toil).

### SSE over WebSockets — [CHANGED]

What the dashboard actually needs: *the server tells the browser something changed.* Client→server already has
REST. Given that:

| | SSE | WebSocket |
|---|---|---|
| Protocol | plain HTTP/1.1 or /2 response | upgrade + framing |
| Auth | the same cookie as every other request | cookie doesn't apply cleanly; need a ticket |
| Reconnect | automatic, browser-native | you implement it |
| Missed-event replay | `Last-Event-ID` header, free | you design it |
| Proxy config | `proxy_buffering off` in nginx | upgrade headers + long timeouts |
| Liveness | one comment line as a keepalive | ping/pong you implement |
| Horizontal scale | stateless per connection + Redis fan-out | same, plus sticky-session pressure |
| Browser limit | 6 per origin on HTTP/1.1 (a non-issue on HTTP/2) | ~unlimited |

SSE gives you reconnect-with-replay for free, which is the *correctness* property that matters: a laptop lid
closes for 20 minutes and the inbox must not silently miss messages. Implementing that over WebSockets is a
day of work you don't need to spend.

Adopt WebSockets when you have a genuine bidirectional, high-frequency need: typing indicators, live presence,
or collaborative draft editing. That is a real future milestone, not a v1 one. **Design note:** put the SSE
handler behind an `EventBus` port so swapping the transport later doesn't touch business logic.

### BullMQ, plus a transactional outbox

BullMQ because you need Redis anyway (sessions, rate limits, pub/sub), and it ships retries with exponential
backoff, per-queue concurrency and rate limits, delayed and repeatable jobs, and a DLQ concept. Bull Board
gives you the queue-monitoring UI that makes the whole thing legible — directly serving your learning goal.

**But BullMQ is not transactional with Postgres**, and this is the failure mode that eats customer messages:

```
BEGIN; INSERT conversation; INSERT message; COMMIT;
await queue.add('send', …)   // ← process dies here. Row exists, job never runs. Silent data loss.
```

The fix is the **transactional outbox**: inside the same DB transaction as the state change, insert the job
intent into an `outbox` table. A relay loop reads unpublished outbox rows and pushes them to BullMQ, marking
them published. Crash anywhere and the relay retries; the only failure mode left is *duplicate* delivery,
which idempotent consumers already handle.

Scope it narrowly so this stays proportionate (Rule 3): **outbox for inbound provider events and outbound
message sends only.** Everything else (send a welcome email, recompute a counter, refresh a token) enqueues
directly — losing one of those is recoverable.

Rejected **pg-boss** (one less moving part, and genuinely tempting — but you want to learn Redis, and BullMQ's
observability is better) and **Kafka** (ordered partitioned logs solve a problem you do not have).

### Own the auth — [CHANGED] from NextAuth v5

Once Fastify is the authority, Auth.js becomes an awkward dependency: it is designed to *be* the server, and
you would be verifying its encrypted JWTs from another process using undocumented internals.

More importantly, §4 of your brief says you want to learn authentication and session security. You will not
learn it by configuring a library that hides it.

To be clear about the risk: **rolling your own auth is a classic way to get owned.** The mitigation is
*assemble primitives, invent nothing*:

- Passwords: **argon2id** via `@node-rs/argon2` (memory-hard; bcrypt's 72-byte input truncation and lack of
  memory hardness make it the weaker choice in 2026). Parameters: m=19456 KiB, t=2, p=1 as a floor.
- Sessions: **opaque random tokens, not JWTs.** `crypto.randomBytes(32)` → base64url; store only the
  SHA-256 of the token in `sessions`; cache the row in Redis with a short TTL. Cookie:
  `__Host-mdsid`, `HttpOnly; Secure; SameSite=Lax; Path=/`.
  Why not JWT: instant revocation. Logout, password change, and "sign out all devices" must take effect
  *now*, and stateless tokens cannot do that without a denylist — at which point you have a session store
  with extra steps.
- OAuth: **`arctic`** — small, audited, correct PKCE/state handling, no framework opinions.
- TOTP: `otpauth` when MFA arrives.

Rejected **Clerk/Auth0/WorkOS**: they'd solve this in an afternoon and are the right answer for a startup
optimizing for time-to-market. They are the wrong answer for the stated goal, and they own your user table.

### Postgres, self-hosted — with an explicit caveat

Self-host in Docker for v1: you want to learn `pg_dump`, WAL archiving, `EXPLAIN ANALYZE`, `pg_stat_statements`,
connection limits, and vacuum behaviour. All of that is invisible on a managed platform.

**The honest caveat:** for a business with paying customers, managed Postgres (Neon, RDS, Crunchy) is the
*correct* engineering choice, because point-in-time recovery, failover, and patching are solved problems you
would otherwise re-solve badly. Resolve the tension this way: **self-host, but the deployment milestone is not
done until you have performed a full restore from backup into a fresh container and recorded how long it took.**
Keep the connection string as the only coupling so migrating to managed is a config change, not a project.

Version 17+ for `MERGE`, better logical replication, and incremental sort improvements. If your Postgres is
18+, use the native `uuidv7()`; otherwise generate UUIDv7 in the application.

### Cloudflare R2 over S3

Attachment workloads are read-heavy and egress-dominated. R2 charges **zero egress**. On S3, egress would be
the single largest line item in your infrastructure bill once customers start opening attachments. R2 is
S3-API-compatible, so `@aws-sdk/client-s3` works unchanged and MinIO covers local dev with the same API —
one code path, three environments.

### Stripe

Best-documented billing API, a test mode you can actually build against, and **Checkout + Customer Portal
means you never build billing UI** — a large and thankless surface you get for free. Its webhook model
(signed, replayable, with an event log you can re-drive) is also a good teacher for the event patterns used
elsewhere in this system.

Caveats to check before committing: Stripe availability and payout support in your jurisdiction, and whether
you need a **merchant of record** (Paddle, Lemon Squeezy) to handle EU VAT / global sales tax on your behalf.
That is a business decision with a real compliance cost attached, not a technical one. Verify before M13.

### nginx + certbot over Caddy

Caddy is objectively less work: automatic TLS, ~5 lines of config. **Recommend nginx anyway**, because §4 says
you want to learn reverse proxies and TLS, and nginx is what you will meet in every professional environment.
You will hand-write `proxy_pass`, `proxy_set_header X-Forwarded-For`, `proxy_buffering off` for SSE, upstream
blocks, `client_max_body_size` for uploads, and an ACME challenge location. That is the lesson.

If at any point nginx becomes a time sink rather than a lesson, switch to Caddy without guilt.

### Kubernetes: no

Explicitly premature. One VPS + Docker Compose serves MailDesk well past its first paying customers. k8s buys
multi-node scheduling, rolling deploys with health gates, and declarative infra — none of which you need, all
of which cost you a control plane to operate. You will learn more from `docker compose up`, a `nginx.conf`, and
a `systemd` unit than from a managed cluster. Revisit when you have more than one machine *and* more than one
engineer.

### Testing

- **Vitest** — unit and integration. Fast, ESM-native, TS out of the box.
- **Testcontainers** — real Postgres and Redis per test run. Do not mock the database; the entire tenancy
  model depends on constraints and RLS policies that only a real Postgres enforces.
- **Supertest** (or `fastify.inject()`) — HTTP-level tests against the real app instance.
- **Playwright** — a handful of E2E journeys, not a suite.
- **k6** — capacity baseline from M3, not a load-test milestone.
- **Mailpit** in dev Compose — a local SMTP sink with a web UI, so transactional email is testable offline.

### Monorepo layout

```
maildesk/
├─ apps/
│  ├─ api/            Fastify HTTP server
│  ├─ worker/         BullMQ consumers + schedulers + outbox relay
│  └─ web/            Next.js (marketing + dashboard)
├─ packages/
│  ├─ db/             Drizzle schema, migrations, seed, tenant-scoped client
│  ├─ core/           domain model, state machines, normalization — no I/O
│  ├─ providers/      Resend / Telegram / Meta adapters implementing core ports
│  ├─ contracts/      Zod schemas shared by API + web (single source of truth)
│  └─ observability/  pino, metrics, request-context AsyncLocalStorage
├─ infra/
│  ├─ docker/         Dockerfiles
│  ├─ compose/        docker-compose.{dev,prod}.yml
│  └─ nginx/          site configs
└─ docs/
   ├─ architecture/   this blueprint
   ├─ adr/            one file per irreversible decision
   └─ tasks/          Devin task specs
```

`packages/core` must have **zero I/O dependencies** — no `pg`, no `redis`, no `fetch`. It is pure domain logic
and therefore trivially unit-testable. This one rule does more for long-term maintainability than any
framework choice on this page.
