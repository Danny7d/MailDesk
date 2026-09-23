# 08 — Deployment Architecture

> Section J. One VPS, Docker Compose, nginx. Kubernetes is explicitly premature.

## Local development

`docker compose -f infra/compose/docker-compose.dev.yml up` gives:

| Service | Port | Purpose |
|---|---|---|
| `postgres:17` | 5432 | volume-mounted; `pg_stat_statements` enabled |
| `redis:7` | 6379 | `appendonly yes` |
| `minio` | 9000/9001 | S3-compatible; console for inspection |
| `mailpit` | 1025/8025 | SMTP sink + web UI — transactional email testable offline |
| `api` | 4000 | `tsx watch`, source bind-mounted |
| `worker` | — | `tsx watch` |
| `web` | 3000 | `next dev` |
| `bull-board` | 4100 | queue inspection UI |

Local secrets in `.env` from a committed **`.env.example`** — which requires fixing `.gitignore`, since
`.env*` currently makes the example file uncommittable:

```gitignore
.env
.env.*
!.env.example
```

`npm run db:migrate` · `npm run db:seed` (two orgs, several users per role, fixture conversations across
channels — the seed is what makes cross-tenant testing possible by hand) · `npm run db:studio` (or `psql`).

**Webhooks locally**: `cloudflared tunnel --url http://localhost:4000`. Better: a
`scripts/replay-webhook.ts` that POSTs a recorded fixture with a correctly-computed signature, so provider
event handling is testable with no internet at all. Build that early; you will use it hundreds of times.

## Production topology

One VPS (Hetzner CX-class or equivalent, 4 vCPU / 8 GB to start), Ubuntu LTS, Docker + Compose.

```
Cloudflare (DNS, TLS edge, WAF, MX → Resend)
  └── VPS :443 ── nginx ──┬── web:3000
                          ├── api:4000
                          └── api:4000 (SSE location, buffering off)
      private docker network (no published ports):
        postgres  redis  api  worker×2  web
      external: Cloudflare R2, Resend, Stripe, Anthropic
```

Host baseline: `ufw` allowing only 22/80/443; SSH key-only, root login disabled; `fail2ban`;
unattended-upgrades; a non-root deploy user in the `docker` group; Docker daemon not exposed.

### nginx essentials

```nginx
server {
  listen 443 ssl http2;
  server_name app.maildesk.example;
  ssl_certificate     /etc/letsencrypt/live/app.maildesk.example/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/app.maildesk.example/privkey.pem;

  add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
  client_max_body_size 25m;                       # attachment uploads

  location /v1/orgs/ { }                          # (inherits the api proxy below)

  location ~ ^/v1/orgs/[^/]+/events$ {            # ── SSE: must not buffer ──
    proxy_pass http://api:4000;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
  }

  location ~ ^/(v1|webhooks|healthz|readyz)/? {
    proxy_pass http://api:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-Id $request_id;    # nginx generates it; the API adopts it
  }

  location / { proxy_pass http://web:3000; /* same headers */ }
}
```

Three things that bite: **SSE without `proxy_buffering off` silently doesn't work** (frames sit in the
buffer); `client_max_body_size` defaults to 1 MB and rejects uploads with a bare 413; and behind Cloudflare
you must use `set_real_ip_from` with Cloudflare's ranges plus `CF-Connecting-IP`, or every rate limit sees
Cloudflare's IP and one abusive client rate-limits everyone.

**Serve attachments from a separate hostname** (`files.maildesk.example`) — a separate origin, per
`07-security.md`.

### TLS and DNS

certbot with the webroot or DNS-01 challenge; auto-renew via systemd timer; **test the renewal** with
`--dry-run`, because an expired certificate is the most common self-inflicted outage. Cloudflare proxy on with
SSL mode **Full (strict)** so the edge validates your origin certificate.

DNS records: `A app` → VPS · `A files` → VPS · `MX` → Resend inbound · `TXT` SPF · `CNAME/TXT` DKIM ·
`TXT _dmarc` (start `p=none` with `rua=` reporting, move to `quarantine` then `reject` once reports are clean).
Keep TTLs low (300s) before any migration.

### Secrets

Production `.env` on the host, `chmod 600`, owned by the deploy user, referenced via Compose `env_file`. Never
baked into an image (a layer is readable by anyone who can pull it), never in `docker-compose.yml`, never in
CI logs. Commit an age/sops-encrypted copy so the config is versioned and recoverable. Rotation runbook per
secret, and `credentials.key_version` makes the encryption key rotatable without downtime.

