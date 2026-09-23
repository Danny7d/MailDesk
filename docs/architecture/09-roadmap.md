# 09 — Roadmap, Dependencies, Definition of Done

> Sections K, L, M. I have changed your sequence in four ways, each explained.

## Changes from your proposed milestone list

1. **Security is not a milestone.** Your Rule 7 and §12 say so, then your list puts "Security hardening" at 16.
   Security moves into **every** milestone's Definition of Done, with one *additional* dedicated audit
   milestone (M16) for the things that can only be done once — threat modelling the whole system, a dependency
   audit, a pen-test pass.
2. **A synthetic provider comes before any real one.** M6 builds the messaging core against an `internal`
   test provider. This is the only way to know whether the abstraction is genuinely provider-agnostic or
   quietly Resend-shaped. Building Resend first guarantees the latter.
3. **Testing infrastructure is M1, not M14.** There are zero tests today. Adding a test harness after ten
   milestones of untested code is how this project dies.
4. **Load testing is demoted.** A k6 smoke test lands in M3 as a capacity baseline. Real load testing needs
   real traffic patterns; doing it now measures your test script.

Also: Telegram before Billing (it validates the architecture, and validation before monetization), Meta last
because it is externally gated, and a decision milestone (M0) first because the BYO-key question changes the
schema.

## Milestones

| # | Milestone | Why here |
|---|---|---|
| **M0** | **Decisions & audit** | Resolve BYO-key vs platform-managed; lock the stack; write ADRs; confirm B.5 unknowns. Changes the schema, so it must precede M2. |
| **M1** | **Foundation: monorepo, Docker Compose, CI, test harness** | Nothing downstream is verifiable without it. **← the walking skeleton** |
| **M2** | **Database foundation + tenancy** | orgs/users/memberships, migrations, RLS, the generated RLS test, seed. |
| **M3** | **API foundation** | Fastify, config validation, error envelope, request ids, logging, healthz/readyz, rate limiting, OpenAPI, k6 baseline. |
| **M4** | **Auth & sessions** | signup, login, argon2id, sessions, verification, reset, Google OAuth, MFA-ready. |
| **M5** | **Orgs, RBAC, invitations, audit log** | The tenancy model becomes usable by real users. |
| **M6** | **Messaging core + synthetic provider** | conversations, messages, contacts, state machines, threading, `provider_events`, outbox. **The architectural keystone.** |
| **M7** | **Queue & workers** | BullMQ, outbox relay, retries, DLQ, cron, Bull Board. |
| **M8** | **Email channel (Resend)** | inbound, outbound, delivery events, suppression, domains/DNS, MIME, threading. |
| **M9** | **Attachments & object storage** | presigned upload/download, sniffing, scan gate, separate origin. |
| **M10** | **Realtime (SSE)** | event log, Redis pub/sub, `Last-Event-ID` replay. |
| **M11** | **Frontend rebuild** | dashboard against the new API. Can start after M6 fixes the contract. |
| **M12** | **Telegram channel** | **The falsification test.** If this needs `packages/core` changes, the abstraction failed. |
| **M13** | **Billing & entitlements (Stripe)** | plans, subscriptions, materialized entitlements, quotas, lapse policy. |
| **M14** | **Observability & ops** | Prometheus, Grafana, Loki, Sentry, alerts, runbooks. |
| **M15** | **Production deployment** | VPS, nginx, TLS, DNS, CD, backups **+ a performed restore drill**. |
| **M16** | **Security audit** | threat model, dependency audit, pen-test pass, data lifecycle (export/erasure/retention). |
| **M17** | **AI layer** | suggested replies, summaries, org-scoped RAG on pgvector. |
| **M18** | **Meta channels** | gated on App Review; adapter built against fixtures beforehand. |
| **M19** | **Performance & capacity** | real load testing, index tuning, partitioning if warranted. |

## Dependency graph

```
M0 ─→ M1 ─→ M2 ─→ M3 ─→ M4 ─→ M5 ─→ M6 ─┬─→ M7 ─→ M8 ─┬─→ M9 ─→ M15 ─→ M16 ─→ M19
                                          │             ├─→ M10 ─┘
                                          │             └─→ M13
                                          ├─→ M11 (needs only the M6 API contract)
                                          ├─→ M12 (needs M7 + M8's patterns)
                                          ├─→ M17 (needs message data)
                                          └─→ M18 (needs M6; gated externally)
             M14 ─ can begin at M3 and grows continuously
```

