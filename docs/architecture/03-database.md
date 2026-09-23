# 03 — Database Architecture

> Section E. Postgres 17+. `snake_case`, `timestamptz` always, UUIDv7 primary keys.

## Conventions

- **PKs: UUIDv7** (`uuid` type, 16 bytes, time-sortable → index locality). Generate in-app if PG < 18.
  Replaces the current `cuid()`-as-`text` keys: 25-byte text PKs with random distribution bloat every index.
- **`created_at` / `updated_at`** = MailDesk time. **`occurred_at`** = provider time. Never conflate them.
- **Soft delete** via `deleted_at` on user-facing entities. Every unique index on those tables must be
  partial: `WHERE deleted_at IS NULL` — otherwise a deleted record blocks re-creating its name.
- **Enums as `text` + `CHECK`**, not PG `enum` types. Adding a value to a PG enum can't be done in a
  transaction with other DDL in older versions and can't be removed at all.
- **`org_id` on every tenant table**, even when reachable via a join. Denormalized on purpose: it is what RLS
  policies and composite FKs key on.

## The tenancy trick that matters most

Do not rely on remembering `WHERE org_id = ?`. Make the wrong row **impossible to reference**:

```sql
-- conversations is unique on (org_id, id), so a composite FK can point at it
ALTER TABLE conversations ADD CONSTRAINT conversations_org_id_key UNIQUE (org_id, id);

ALTER TABLE messages
  ADD CONSTRAINT messages_conversation_fk
  FOREIGN KEY (org_id, conversation_id) REFERENCES conversations (org_id, id) ON DELETE CASCADE;
```

Now inserting a message with org A's `org_id` and org B's `conversation_id` is a **constraint violation**, not
a leak. Apply this pattern to every parent→child edge: `channels→conversations`, `conversations→messages`,
`messages→attachments`, `contacts→contact_identities`. This is schema-enforced multi-tenancy and it survives
every application bug.

## Core DDL (abridged to the decisions)

### Identity & tenancy

```sql
CREATE TABLE users (
  id                uuid PRIMARY KEY,
  email             citext NOT NULL,
  password_hash     text,                          -- NULL for OAuth-only accounts
  email_verified_at timestamptz,
  name              text,
  avatar_url        text,
  mfa_secret_ct     bytea, mfa_key_version int, mfa_enabled_at timestamptz,
  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','deleted')),
  last_login_at     timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);
CREATE UNIQUE INDEX users_email_uq ON users (email) WHERE deleted_at IS NULL;

CREATE TABLE organizations (
  id          uuid PRIMARY KEY,
  slug        citext NOT NULL,
  name        text NOT NULL,
  status      text NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','past_due','read_only','suspended','pending_deletion')),
  data_region text NOT NULL DEFAULT 'eu',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  purge_after timestamptz                          -- set on cancellation; a cron actually deletes
);
CREATE UNIQUE INDEX organizations_slug_uq ON organizations (slug) WHERE deleted_at IS NULL;

CREATE TABLE memberships (
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('owner','admin','agent','viewer')),
  invited_by uuid REFERENCES users(id),
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
CREATE INDEX memberships_user_idx ON memberships (user_id);
-- at least one owner must remain: enforced in the app inside a tx with SELECT … FOR UPDATE,
-- because a partial-count invariant can't be a CHECK constraint
```

`sessions`, `invitations`, `api_keys`, `password_reset_tokens`, `email_verification_tokens` — all store
**`token_hash` (sha256), never the token**, all have `expires_at`, all have `used_at`/`revoked_at`.

> **Roles are a fixed 4-role model, not a permission matrix.** `owner` (billing + delete org),
> `admin` (integrations + members), `agent` (send/assign), `viewer` (read). A full RBAC
> permission table is over-engineering until a customer asks for custom roles. Keep the *check*
> centralized (`can(ctx, 'message:send')`) so swapping the backing model later is one file.

### Integrations, channels, credentials

