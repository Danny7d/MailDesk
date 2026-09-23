# M1 — Walking Skeleton: Monorepo, Local Stack, Test Harness, CI

**Assigned to:** Devin · **Reviewer:** Claude Opus (architect) · **Branch:** `m1/walking-skeleton`

---

## 1. Objective

Produce a monorepo in which every architectural layer of MailDesk exists and is wired end to end, with the
thinnest possible slice of behaviour passing through it. At the end of this task, a fresh clone plus
`docker compose up` yields a running Fastify API, a running worker, a Postgres with one applied migration, a
Redis, a MinIO, and a Next.js app — and CI proves it on every pull request.

No product features. No authentication. No business logic. **The deliverable is the skeleton, and the proof
that the skeleton works.** Everything in M2–M19 is built inside it, so its correctness compounds.

## 2. Context

MailDesk is being rebuilt from a single-user Next.js + Prisma + Supabase application into a multi-tenant
platform with a separate API, background workers, and self-hosted infrastructure. The architecture is
specified in `docs/architecture/`. Read these before writing code:

- `docs/architecture/01-stack.md` — the stack and the monorepo layout (authoritative for §4 below)
- `docs/architecture/02-system.md` §D.2 — service responsibilities
- `docs/architecture/08-deployment.md` — local development section
- `docs/architecture/09-roadmap.md` — the universal Definition of Done gate

Decisions already made. **Do not re-litigate them in this task:** Fastify for the API; Drizzle (not Prisma) as
the query layer; BullMQ on Redis; npm workspaces + Turborepo; Vitest + Testcontainers; own the auth (M4, not
now).

The existing Next.js application at the repository root **keeps working and is not migrated in this task.**
It continues to run against its current database. This is a strangler pattern: the new stack grows beside it.

## 3. Scope

### In scope
- npm workspaces + Turborepo monorepo structure
- `apps/api` — Fastify with config validation, logging, request ids, error envelope, `/healthz`, `/readyz`
- `apps/worker` — BullMQ consumer with graceful shutdown
- `packages/db` — Drizzle setup, one migration, the `withOrg()` helper skeleton, seed script
- `packages/core` — one pure module plus the CI rule that keeps it I/O-free
- `packages/contracts` — Zod + the shared error envelope type
- `packages/observability` — pino logger, request-context `AsyncLocalStorage`, `prom-client` registry
- `infra/compose/docker-compose.dev.yml` + Dockerfiles
- Vitest with unit and integration projects; Testcontainers for the integration project
- GitHub Actions CI
- `.env.example`, and the `.gitignore` fix that makes it committable
- Delete `supabase-schema.sql`

### Out of scope — do NOT build these
- Any authentication or session handling (M4)
- The real database schema — orgs, users, messages (M2)
- RLS policies (M2)
- Any provider integration or webhook route (M8+)
- Any real queue job beyond the no-op probe
- Moving `apps/web` off Prisma, or touching the existing dashboard/landing pages
- Production Compose, nginx, TLS, CD (M15)
- Prometheus/Grafana/Loki deployment — expose `/metrics`, do not deploy the stack (M14)
- Fixing the bugs listed in `00-executive-review.md` §B.3 — they live in the old app, which M11 replaces

## 4. Files and components

### Create

```
package.json                       workspaces: apps/*, packages/*  ·  turbo.json
tsconfig.base.json                 strict, ES2022, NodeNext; per-package tsconfig extends it

apps/api/
  src/server.ts                    buildServer(): FastifyInstance  — no listen() here
  src/index.ts                     entrypoint: build, listen, SIGTERM handler
  src/config.ts                    Zod-validated env; throws at boot on invalid
  src/plugins/{request-context,error-handler,metrics}.ts
  src/routes/health.ts             /healthz, /readyz
  test/health.test.ts

apps/worker/
  src/index.ts                     BullMQ Worker + graceful shutdown
  src/config.ts
  src/queues.ts                    queue names as constants, shared with the API
  src/jobs/noop.ts
  test/noop.test.ts

packages/db/
  src/schema/_probe.ts             ONE throwaway table — see R7
  src/client.ts                    pool, drizzle instance, withOrg() skeleton
  src/migrate.ts  src/seed.ts
  drizzle.config.ts
  migrations/0000_init.sql         generated, then hand-reviewed
  test/migration.test.ts

packages/core/src/index.ts         one pure function (e.g. the status-rank lattice from 02-system.md §D.5)
packages/contracts/src/errors.ts   ApiError envelope schema + type
packages/observability/src/{logger,context,metrics}.ts

infra/docker/{api,worker,web}.Dockerfile   multi-stage, non-root
infra/compose/docker-compose.dev.yml

.github/workflows/ci.yml
.env.example
vitest.workspace.ts
.dockerignore
```