**Critical path:** M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M15. Everything else hangs off it.

### One ordering wrinkle: M4 needs to send email before M8 exists

M4 (auth) requires verification and password-reset emails, but the email channel is M8. Do **not** reorder the
milestones to fix this. Instead, M4 ships a minimal `TransactionalMailer` port with a single Resend
implementation (~50 lines, no inbound, no threading, no delivery events) plus a Mailpit implementation for
dev. M8 then replaces the Resend implementation with the full channel and deletes nothing but the stub.

Keeping transactional mail (verification, reset, invitations, alerts) behind its **own** port is correct
permanently, not just as a workaround: those messages must not consume a customer's `monthly_messages` quota,
must not appear in any org's conversation list, and must keep sending when a customer's own channel is
suspended.

**Parallelizable:**
- **M11 (frontend)** after M6 publishes the OpenAPI contract — the largest parallelism win available. Design
  the API contract first precisely so this can happen.
- **M14 (observability)** incrementally from M3 onward; do not save it up.
- **M18 (Meta)** — start the App Review paperwork *now*, in parallel with everything, because the waiting is
  the long part. The code is small; the approval is not.
- **M12 (Telegram)** any time after M7/M8.
- **M17 (AI)** any time after M6.

**Strictly sequential and worth stating why:**
- M2 before everything: RLS and composite FKs are structural. Retrofitting tenancy is a rewrite.
- M4 before M5: no orgs without users.
- M6 before M8: build the abstraction before the first real provider, or the abstraction becomes a
  Resend wrapper.
- M7 before M8: inbound email needs the queue to exist.
- M9 before M15: attachments need the separate origin configured in nginx.

## Definition of Done

Every milestone must satisfy the **universal gate**, plus its own criteria. "Implemented" is never a criterion.

### Universal gate (every milestone, no exceptions)

- [ ] `npm run typecheck`, `lint`, `test` green in CI on a clean checkout
- [ ] New code covered by tests that **fail if the feature is reverted** (assert behaviour, not coverage %)
- [ ] Every new tenant table has RLS enabled+forced, and the generated RLS test passes
- [ ] Every new endpoint: authn, authz, Zod validation, rate limit, error envelope, OpenAPI entry
- [ ] Every new async operation has a documented failure strategy (retry / DLQ / compensate)
- [ ] Every new external call is idempotent or guarded by a unique constraint
- [ ] Structured logs with `request_id`; no secrets in logs (redaction paths updated)
- [ ] Migrations are reversible or explicitly documented as forward-only, and are expand/contract safe
- [ ] `.env.example` updated; config validated at boot (fail fast on missing/invalid)
- [ ] A security note in the PR: what an attacker could try here, and why it fails
- [ ] Docs updated: ADR for any irreversible decision, README for any new setup step

### Per-milestone criteria (measurable)

**M0 — Decisions**
- [ ] ADR: BYO-key vs platform-managed, with the billing consequence stated
- [ ] ADR: Drizzle vs Prisma; ADR: own-auth vs NextAuth; ADR: SSE vs WebSocket
- [ ] Every B.5 unknown answered in writing
- [ ] `supabase-schema.sql` deleted; `.gitignore` fixed to allow `.env.example`

**M1 — Foundation** (full spec: `docs/tasks/M1-walking-skeleton.md`)
- [ ] `docker compose up` from a clean clone yields a healthy stack with no manual steps
- [ ] `GET /healthz` → 200 without touching a datastore; `/readyz` → 200 and → 503 when Postgres is stopped
- [ ] One migration applies and rolls back; a `select 1` integration test runs against a real Postgres
- [ ] Worker consumes a no-op job end to end; visible in Bull Board
- [ ] CI runs typecheck + lint + unit + integration on PR, green, in under 5 minutes
- [ ] `npm run dev` works without Docker for the app processes (Postgres/Redis in Docker)

**M2 — Database**
- [ ] Full schema migrated; `psql -c '\d+'` matches `03-database.md`
- [ ] Cross-tenant read returns **0 rows** for every table carrying `org_id` (one test per table)
- [ ] Cross-tenant composite-FK insert **fails** with a constraint violation (test)
- [ ] The generated `information_schema` test fails when RLS is missing on an `org_id` table (proven by
      temporarily adding an unprotected table)
