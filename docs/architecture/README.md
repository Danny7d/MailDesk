# MailDesk — Architecture Blueprint

Master technical blueprint. Written 2026-08-23 against commit `4191a69`.

Read in order. Each file is authoritative for its domain; where they disagree, the more specific file wins and
the conflict is a bug in this blueprint — report it.

| File | Sections | Contents |
|---|---|---|
| [`00-executive-review.md`](00-executive-review.md) | A, B | Honest assessment; what exists in the repo today; 19 confirmed defects; stated assumptions |
| [`01-stack.md`](01-stack.md) | C | Technology choices with reasoning and rejected alternatives; monorepo layout |
| [`02-system.md`](02-system.md) | D | Services, topology, and the seven flows (inbound, outbound, delivery, auth, billing, jobs, realtime) |
| [`03-database.md`](03-database.md) | E | Relational model, DDL, indexes, RLS, the composite-FK tenancy trick |
| [`04-api.md`](04-api.md) | F | REST conventions, full endpoint surface, errors, pagination, idempotency, authz matrix |
| [`05-integrations.md`](05-integrations.md) | G | Provider ports, capability descriptors, threading per provider, the add-a-provider checklist |
| [`06-queues-workers.md`](06-queues-workers.md) | H | Transactional outbox, queues, retry taxonomy, idempotency, cron, dead letters |
| [`07-security.md`](07-security.md) | I | Four-layer tenancy, credentials, attachments, HTML email, SSRF, abuse, data lifecycle |
| [`08-deployment.md`](08-deployment.md) | J | Local Compose, VPS production, nginx, TLS, secrets, migrations, backups, CI/CD, observability |
| [`09-roadmap.md`](09-roadmap.md) | K, L, M | 20 milestones, dependency graph, measurable Definition of Done per milestone |
| [`10-protocols.md`](10-protocols.md) | N, O | Devin task template and standing rules; the 15-category review checklist |

**Next action (section P):** [`../tasks/M1-walking-skeleton.md`](../tasks/M1-walking-skeleton.md)

## The decisions that shape everything else

1. **Platform-managed sending, not bring-your-own-API-key.** BYO-key makes metering, entitlements,
   suppression, and deliverability guarantees impossible. BYO survives as an optional mode.
   → `05-integrations.md`
2. **Tenancy is enforced by the schema, not by discipline.** Composite foreign keys carrying `org_id` make a
   cross-tenant reference a constraint violation; RLS is the backstop; a generated test fails the build if any
   `org_id` table lacks a forced policy. → `03-database.md`, `07-security.md`
3. **Webhooks verify, persist, and return 200 — nothing else.** All work happens in a worker, fed by a
   transactional outbox. Non-2xx means "retry," so you only say it when you mean it.
   → `02-system.md`, `06-queues-workers.md`
4. **Message status is an append-only log with a monotonic projection.** Out-of-order and duplicate delivery
   events are the normal case, not the exception. → `02-system.md` §D.5
5. **Capability descriptors per channel.** One UI serves email, Telegram, and Instagram by reading what a
   channel *can do* rather than branching on its type. This is what makes provider-agnosticism real rather
   than aspirational. → `05-integrations.md`
6. **The messaging core is built and tested against a synthetic provider before Resend exists**, and Telegram
   is the falsification test: if it requires changes to `packages/core`, the abstraction failed.
   → `09-roadmap.md`
7. **SSE, not WebSockets.** Server→client push is all that's needed; SSE gets reconnect-with-replay for free.
   → `01-stack.md`, `02-system.md` §D.9
8. **Security is in every milestone's Definition of Done**, not a phase at the end.
9. **Kubernetes is premature.** One VPS, Docker Compose, nginx. → `08-deployment.md`
10. **An untested backup is a belief, not a capability.** M15 is not done without a performed restore.