### Modify
- `.gitignore` — add `!.env.example` after the `.env*` rules so the example file can be committed
- `README.md` — a "Development (v2 stack)" section: prerequisites, `docker compose up`, migrate, seed, test

### Delete
- `supabase-schema.sql` — a stale hand-maintained duplicate of `prisma/migrations/…_init`; two sources of
  schema truth

### Do NOT touch
- `src/**` (the existing Next.js app), `prisma/**`, `next.config.ts`, `postcss.config.mjs`
- `AGENTS.md`, `CLAUDE.md`
- Anything in `docs/architecture/`

## 5. Requirements

**R1 — Monorepo.** npm workspaces (`apps/*`, `packages/*`) with Turborepo. Root scripts `dev`, `build`,
`typecheck`, `lint`, `test`, `test:integration` fan out to the workspaces. Turborepo caching configured with
correct `inputs`/`outputs`. Node 22 pinned in `.nvmrc` and in `engines`.

**R2 — TypeScript.** `tsconfig.base.json` with `strict: true`, `noUncheckedIndexedAccess: true`,
`exactOptionalPropertyTypes: true`, `noImplicitOverride: true`. **`any` is banned** — configure
`@typescript-eslint/no-explicit-any` as an error. Cross-package imports resolve through workspace
`exports`, not relative `../../` paths.

**R3 — Config validation.** Each app validates `process.env` with a Zod schema at module load and **throws
before the server binds** if anything is missing or malformed. The error message must name every invalid
variable at once, not just the first. No `process.env` access anywhere outside `config.ts`.

**R4 — Fastify API.** `buildServer()` returns a configured instance **without calling `listen()`**, so tests
can use `fastify.inject()` without binding a port. Register: `@fastify/cors` (allowlist from config),
`@fastify/helmet`, `@fastify/sensible`, `@fastify/rate-limit` (Redis store). Entry point calls `listen()` and
installs a `SIGTERM` handler that closes the server, then the pg pool, then Redis, then exits 0.

**R5 — Request context and logging.** `pino` (pretty in dev, JSON in production). Every request gets a
`request_id`: adopt an inbound `X-Request-Id` if present, else generate one. Store it in an
`AsyncLocalStorage` so any module can log with it **without threading it through every signature**. Echo it in
the `X-Request-Id` response header. Configure `redact` paths for `authorization`, `cookie`, `password`,
`apiKey`, `token`, `set-cookie`. Log one line per request with method, route, status, and `duration_ms`.

**R6 — Error envelope.** A `setErrorHandler` producing exactly the shape in
`docs/architecture/04-api.md`, for every failure including unhandled throws and 404s:

```json
{"error":{"type":"internal_error","code":"unexpected","message":"…","request_id":"req_…"}}
```

In production the `message` for a 500 is a **fixed generic string** — no exception message, no stack. The full
error is logged with the `request_id`. `setNotFoundHandler` returns the same envelope, not Fastify's default.

**R7 — Drizzle and one migration.** Drizzle with `pg`. One throwaway table, deliberately trivial so M2 can
delete it:

