# 06 — Queue & Worker Architecture

> Section H. BullMQ on Redis, fed by a Postgres transactional outbox.

## Why the outbox exists

```ts
// WRONG — and it will lose customer messages
await db.transaction(async tx => { await tx.insert(messages)…; });
await queue.add('message.send', { id });     // process dies here → row exists, never sends
```

Two datastores, no shared transaction. Either order loses: enqueue-then-commit can produce a job referencing a
row that never existed; commit-then-enqueue can produce a row whose job never ran. The second is worse because
it's silent.

```ts
// RIGHT — one transaction, one datastore
await db.transaction(async tx => {
  await tx.insert(messages).values(…);
  await tx.insert(outbox).values({ topic: 'message.send', payload: { id } });
});
// a relay moves outbox rows → BullMQ, at-least-once
```

The remaining failure mode is *duplicate* delivery, which idempotent consumers already handle. You have traded
an unsolvable problem (lost work) for a solved one (repeated work).

**Scope:** outbox for **inbound provider events** and **outbound message sends** only. Everything else —
welcome emails, counter recomputes, token refresh — enqueues directly. Losing one of those is recoverable;
losing a customer's message is not. (Rule 3: proportionate, not universal.)

### The relay

```sql
-- every 250 ms, per worker replica
WITH claimed AS (
  SELECT id FROM outbox
   WHERE published_at IS NULL AND available_at <= now()
   ORDER BY id
   FOR UPDATE SKIP LOCKED
   LIMIT 100
)
UPDATE outbox o SET claimed_at = now(), claimed_by = $worker
  FROM claimed c WHERE o.id = c.id
RETURNING o.*;
```

`FOR UPDATE SKIP LOCKED` is what makes N replicas safe with no coordination, no leader election, and no
distributed lock. Push each row to BullMQ, then set `published_at`. If the process dies between push and
mark, the row is re-published later — duplicate, handled. A sweeper resets `claimed_at` older than 5 minutes
with `published_at IS NULL`.

## Queues

| Queue | Concurrency | Attempts | Backoff | Notes |
|---|---|---|---|---|
| `provider-events` | 10 | 5 | exp, 1s → 60s | normalize + persist inbound |
| `outbound-send` | 5 per channel | 5 | exp, 2s → 5m | rate-limited per channel |
| `attachments` | 3 | 3 | exp, 5s → 2m | large, slow, streaming |
| `delivery-events` | 10 | 3 | exp, 1s → 30s | status projection |
| `realtime` | 20 | 2 | fixed 500ms | fire-and-forget pub/sub |
| `ai` | 2 | 2 | exp, 5s | never blocks anything |
| `billing` | 3 | 8 | exp, 10s → 1h | Stripe reconciliation, patient |
| `maintenance` | 1 | 3 | exp | cron: rollups, DNS, tokens, purges |

Separate queues so a 40 MB attachment download cannot starve outbound sends, and so a provider outage
localizes to one queue's backlog instead of blocking everything.

**Per-channel rate limiting:** BullMQ groups keyed by `channel_id`, so one org hammering one channel cannot
consume global send capacity. Provider-level limits get a Redis token bucket in front of the transport.

## Retry policy

Driven **only** by the `ProviderError` taxonomy from `05-integrations.md`:

| kind | Action |
|---|---|
| `retryable` | exponential backoff + full jitter, up to `attempts` |
| `rate_limited` | reschedule at `retryAfterMs` (respect the provider, don't guess) |
| `auth` | **do not retry**. Mark integration `error`, notify admins, park the job. |
| `terminal` | do not retry. Mark the message failed with a user-facing reason. Refund quota. |
| `suppressed` | do not retry. Write `suppressions`. |

Jitter is not optional: without it, a provider recovering from an outage receives every retry
simultaneously — a self-inflicted thundering herd that re-triggers the outage.

**Circuit breaker per provider**: after N consecutive `retryable` failures, open the breaker, pause the queue,
alert. Half-open probe after a cooldown. This turns "provider is down for an hour" from 50,000 doomed attempts
into one alert and a paused queue that drains cleanly on recovery.

## Idempotency in consumers

Every consumer must be safe to run twice. Mechanisms, in order of preference:

1. **A unique constraint plus `ON CONFLICT DO NOTHING`** — the database enforces it, so no race exists.
   `provider_events(provider, provider_event_id)`, `messages(org_id, conversation_id, provider_message_id)`,
   `message_status_events(org_id, message_id, status, provider_event_id)`.
2. **Monotonic projection** for status (see `02-system.md` §D.5) — replaying an old event is a no-op by
   construction.
3. **Claim-with-state-transition** for jobs that call out: `UPDATE messages SET status='sending'
   WHERE id=$1 AND status='queued' RETURNING *`. Zero rows → someone else has it → return.

Never `SELECT` then `INSERT`. That is a TOCTOU race, and it is the bug in the current webhook handler.

## Scheduled jobs

| Job | Cadence | Purpose |
|---|---|---|
| `outbox.relay` | 250 ms | the relay loop |
| `outbox.sweep` | 1 min | reclaim stale `claimed_at` |
| `credentials.refresh` | 5 min | refresh tokens where `refresh_after <= now()` |
| `domains.verify` | 1 h | re-check SPF/DKIM/DMARC; deactivate channels that regress |
| `conversations.unsnooze` | 1 min | `snoozed_until <= now()` → open |
| `usage.rollup` | 5 min | `usage_events` → `usage_counters` reconciliation |
| `deliverability.audit` | 1 h | per-org bounce/complaint rates; auto-suspend over threshold |
| `sessions.prune` | 1 h | delete expired sessions |
| `provider_events.retry` | 5 min | re-drive `status='failed'` with attempts < max |
| `data.purge` | daily | orgs past `purge_after`; cascade to object storage |
| `backup.verify` | daily | assert last night's dump exists, is non-trivial in size, and restores |

Use BullMQ repeatable jobs with a fixed `jobId` so N worker replicas don't each schedule their own copy.

## Dead letters

Exhausted jobs are written to the **Postgres `dead_letters` table**, not left in Redis. Redis is treated as
disposable (`02-system.md`), so a failed job that only exists in Redis is a failed job you will lose. The
table is queryable, joinable to the org, and re-drivable from an admin endpoint. Alert on
`count(dead_letters WHERE resolved_at IS NULL) > 0` — a dead letter is always a bug or an incident.

## Worker shutdown

```
SIGTERM → stop accepting new jobs → wait for in-flight (up to 30 s, under Docker's grace period)
        → close BullMQ, Redis, and the pg pool → exit 0
```

Without this, a deploy kills jobs mid-flight and you rely on retries to paper over it — which works only
because everything is idempotent, which is exactly why everything must be idempotent.