```sql
CREATE TABLE integrations (
  id                  uuid PRIMARY KEY,
  org_id              uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider            text NOT NULL CHECK (provider IN ('resend','telegram','meta_messenger',
                                                        'meta_instagram','internal')),
  external_account_id text,                        -- Resend team, Meta page, bot id
  status              text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','active','degraded','error','disabled')),
  config              jsonb NOT NULL DEFAULT '{}',
  last_error          text, last_health_check_at timestamptz,
  created_by          uuid REFERENCES users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  disabled_at         timestamptz,
  UNIQUE (org_id, id)
);
CREATE UNIQUE INDEX integrations_account_uq
  ON integrations (org_id, provider, external_account_id) WHERE disabled_at IS NULL;

CREATE TABLE credentials (
  id             uuid PRIMARY KEY,
  org_id         uuid NOT NULL,
  integration_id uuid NOT NULL,
  kind           text NOT NULL CHECK (kind IN ('api_key','oauth_access','oauth_refresh',
                                               'bot_token','webhook_secret','signing_secret')),
  ciphertext     bytea NOT NULL,
  nonce          bytea NOT NULL,
  key_version    int  NOT NULL,        -- ← rotation is impossible without this
  fingerprint    text,                 -- sha256 of plaintext: dedupe/compare without decrypting
  expires_at     timestamptz,
  refresh_after  timestamptz,          -- cron refreshes before expiry
  last_used_at   timestamptz,
  rotated_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, integration_id) REFERENCES integrations (org_id, id) ON DELETE CASCADE
);
CREATE INDEX credentials_refresh_idx ON credentials (refresh_after)
  WHERE refresh_after IS NOT NULL;

CREATE TABLE channels (
  id             uuid PRIMARY KEY,
  org_id         uuid NOT NULL,
  integration_id uuid NOT NULL,
  type           text NOT NULL CHECK (type IN ('email','telegram','messenger','instagram','internal')),
  address        text NOT NULL,                    -- support@acme.com | tg:bot:123 | fb:page:456
  display_name   text NOT NULL,
  direction      text NOT NULL DEFAULT 'both' CHECK (direction IN ('inbound','outbound','both')),
  capabilities   jsonb NOT NULL DEFAULT '{}',      -- see 05-integrations.md
  is_default     boolean NOT NULL DEFAULT false,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id, integration_id) REFERENCES integrations (org_id, id) ON DELETE CASCADE
);
-- Inbound routing needs a GLOBAL lookup (org unknown at webhook time):
CREATE UNIQUE INDEX channels_address_global_uq ON channels (type, lower(address))
  WHERE deleted_at IS NULL;
```

> That last index is the one people miss. At webhook time you have an address and no org. The
> address→channel map must be **globally unique** or routing is ambiguous, and ambiguous routing between
> tenants is the worst bug this system can have.

### Contacts & identity resolution

```sql
CREATE TABLE contacts (
  id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  display_name text, primary_email citext, company text, notes text,
  is_blocked boolean NOT NULL DEFAULT false,
  first_seen_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  UNIQUE (org_id, id)
);

CREATE TABLE contact_identities (
  id uuid PRIMARY KEY, org_id uuid NOT NULL, contact_id uuid NOT NULL,
  channel_type text NOT NULL,
  identity_value text NOT NULL,       -- NORMALIZED: lower(email) / tg user id / PSID / IGSID
  display_handle text, verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, contact_id) REFERENCES contacts (org_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX contact_identities_uq
  ON contact_identities (org_id, channel_type, identity_value);
```

One person = one `contact`, N `contact_identities`. **Never auto-merge across channel types** — an email
address and a Telegram handle looking similar is not proof. Merging is an explicit, audited, reversible user
action (keep a `contact_merges` table recording both sides).

### Conversations & messages