### Migrations

Run as a **one-shot container before the app rolls**, never on application boot (N replicas booting means N
concurrent migrations racing):

```
docker compose run --rm --entrypoint "npm run db:migrate" api
docker compose up -d --no-deps api worker web
```

**Expand/contract, always** — during a deploy both the old and new code run against one schema:
1. Deploy the additive change (new nullable column / new table). Old code ignores it.
2. Deploy code that writes both and reads the new.
3. Backfill in batches (never one `UPDATE` over a large table — it locks and bloats).
4. Deploy code that reads only the new.
5. Only then drop the old column, in a later release.

Never rename in one step. Never add a `NOT NULL` column without a default in one step. Always set a short
`lock_timeout` and `statement_timeout` for migrations so a blocked DDL fails fast instead of queueing every
query behind it.

### Backups — the section that actually matters

```
nightly  pg_dump -Fc            → encrypt (age) → R2, 30-day retention
         WAL archiving (archive_command → R2) for point-in-time recovery
         object store: R2 versioning + lifecycle rules
weekly   RESTORE DRILL: pull last night's dump into a throwaway container,
         run migrations, run the smoke suite, record the wall-clock time
```

**An untested backup is a belief, not a capability.** The deployment milestone is not done until a full
restore has been performed from scratch and the RTO recorded. Document RPO (≤24 h with dumps alone, ≤5 min
with WAL) and RTO (measure it) — and if those numbers are unacceptable for a business with paying customers,
that is the signal to move to managed Postgres, which is the correct choice for production and always was.

### CI/CD (GitHub Actions)

```
on PR:    typecheck · lint · unit tests · integration tests (postgres+redis service containers)
          · migration up/down check · npm audit · build both images
on main:  the above → push to GHCR (tagged with the commit sha)
          → SSH deploy: pull, migrate (one-shot), roll api/worker/web
          → smoke test against /readyz and one authenticated round-trip
          → on failure: roll back to the previous image tag (keep the last 5)
```

Tag images by commit SHA, never `latest` — `latest` makes rollback ambiguous and makes "what is actually
running" unanswerable. Store the SSH key and registry token as repository secrets; never echo them.

### Observability

- **Logs**: `pino` → JSON on stdout → Docker json-file driver with rotation limits → Promtail → Loki, viewed
  in Grafana. Every line carries `request_id`, `org_id`, `user_id`, `route`, `duration_ms`. Propagate
  `request_id` through `AsyncLocalStorage` into queue job payloads so an inbound webhook and the job it
  spawned share one trace id — that single detail makes async debugging tractable.
- **Metrics**: `prom-client` → Prometheus → Grafana. HTTP rate/latency/errors by route; queue depth, job
  duration, failure rate per queue; DB pool utilization and slow queries; SSE connection gauge; provider call
  latency and error rate per provider; business counters (messages in/out per channel).
- **Errors**: Sentry (SaaS free tier — this is a case where managed is plainly correct), with `request_id`
  and `org_id` tagged and PII scrubbed.
- **Health**: `/healthz` process-only; `/readyz` checks Postgres + Redis. Never conflate them.
- **Alerts** (route to somewhere you actually look): `readyz` failing, any unresolved `dead_letters`,
  `provider_events` pending > 100 or older than 5 min, queue depth > 1000, error rate > 1%, disk > 80%,
  certificate expiring < 14 days, backup job not completed in 26 h, org bounce rate over threshold.
- **Tracing**: OpenTelemetry, deferred to M14. Structured logs with a shared request id get you most of the
  way for a single-service system.

### When to scale (and what to do)

| Signal | Action |
|---|---|
| CPU-bound API | more `api` replicas behind nginx `upstream` |
| Queue backlog | more `worker` replicas (they need no coordination) |
| DB connections exhausted | PgBouncer in transaction mode — compatible with `SET LOCAL`, not with session `SET` |
| Read-heavy reporting | a streaming replica for analytics reads |
| Disk pressure | move attachments off-host (already are), then partition `messages` by month |
| Genuinely multi-node | *then* consider an orchestrator. Not before. |

Vertical scaling first. A single 8-core VPS handles a very large amount of this workload, and every horizontal
step adds a coordination problem you must then understand.
