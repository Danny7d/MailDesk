# 10 — Devin Task Protocol & Review Protocol

> Sections N and O.

## N. Devin task protocol

Every implementation task is a file in `docs/tasks/M{n}-{slug}.md` using this template. The purpose of the
**"What NOT to change"** and **"Architecture constraints"** sections is to prevent uncontrolled refactors: an
agent given a narrow task and a broad codebase will otherwise "improve" things you did not ask about, and the
review cost explodes.

```markdown
# M{n} — {Title}

## 1. Objective
One paragraph. What exists at the end that does not exist now. No implementation detail.

## 2. Context
Why this milestone, what precedes it, which blueprint sections govern it (link them).
Anything already decided that the implementer must not re-litigate.

## 3. Scope
### In scope
- explicit bullet list
### Out of scope — do NOT build these in this task
- explicit bullet list, including the tempting adjacent things

## 4. Files and components
### Expected to create
- `path` — purpose
### Expected to modify
- `path` — what changes
### Do NOT touch
- `path` — why

## 5. Requirements
Numbered, testable, each one a thing a reviewer can verify.
R1. …
R2. …

## 6. Architecture constraints
Non-negotiable. Violating one fails review regardless of whether the feature works.
- e.g. `packages/core` must not import any I/O library
- e.g. all tenant queries go through `withOrg()`
- e.g. no third-party API call on a request path

## 7. Security requirements
Specific to this task, derived from `07-security.md`. Not "be secure".

## 8. Tests required
Enumerated. Each names what it asserts.
T1. …  (unit / integration / e2e)

## 9. Acceptance criteria
Copied from the milestone's Definition of Done in `09-roadmap.md`. Checkboxes.
Include the exact commands a reviewer runs, and the evidence to paste in the PR.

## 10. Deliverables
- a branch named `m{n}/{slug}`
- a PR whose description includes: the checked acceptance criteria, pasted evidence
  (EXPLAIN output, timings, test summary), a security note, and any ADR added
- conventional commits

## 11. If you disagree
Do NOT redesign. Open the PR with your implementation of the spec as written, and add a
`## Concerns` section explaining what you think is wrong and what you would do instead.
Architecture changes are decided before implementation, not during it.
```

### Rules given to Devin, standing, every task

1. **Read the blueprint sections linked in §2 before writing code.** They are the specification.
2. **Do not change the stack.** No new dependency without it being named in the task or an ADR.
3. **Do not refactor outside the task's file list.** Note the improvement in `## Concerns` instead.
4. **Do not weaken a test to make it pass.** A failing test is information.
5. **Do not commit secrets, `.env` files, or generated artefacts.**
6. **Every migration is expand/contract safe.**
7. **Every async operation gets a documented failure strategy.**
8. **If a requirement is ambiguous, implement the more conservative reading and say so in the PR.**
9. **`AGENTS.md` applies**: this Next.js version has breaking changes — read
   `node_modules/next/dist/docs/` before writing frontend code. Do not rely on training data for Next APIs.
10. **Small PRs.** If the diff exceeds ~1500 lines, stop and propose a split.

## O. Review protocol

Run in this order. **Stop at the first category with a blocking finding** and return the task — reviewing
performance in code with a tenancy hole wastes both our time.

Each finding is labelled **BLOCKER** (must fix before merge), **MAJOR** (fix before the next milestone), or
**MINOR** (backlog).

### 1. Functional correctness
- Does it do what §5 of the task says? Every requirement, not most.
- Happy path *and* the failure paths. Empty results, missing records, malformed input, provider down.
- Off-by-one, boundary values, empty arrays, null vs undefined, timezone handling.
- Does the code do anything the task did **not** ask for? Scope creep is a finding.

### 2. Architecture
- Layer discipline: does `packages/core` import I/O? Does `apps/web` import `packages/db`?
- Are provider details leaking out of `packages/providers` into core, API, or frontend?
- Would adding a sixth provider require touching anything outside the 9-step checklist?
- Is business logic in a route handler that belongs in core?
- Is there a new abstraction with exactly one implementation? (Premature — a finding.)
- Is there duplicated logic that should be shared, or shared logic that should have been duplicated?

### 3. Security — **BLOCKER by default**
- authn on every new route; authz with the correct minimum role
- Zod validation with `.strict()`; body size limits
- output serializer — no `password_hash`, ciphertext, tokens, raw payloads, other orgs' ids
- SQL parameterized; no `sql.raw` with interpolation
- secrets not logged; redaction paths updated for any new field name
- rate limit on anything expensive or abusable
- new external fetch: SSRF-guarded?
- new HTML rendered: sanitized *and* sandboxed?
- new file handling: sniffed, size-capped, separate origin, scan-gated?
- new webhook: raw-body signature verification, constant-time, replay window?
- audit log written for every state change a customer or auditor would care about?