- [ ] `maildesk_app` verified to lack `BYPASSRLS` and to own no tenant table
- [ ] Seed creates ≥2 orgs with overlapping users, usable for manual cross-tenant probing
- [ ] `EXPLAIN ANALYZE` on the inbox list query uses `conversations_inbox_idx` — output pasted in the PR

**M3 — API foundation**
- [ ] Unknown route → the standard error envelope with a `request_id`, not an HTML page or a stack trace
- [ ] A thrown error anywhere → 500 with envelope, logged with `request_id`, **no internal detail in the body**
- [ ] Rate limit returns 429 with `Retry-After` (proven by a test that exhausts it)
- [ ] Boot fails loudly on a missing/invalid env var (test)
- [ ] `/metrics` exposes request count and latency histograms
- [ ] OpenAPI served and validated; k6 baseline recorded in the PR (p50/p95/p99 on a trivial route)

**M4 — Auth**
- [ ] Full happy paths: signup → verify → login → logout; OAuth login and account linking
- [ ] Login rate-limited per-IP **and** per-email (two separate tests)
- [ ] Timing test: unknown-user and wrong-password paths are indistinguishable within tolerance
- [ ] Password reset invalidates **all** sessions (test)
- [ ] Tokens are single-use and expire (tests for reuse and expiry)
- [ ] OAuth rejects a mismatched `state` and an unverified Google email (two tests)
- [ ] No response anywhere contains `password_hash` (the forbidden-keys test covers it)

**M5 — Orgs & RBAC**
- [ ] Permission matrix from `04-api.md` covered by a test **per role per action** (a table-driven test)
- [ ] The last owner cannot be demoted or removed (test)
- [ ] An invitation cannot be redeemed by a different email (test)
- [ ] Accessing another org returns **404, not 403** (test)
- [ ] Every mutating action writes an `audit_logs` row (test per action)

**M6 — Messaging core**
- [ ] Full conversation/message lifecycle over the synthetic provider, no real network
- [ ] Same event delivered twice → exactly one message row (test)
- [ ] Delivery events applied in reverse order → correct final status (test)
- [ ] `bounced` after `delivered` → status `bounced` **and** a `suppressions` row (test)
- [ ] Email threading: 4 fixtures — our own `Message-ID`, an `In-Reply-To` chain, subject heuristic, and a
      case that must **not** merge (two different customers, same subject)
- [ ] Outbox: kill the process between commit and relay → the job still runs (test)
- [ ] `packages/core` has zero I/O imports (enforced by a dependency-cruiser rule in CI)

**M7 — Queues**
- [ ] Retry with exponential backoff **and jitter** observed in a test
- [ ] Each `ProviderError` kind produces its documented behaviour (5 tests)
- [ ] Exhausted job lands in the `dead_letters` **table** and is re-drivable
- [ ] Circuit breaker opens after N failures and half-opens after cooldown (test)
- [ ] `SIGTERM` completes in-flight jobs and exits 0 (test)
- [ ] Repeatable jobs do not duplicate across 2 worker replicas (test)

**M8 — Email**
- [ ] Real email received end to end and visible in the API; real email sent and delivered
- [ ] Webhook handler: signature verified, **no external call**, p99 < 50 ms (measured, pasted in the PR)
- [ ] Unknown recipient → **200** and a `provider_events` row with `status='unrouted'` (test)
- [ ] Invalid signature → 401 and nothing persisted (test)
- [ ] Replayed webhook → 200 `{duplicate}`, one row (test)
- [ ] Send to a suppressed address → **422, nothing sent** (test)
- [ ] Send with an unverified sender domain → **422** (test)
- [ ] MIME fixtures: multipart/alternative, quoted-printable, base64, inline `cid:`, non-UTF-8 charset,
      a 30-attachment message
- [ ] An `Auto-Submitted: auto-replied` message triggers no auto-reply (test)
- [ ] SPF/DKIM/DMARC verified for the sending domain; a real `mail-tester`-style score recorded

**M9 — Attachments**
- [ ] Upload → sniff → store → download round-trip through presigned URLs
- [ ] A file whose declared type lies about its content is stored with the **sniffed** type (test)
- [ ] Download blocked while `scan_status='pending'` (test)
- [ ] Presigned URL expires (test); a URL for another org's file is rejected (test)
- [ ] Oversize upload rejected **by the presign policy**, not the client (test)
- [ ] Files served from a **different origin** than the app (verified in the deployed config)
- [ ] A hostile `.html` and a hostile `.svg` attachment cannot execute in the app origin (manual proof, documented)