```sql
CREATE TABLE conversations (
  id uuid PRIMARY KEY, org_id uuid NOT NULL, channel_id uuid NOT NULL, contact_id uuid,
  provider_thread_key text NOT NULL,               -- see 05-integrations.md for derivation
  subject text,
  status text NOT NULL DEFAULT 'open'
         CHECK (status IN ('open','pending','snoozed','closed','spam','trash')),
  assignee_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_at timestamptz, snoozed_until timestamptz,
  priority smallint NOT NULL DEFAULT 0,
  -- denormalized for the inbox list; recomputed in the same tx as message writes
  last_message_at timestamptz, last_inbound_at timestamptz, last_outbound_at timestamptz,
  last_message_preview text, message_count int NOT NULL DEFAULT 0,
  unread_count int NOT NULL DEFAULT 0,
  first_response_at timestamptz, resolved_at timestamptz,
  reply_window_expires_at timestamptz,             -- Telegram/Meta policy windows
  version bigint NOT NULL DEFAULT 1,               -- optimistic concurrency + SSE cache-busting
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id, channel_id) REFERENCES channels (org_id, id),
  FOREIGN KEY (org_id, contact_id) REFERENCES contacts (org_id, id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX conversations_thread_uq
  ON conversations (org_id, channel_id, provider_thread_key) WHERE deleted_at IS NULL;

CREATE TABLE messages (
  id uuid PRIMARY KEY, org_id uuid NOT NULL, conversation_id uuid NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  author_type text NOT NULL CHECK (author_type IN ('contact','agent','system','bot','ai')),
  author_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  author_contact_id uuid,
  body_text text,
  body_html text,                                  -- SANITIZED at write time. Never raw.
  body_snippet text,
  status text NOT NULL, status_rank smallint NOT NULL DEFAULT 0, status_at timestamptz,
  failure_reason text,
  provider_message_id text,
  provider_metadata jsonb NOT NULL DEFAULT '{}',   -- the escape hatch. Read by adapters only.
  in_reply_to_message_id uuid,
  idempotency_key text,
  is_internal_note boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id, conversation_id) REFERENCES conversations (org_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX messages_provider_uq
  ON messages (org_id, conversation_id, provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE UNIQUE INDEX messages_idem_uq
  ON messages (org_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE message_status_events (          -- append-only; the source of truth for status
  id bigserial PRIMARY KEY, org_id uuid NOT NULL, message_id uuid NOT NULL,
  status text NOT NULL, status_rank smallint NOT NULL,
  provider_event_id text, detail jsonb,
  occurred_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, message_id) REFERENCES messages (org_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX msg_status_dedupe_uq ON message_status_events (org_id, message_id, status,
  coalesce(provider_event_id,''));

CREATE TABLE message_identifiers (            -- email threading lookup (Message-ID / References)
  org_id uuid NOT NULL, message_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('rfc822_message_id','rfc822_reference')),
  value text NOT NULL,
  PRIMARY KEY (org_id, kind, value),
  FOREIGN KEY (org_id, message_id) REFERENCES messages (org_id, id) ON DELETE CASCADE
);

CREATE TABLE conversation_participants (      -- email To/Cc/Bcc, group chat members
  org_id uuid NOT NULL, conversation_id uuid NOT NULL,
  contact_id uuid, user_id uuid,
  role text NOT NULL CHECK (role IN ('to','cc','bcc','from','watcher')),
  added_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, conversation_id) REFERENCES conversations (org_id, id) ON DELETE CASCADE,
  CHECK ((contact_id IS NULL) <> (user_id IS NULL))
);
```