```ts
export const skeletonProbe = pgTable('skeleton_probe', {
  id:        uuid('id').primaryKey(),
  note:      text('note').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

`drizzle-kit generate` produces `migrations/0000_init.sql`; **commit the generated SQL and read it** — the
review checks that you have, because from M2 onward hand-review of generated DDL is the safety net.
`packages/db/src/migrate.ts` applies migrations programmatically (used by CI and by the one-shot production
container). Include a documented down/rollback path. Export a `withOrg(orgId, fn)` skeleton that opens a
transaction and issues `SET LOCAL app.current_org_id` — non-functional until M2 has RLS, but present so M2
extends rather than invents it.

**R8 — Health endpoints.** `GET /healthz` returns `200 {"status":"ok"}` and **touches no dependency**.
`GET /readyz` checks Postgres (`SELECT 1`) and Redis (`PING`) with a 1-second timeout each, returning
`200` with per-dependency status, or `503` with the same body shape when either fails. The distinction is
load-bearing — see `04-api.md`.

**R9 — Metrics.** `prom-client` default metrics plus an HTTP request duration histogram labelled by method,
route, and status. Exposed at `GET /metrics`. Route labels must use the **route pattern**, not the resolved
URL, or the cardinality explodes.

**R10 — Worker.** A BullMQ `Worker` on a `maintenance` queue processing a `noop` job that logs its payload and
its inherited `request_id`. Queue name constants live in one module imported by both API and worker. Graceful
shutdown: on `SIGTERM`, stop accepting jobs, await in-flight work (30 s cap), close connections, exit 0. Add a
temporary `POST /_dev/noop` route, **enabled only when `NODE_ENV !== 'production'`**, that enqueues one job —
this is how the end-to-end proof in T6 is driven.

**R11 — `packages/core` purity.** One pure module with no I/O imports. Add `dependency-cruiser` (or an
equivalent ESLint boundary rule) that **fails CI** if `packages/core` imports `pg`, `redis`, `ioredis`,
`bullmq`, `fastify`, `node:fs`, `node:net`, `node:http`, or any `apps/*` path. Prove the rule works by
temporarily adding a forbidden import, observing the failure, and reverting — state in the PR that you did.

**R12 — Docker Compose (dev).** Services per `08-deployment.md`: `postgres:17` (named volume,
`pg_stat_statements` in `shared_preload_libraries`), `redis:7` (`appendonly yes`), `minio` (+ a one-shot
bucket-creation job), `mailpit`, `api`, `worker`, `web`, `bull-board`. Every service: a `healthcheck`,
`restart: unless-stopped`, and `depends_on` with `condition: service_healthy`. App services bind-mount source
for hot reload via `tsx watch`. `node_modules` must **not** be bind-mounted from the host (platform binary
mismatches). Dockerfiles are multi-stage and run as a non-root user.

**R13 — Test harness.** `vitest.workspace.ts` with two projects: `unit` (no external services) and
`integration` (Testcontainers-provisioned Postgres and Redis, migrations applied in `globalSetup`, one
container per run reused across files, truncation between tests rather than re-migration). API tests use
`fastify.inject()`. No mocking of Postgres or Redis in the integration project.

**R14 — CI.** `.github/workflows/ci.yml` on pull requests and pushes to `main`: checkout, setup Node 22 with
npm cache, `npm ci`, `typecheck`, `lint`, `test` (unit), `test:integration`, migration up/down check,
`npm audit --audit-level=high`, and a Docker build of the api and worker images. Concurrency group cancels
superseded runs. Target under 5 minutes.

**R15 — `.env.example`.** Every variable read by any `config.ts`, with a comment and a safe placeholder. No
real values. Fix `.gitignore` so it is committable.

## 6. Architecture constraints

Violating any of these fails review regardless of whether the code works.

1. `packages/core` has **zero** I/O dependencies, enforced by R11's CI rule.
2. `apps/web` does **not** import `packages/db`. The frontend never touches the database directly.
3. No `process.env` access outside a `config.ts`.
4. No business logic in a route handler.
5. `buildServer()` must not call `listen()`.
6. `/healthz` must not touch Postgres or Redis.
7. Queue names are constants in one shared module — never string literals at call sites.
8. No new runtime dependency beyond what R1–R15 imply. If you believe one is needed, add it to `## Concerns`
   and proceed without it.
9. Do not modify `src/**` or `prisma/**`.

## 7. Security requirements

- No secrets committed. `.env.example` carries placeholders only.
- `helmet` registered; CORS is an explicit allowlist from config, never `*` with credentials.
- The 500 response body in production contains no exception message and no stack trace.
- pino `redact` configured for the paths in R5.
- Dockerfiles run as non-root; no secrets in any image layer; base images pinned by tag and digest.
- Rate limiting registered globally with a conservative default, so every later route inherits it rather than
  opting in.
- `npm audit --audit-level=high` passes, or each exception is documented in the PR.

## 8. Tests required

| # | Type | Asserts |
|---|---|---|
| T1 | unit | `/healthz` returns 200 **and no database connection is opened** (assert via a pool spy or a config with an unreachable DB) |
| T2 | integration | `/readyz` returns 200 with both dependencies healthy |
| T3 | integration | `/readyz` returns **503** when Postgres is unreachable, in the standard body shape |
| T4 | unit | An unknown route returns the error envelope with a `request_id`, not Fastify's default 404 |
| T5 | unit | A route that throws returns 500 in envelope shape, with **no stack trace and no exception message** in the body when `NODE_ENV=production` |
| T6 | integration | Enqueue a `noop` job, worker processes it, and the `request_id` from the HTTP request appears in the worker's log line — proving context propagation across the queue boundary |
| T7 | integration | Migrations apply to an empty database, then roll back cleanly |
| T8 | unit | Config validation throws on a missing required variable, and the message names **all** invalid variables |
| T9 | unit | An inbound `X-Request-Id` is adopted; when absent one is generated; either way it is echoed in the response header |
| T10 | unit | The pure `packages/core` function (the status-rank lattice) — including the out-of-order and terminal-status cases |
| T11 | integration | `withOrg()` opens a transaction and issues `SET LOCAL app.current_org_id` (assert via `current_setting`) |
| T12 | ci | The `dependency-cruiser` rule fails when `packages/core` imports `pg` (see R11) |

## 9. Acceptance criteria

Reviewer runs these. Paste the output in the PR.

- [ ] `git clone` → `cp .env.example .env` → `docker compose -f infra/compose/docker-compose.dev.yml up`
      brings every service to healthy **with no manual steps and no edits to .env beyond placeholders**
- [ ] `curl localhost:4000/healthz` → 200; `curl localhost:4000/readyz` → 200
- [ ] `docker compose stop postgres` → `/readyz` → 503, `/healthz` → **still 200**
- [ ] `npm run db:migrate` applies cleanly to an empty database; rollback works
- [ ] `npm run db:seed` inserts a `skeleton_probe` row
- [ ] `curl -XPOST localhost:4000/_dev/noop` → the worker logs the job **with the same `request_id`**
- [ ] Bull Board at `localhost:4100` shows the completed job
- [ ] `curl localhost:4000/metrics` returns Prometheus text including the HTTP histogram
- [ ] `npm run typecheck && npm run lint && npm run test && npm run test:integration` all green
- [ ] CI green on the PR in **under 5 minutes**; paste the run duration
- [ ] `docker compose kill -s SIGTERM worker` → exits 0 after draining; paste the log
- [ ] `grep -rn "process.env" apps packages --include=*.ts | grep -v config.ts` returns **nothing**
- [ ] `grep -rn ": any\|as any" apps packages --include=*.ts` returns **nothing**
- [ ] `supabase-schema.sql` deleted; `.env.example` tracked by git (`git ls-files .env.example`)
- [ ] The existing Next.js app still builds: `npm run build` at the root succeeds
- [ ] R11 proof stated in the PR: the forbidden-import rule was tested and does fail

## 10. Deliverables

Branch `m1/walking-skeleton`. One PR whose description contains:
1. The acceptance criteria checklist, checked, with pasted evidence.
2. The CI run duration.
3. The R11 verification statement.
4. A security note: what an attacker reaching this skeleton could try, and why each attempt fails.
5. `## Concerns` — anything you disagreed with, implemented as specified anyway.
6. Any ADR added under `docs/adr/`.

Conventional commits. Keep the diff under ~1500 lines excluding lockfile and generated SQL; if it will exceed
that, stop and propose a split before writing more.

## 11. If you disagree

Do not redesign. Implement the spec as written and put your objection in `## Concerns`. Architecture changes
are decided before implementation, not during it.