### 4. Database correctness
- Migration reversible or documented forward-only; expand/contract safe
- Correct types (`timestamptz` never `timestamp`; `citext` for emails; `numeric` never `float` for money)
- NOT NULL and CHECK constraints where the invariant is real
- FKs with a deliberate `ON DELETE` — cascade, set null, or restrict, chosen not defaulted
- Unique constraints partial on `deleted_at IS NULL` where soft delete applies
- Every FK has an index; no redundant indexes
- No N+1: look for a query inside a loop
- Transaction boundaries: is a multi-step invariant actually atomic? (The current signup route is not.)
- `EXPLAIN ANALYZE` for any new hot query — index used, no sequential scan on a large table

### 5. Multi-tenancy — **BLOCKER by default**
- Every tenant query goes through `withOrg()`; no unscoped client usage
- New tables: `org_id` present, RLS enabled **and forced**, policy correct, composite FK to the parent
- The generated RLS coverage test still passes
- Cross-tenant test exists for the new tables
- Cross-tenant access returns 404, not 403
- Background jobs: does the job payload carry `org_id`, and is the context set before querying?
- Cache keys include `org_id` (a shared cache key across tenants is a leak)

### 6. Error handling
- Errors caught at a boundary that can do something about them, not swallowed
- No empty `catch {}`; no `catch` that logs and continues into an invalid state
- Error envelope used consistently; no internal detail in a response body
- Failure of a non-critical dependency degrades rather than 500s
- Transactions roll back on error; no partial writes escaping

### 7. Concurrency
- What happens with two simultaneous identical requests? Two workers on one job?
- Read-modify-write on a shared row → is it `SELECT … FOR UPDATE`, an atomic `UPDATE`, or a compare-and-swap?
- Counter increments atomic (not `SELECT` then `SET`)
- No TOCTOU: `findFirst` then `create` is a finding — use `ON CONFLICT`
- Optimistic concurrency where two users edit the same conversation
- Deadlock risk: do transactions acquire locks in a consistent order?

### 8. Idempotency
- Every consumer safe to run twice, backed by a unique constraint rather than a check
- `Idempotency-Key` honoured on external-effect POSTs, with fingerprint conflict detection
- Replayed provider webhook produces no duplicate state
- Retries do not double-charge, double-send, or double-count usage
- Status projections monotonic; out-of-order events cannot regress state

### 9. Performance
- No unbounded query — every list has a limit
- Cursor pagination, not offset, on anything that grows
- No N+1 across an HTTP boundary either (a loop of API calls)
- Streaming for large payloads, not buffering
- Cache invalidation is correct before caching is added
- Reasonable, not optimal (Rule 4) — but "reasonable" excludes a sequential scan on the inbox query

### 10. Testing
- Tests assert **behaviour**, and fail if the feature is reverted (check this by reverting mentally)
- Real Postgres and Redis, not mocks, for anything touching them
- Failure paths tested, not only happy paths
- Provider adapters tested against recorded fixtures
- No test that asserts implementation detail (mock call counts) instead of outcome
- No flaky test — no `sleep`, no dependence on wall-clock ordering
- Tenancy tests present for new tables

### 11. Observability
- Structured logs at meaningful points, with `request_id` and `org_id`
- No `console.log`
- Log levels sensible: `error` is actionable, `info` is an event, `debug` is detail
- New queue or provider has a metric
- A new failure mode is alertable, and an alert exists if it's serious

### 12. Maintainability
- Names describe intent; no `data`, `temp`, `handle`, `manager` without meaning
- No dead code, no commented-out code, no `TODO` without an issue reference
- Types are honest: no `any`, no unnecessary `as`, no `!` covering a real nullable
  (the current `authConfig` callbacks are `any` with eslint-disable — that's a finding)
- Comments explain **why**, never what
- Matches surrounding conventions

### 13. API compatibility
- No breaking change to an existing `/v1` endpoint without a version bump
- New fields optional; removed fields deprecated first
- OpenAPI regenerated and accurate
- Error codes stable and documented
- Frontend contract types regenerated in `packages/contracts`

### 14. Infrastructure
- Compose files valid; new service has healthcheck, restart policy, resource limits
- New env var: in `.env.example`, validated at boot, documented
- Dockerfile: layer caching sensible, non-root user, no secrets in layers, pinned base
- CI updated for new test types
- No new datastore port published in production
- nginx config updated if routing changed (SSE buffering, body size)

### 15. Production readiness
- Graceful shutdown handles the new work
- Runbook entry for the new failure mode
- Backup covers any new durable state (including object storage)
- A rollback of this change is safe given the migration (expand/contract respected)
- Data lifecycle: does new personal data get covered by export, erasure, and retention?
- Cost implication understood (a new provider call per message is a per-message cost)

### Review output format

```markdown
## Review: M{n} — {Title}
**Verdict:** APPROVE / APPROVE WITH FOLLOW-UPS / REQUEST CHANGES / REJECT

### Blockers
1. `path:line` — **what** is wrong, **why** it matters, **what** to do instead.

### Major
### Minor
### Acceptance criteria
| # | Criterion | Status | Evidence |

### What was done well
(Genuine. A review that only lists faults trains the implementer to hide uncertainty.)
```