**M10 — Realtime**
- [ ] Two browsers, one org: a message in one appears in the other in < 1 s
- [ ] Disconnect for 60 s, reconnect → missed events replayed via `Last-Event-ID` (test)
- [ ] A user cannot subscribe to another org's stream (test)
- [ ] 100 concurrent SSE connections stable; FD and memory usage recorded
- [ ] Frames contain **no message bodies** (test asserts the payload shape)

**M11 — Frontend**
- [ ] Inbox, conversation view, compose, reply, assign, tag, snooze, settings, integrations, billing
- [ ] Zero direct database access from `apps/web` (enforced: no `packages/db` import, lint rule)
- [ ] Inbound HTML email rendered in a sandboxed iframe on the file origin; XSS fixture proven inert
- [ ] Optimistic send with SSE reconciliation; a failed send surfaces the reason
- [ ] Capability-driven UI: subject hidden for Telegram, composer blocked on a closed reply window
- [ ] Playwright covers: login → send → receive → assign → close

**M12 — Telegram** (the falsification test)
- [ ] Send and receive text and media through a real bot
- [ ] **`git diff --stat` on `packages/core` is empty for this milestone.** If not, document exactly what
      leaked and fix the abstraction rather than the caller.
- [ ] The 9-step provider checklist in `05-integrations.md` completed
- [ ] Webhook rejects a request with a wrong `secret_token` (test)

**M13 — Billing**
- [ ] Full Stripe test-mode lifecycle: subscribe → upgrade → downgrade → cancel → reactivate
- [ ] Payment failure → grace period → read-only. **Inbound messages are still received during read-only** (test)
- [ ] Quota exceeded → 402 and nothing sent (test)
- [ ] Concurrent sends at the quota boundary cannot exceed the limit (**concurrency test**, 50 parallel requests)
- [ ] Replayed Stripe webhook is idempotent (test)
- [ ] Zero occurrences of a plan-name conditional outside the entitlement module (grep, pasted in the PR)

**M14 — Observability**
- [ ] Grafana dashboards: HTTP, queues, DB, providers, business counters
- [ ] Every alert in `08-deployment.md` configured and **each one fired once deliberately** to prove routing
- [ ] One `request_id` traceable from an nginx log through the API through a queue job (screenshot in the PR)
- [ ] Runbooks: provider outage, queue backlog, DB full, cert expiry, credential rotation, restore

**M15 — Production**
- [ ] Deployed; TLS A-grade on SSL Labs; HSTS preloaded
- [ ] CD deploys `main` automatically; a rollback performed successfully **at least once**
- [ ] Migrations run as a one-shot before the roll; zero-downtime verified under a k6 trickle
- [ ] **A full restore performed from backup into a fresh container, with the RTO recorded in the PR**
- [ ] No datastore ports published to the host (`docker ps` output in the PR)
- [ ] `ufw` verified; SSH key-only verified; cert auto-renew `--dry-run` passes

**M16 — Security audit**
- [ ] Written threat model per trust boundary
- [ ] `npm audit` clean or every exception documented with justification
- [ ] Data export, erasure, and retention purge working end to end (tests)
- [ ] The full checklist in `10-protocols.md` §O run against the whole system
- [ ] Every finding either fixed or recorded with an accepted-risk rationale

**M17 — AI**
- [ ] Suggested reply and summary behind a port; a stub provider passes the same tests
- [ ] **RAG retrieval cannot return another org's content** (test — the single most important one here)
- [ ] AI failure degrades gracefully and never blocks a send (test with a failing provider)
- [ ] A prompt-injection fixture in message content does not cause an action (test)
- [ ] Token spend metered per org against an entitlement

**M18 — Meta**
- [ ] App Review approved (external gate)
- [ ] A batched webhook containing entries for two different orgs routes correctly (test — the cross-tenant risk)
- [ ] 24-hour window enforced; the composer explains why it's blocked
- [ ] Token expiry degrades the integration to `error` and notifies admins (test)

**M19 — Performance**
- [ ] k6 load profile against production-like data (≥100k messages, ≥10k conversations)
- [ ] p95 targets met and recorded: inbox list < 200 ms, thread view < 200 ms, send accept < 100 ms
- [ ] No sequential scans on hot queries (`EXPLAIN ANALYZE` output for each, pasted)
- [ ] `pg_stat_statements` top-20 reviewed; each either acceptable or fixed