Collaboration: `internal_notes` (or `messages.is_internal_note`), `tags` + `conversation_tags`,
`canned_replies`, `conversation_views` (who's looking, TTL in Redis rather than Postgres).

### Attachments

```sql
CREATE TABLE attachments (
  id uuid PRIMARY KEY, org_id uuid NOT NULL, message_id uuid,
  storage_bucket text NOT NULL, storage_key text NOT NULL,   -- org_{id}/yyyy/mm/{uuid}
  filename text NOT NULL,                    -- sanitized for DISPLAY only, never used in the key
  content_type_declared text,                -- what the client/provider claimed. Untrusted.
  content_type_sniffed  text,                -- magic bytes. This is what you serve.
  size_bytes bigint NOT NULL, checksum_sha256 text,
  is_inline boolean NOT NULL DEFAULT false, content_id text,   -- cid: for inline images
  scan_status text NOT NULL DEFAULT 'pending'
    CHECK (scan_status IN ('pending','clean','infected','skipped','error')),
  scan_result text, scanned_at timestamptz,
  upload_status text NOT NULL DEFAULT 'pending'
    CHECK (upload_status IN ('pending','stored','failed')),
  created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  FOREIGN KEY (org_id, message_id) REFERENCES messages (org_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX attachments_key_uq ON attachments (storage_bucket, storage_key);
```

Downloads are blocked unless `scan_status IN ('clean','skipped') AND upload_status = 'stored'`.

### Reliability tables

```sql
CREATE TABLE provider_events (
  id uuid PRIMARY KEY,
  provider text NOT NULL, provider_event_id text NOT NULL,
  event_type text,
  org_id uuid, channel_id uuid,                    -- NULL at ingest; filled by the worker
  payload jsonb NOT NULL,                          -- the RAW verified body. Never mutate.
  headers jsonb,
  signature_verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','processed','ignored','unrouted','failed')),
  attempts int NOT NULL DEFAULT 0, last_error text,
  received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz
);
CREATE UNIQUE INDEX provider_events_uq ON provider_events (provider, provider_event_id);
CREATE INDEX provider_events_pending_idx ON provider_events (received_at)
  WHERE status IN ('pending','processing');

CREATE TABLE outbox (
  id bigserial PRIMARY KEY, org_id uuid,
  topic text NOT NULL, payload jsonb NOT NULL,
  available_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz, claimed_by text, published_at timestamptz,
  attempts int NOT NULL DEFAULT 0, last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outbox_unpublished_idx ON outbox (available_at, id) WHERE published_at IS NULL;

CREATE TABLE dead_letters (
  id uuid PRIMARY KEY, org_id uuid, queue text NOT NULL, job_name text NOT NULL,
  payload jsonb NOT NULL, error text NOT NULL, stack text,
  attempts int NOT NULL, failed_at timestamptz NOT NULL DEFAULT now(),
  redriven_at timestamptz, resolved_at timestamptz, resolved_by uuid
);

CREATE TABLE suppressions (                  -- NOT OPTIONAL. Checked before every send.
  org_id uuid NOT NULL, channel_type text NOT NULL, identity_value text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('hard_bounce','complaint','manual','unsubscribe','blocked')),
  source text, expires_at timestamptz,       -- NULL = permanent
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, channel_type, identity_value)
);
-- plus a global_suppressions table with the same shape and no org_id: a complaint against one
-- tenant is still a signal for the platform's own sending reputation.

CREATE TABLE idempotency_keys (
  org_id uuid NOT NULL, key text NOT NULL,
  request_fingerprint text NOT NULL,         -- sha256(method+path+body): same key + different body = 409
  response_status int, response_body jsonb,
  state text NOT NULL DEFAULT 'in_progress' CHECK (state IN ('in_progress','completed')),
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  PRIMARY KEY (org_id, key)
);

CREATE TABLE audit_logs (                    -- append-only; no UPDATE, no DELETE grants
  id bigserial PRIMARY KEY, org_id uuid,
  actor_type text NOT NULL CHECK (actor_type IN ('user','api_key','system','provider')),
  actor_user_id uuid, actor_api_key_id uuid,
  action text NOT NULL,                      -- 'message.sent', 'integration.connected', …
  target_type text, target_id text,
  ip inet, user_agent text, request_id text,
  before jsonb, after jsonb, metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_org_time_idx ON audit_logs (org_id, created_at DESC);
```

### Billing

```sql
plans(id, code UNIQUE, name, is_public, stripe_product_id)
plan_prices(id, plan_id, stripe_price_id UNIQUE, interval, currency, amount_cents)
plan_entitlements(plan_id, key, limit_value, PRIMARY KEY (plan_id, key))
subscriptions(id, org_id, plan_id, stripe_customer_id, stripe_subscription_id UNIQUE,
              status, current_period_start, current_period_end, cancel_at, canceled_at, trial_end,
              grace_until)
  CREATE UNIQUE INDEX subscriptions_active_uq ON subscriptions (org_id)
    WHERE status IN ('trialing','active','past_due');   -- one live subscription per org
entitlement_overrides(org_id, key, limit_value, reason, expires_at, PRIMARY KEY (org_id, key))
org_entitlements(org_id, key, limit_value, source, PRIMARY KEY (org_id, key))  -- materialized
usage_counters(org_id, key, period_start, value, PRIMARY KEY (org_id, key, period_start))
usage_events(id, org_id, key, quantity, ref_type, ref_id, occurred_at,
             idempotency_key UNIQUE)         -- the audit trail behind the counter
```

Atomic quota consumption, inside the same transaction as the action:

```sql
INSERT INTO usage_counters (org_id, key, period_start, value)
VALUES ($1,$2,$3,$4)
ON CONFLICT (org_id, key, period_start) DO UPDATE SET value = usage_counters.value + $4
RETURNING value;                          -- compare to the limit; ROLLBACK if over
```

Correct under concurrency (the row lock serializes it) and cheap. Do **not** do `SELECT` then `UPDATE`.

## Indexes that carry the product

```sql
-- inbox list: the single hottest query in the app
CREATE INDEX conversations_inbox_idx
  ON conversations (org_id, status, last_message_at DESC) WHERE deleted_at IS NULL;
-- "assigned to me"
CREATE INDEX conversations_assignee_idx
  ON conversations (org_id, assignee_user_id, status, last_message_at DESC) WHERE deleted_at IS NULL;
-- thread view + cursor pagination
CREATE INDEX messages_thread_idx
  ON messages (org_id, conversation_id, occurred_at DESC, id DESC) WHERE deleted_at IS NULL;
-- outbound work discovery
CREATE INDEX messages_pending_idx ON messages (org_id, status)
  WHERE status IN ('queued','sending');
-- snooze / SLA sweeps
CREATE INDEX conversations_snoozed_idx ON conversations (snoozed_until)
  WHERE status = 'snoozed';

-- full-text search: generated column, no trigger to forget
ALTER TABLE messages ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(body_text,'') || ' ' || coalesce(body_snippet,''))
  ) STORED;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE INDEX messages_search_idx ON messages USING gin (org_id, search_vector);
```

`btree_gin` lets `org_id` lead the GIN index, so search is tenant-scoped *in the index* rather than
filtered after. Without it you scan other tenants' postings and discard them — slow, and a timing side channel.

## Row-Level Security

```sql
CREATE ROLE maildesk_app  LOGIN;   -- the API and worker connect as this. NOT the table owner.
CREATE ROLE maildesk_admin LOGIN;  -- migrations only
CREATE ROLE maildesk_system LOGIN BYPASSRLS;  -- cross-org jobs only, used deliberately

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE  ROW LEVEL SECURITY;   -- ← without FORCE the owner bypasses it
CREATE POLICY tenant_isolation ON conversations
  USING      (org_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
```

Repeat for every table carrying `org_id`. Two footguns to document loudly:

1. **`FORCE ROW LEVEL SECURITY` is required.** A table's owner bypasses RLS by default. If migrations and the
   app share a role, your policies do nothing and every test still passes.
2. **`SET LOCAL` must be inside an explicit transaction.** With a connection pool, a session-level `SET` leaks
   the previous request's org to the next request on that connection. `SET LOCAL` + explicit `BEGIN` is the
   only safe form. This is also what makes PgBouncer transaction-pooling mode compatible.

```ts
// packages/db — the ONLY way application code touches the database
export async function withOrg<T>(orgId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);
    return fn(tx);
  });
}
```

RLS is the **backstop**, not the primary control. Primary is a data-access layer where you cannot build a
query without a `TenantContext`. Belt and braces, because the failure mode is unbounded.

## Required tests (part of the Definition of Done for M2)

1. For **every** tenant table: insert as org A, set context to org B, assert `SELECT` returns 0 rows.
2. Assert cross-tenant composite-FK insert **fails** with a constraint violation.
3. Assert the app role cannot `SET app.current_org_id` to escape (it can — that's fine, it's set by trusted
   code — but assert that *without* it set, queries return 0 rows rather than everything).
4. Assert `maildesk_app` has no `BYPASSRLS` and is not the owner of any tenant table.
5. A generated test that enumerates `information_schema` and **fails if any table with an `org_id` column
   lacks an enabled+forced RLS policy.** This catches the table someone adds in six months and forgets.

Test 5 is the one that actually keeps the property true over time.
