# 05 — Integration Architecture

> Section G. How providers plug in, and how their events become one internal model.

## The decision you must make first

**The BYO-API-key model and the SaaS billing model are incompatible.** Today a customer pastes their own
Resend key and MailDesk relays through it. That means MailDesk cannot meter messages, cannot enforce
`monthly_messages`, cannot control deliverability, cannot maintain a suppression list that the provider
respects, and cannot promise an SLA. Your §10 entitlement list and your §6 provider list contradict each
other.

**Recommendation: platform-managed sending is the default and the billable path.** MailDesk holds the provider
account; each org verifies its own domains through MailDesk (MailDesk creates the domain in its provider
account and shows the org the DNS records to add). BYO-key survives as an optional advanced mode for orgs that
want their own reputation and their own bill — modelled as just another `credentials` row, so it costs nothing
architecturally.

Consequences you are accepting: MailDesk owns sending reputation (so suppression and abuse controls become
mandatory, not optional), MailDesk pays for volume (so the cost model must precede the pricing page), and
MailDesk must verify domain ownership before first send (or it becomes an open relay for spoofing).

## Ports

`packages/core` defines the interfaces. `packages/providers` implements them. Core never imports a provider.

```ts
// ─── inbound ────────────────────────────────────────────────────────
interface InboundAdapter {
  readonly provider: ProviderId;

  /** Verify authenticity from the RAW request. Must be constant-time. Must not parse first. */
  verify(req: RawWebhookRequest): Promise<VerificationResult>;

  /** Stable provider-side event id for deduplication. */
  extractEventId(payload: unknown): string | null;

  /** Which channel does this belong to? Returns a global lookup key, not an org. */
  extractRoutingKey(payload: unknown): RoutingKey | null;

  /** Provider payload → zero or more normalized events. Pure. No I/O. */
  parse(payload: unknown, ctx: ParseContext): Promise<NormalizedEvent[]>;
}

// ─── outbound ───────────────────────────────────────────────────────
interface OutboundTransport {
  readonly provider: ProviderId;
  capabilities(channel: Channel): ChannelCapabilities;

  /** Provider-side validation before we even try (fail fast, don't burn a retry). */
  validate(msg: NormalizedOutboundMessage, cap: ChannelCapabilities): ValidationResult;

  send(msg: NormalizedOutboundMessage, creds: DecryptedCredentials): Promise<SendReceipt>;
}

// ─── credentials ────────────────────────────────────────────────────
interface CredentialManager {
  needsRefresh(c: CredentialRecord): boolean;
  refresh(c: CredentialRecord): Promise<RefreshedCredential>;
  revoke(c: CredentialRecord): Promise<void>;
}

// ─── errors: every adapter maps provider failures into THESE ────────
type ProviderError =
  | { kind: 'retryable';     retryAfterMs?: number; cause: string }   // 5xx, 429, timeout, network
  | { kind: 'terminal';      code: string; cause: string }            // invalid recipient, too large
  | { kind: 'auth';          cause: string }                          // token expired/revoked
  | { kind: 'rate_limited';  retryAfterMs: number }
  | { kind: 'suppressed';    cause: string };                         // provider refuses this recipient
```

That error taxonomy is the most load-bearing type in the integration layer. The retry logic reads only these
five kinds and never provider-specific status codes — so adding a provider cannot introduce a new retry bug.

## The normalized model: intersection + escape hatch

**Rule: the core model carries the *intersection* of provider semantics. It does not carry the union.**
Trying to express every provider's features in shared columns produces a 90-column god-table that is wrong for
every provider. Provider-specific fields go in `messages.provider_metadata` (JSONB), read only by the adapter
that wrote them.

The frontend then needs to know what a channel *can* do. That's the capability descriptor:

```ts
interface ChannelCapabilities {
  supportsSubject: boolean;          // email yes, Telegram/IG no
  supportsThreading: boolean;
  supportsRichText: 'html' | 'markdown' | 'plain';
  supportsAttachments: boolean;
  maxAttachmentBytes: number;
  maxAttachmentsPerMessage: number;
  maxBodyBytes: number;
  supportsCcBcc: boolean;            // email only
  canEditSentMessage: boolean;       // Telegram yes, email absolutely not
  canDeleteSentMessage: boolean;
  supportsReadReceipts: boolean;     // Meta yes, email no
  supportsTypingIndicator: boolean;
  supportsReactions: boolean;
  replyWindow: { hours: number; extendable: boolean } | null;   // Meta 24h, Telegram none
  requiresContactInitiation: boolean;  // Meta: you may not cold-DM. Email: you may.
  deliveryEvents: MessageStatus[];     // which statuses this channel will ever report
}
```

One UI serves every channel by reading capabilities: hide the subject field when `!supportsSubject`, disable
the composer with an explanation when the reply window has closed, cap the file picker at
`maxAttachmentBytes`. **This is the single design decision that makes "add a provider without rewriting the
app" actually true.** Without it, every provider difference becomes an `if (channel.type === 'telegram')` in
the frontend and the abstraction is fiction.

## Conversation threading — per provider

| Provider | `provider_thread_key` | Reliability |
|---|---|---|
| Telegram | `tg:{bot_id}:{chat_id}` | Exact. The chat *is* the conversation. |
| Messenger | `fb:{page_id}:{psid}` | Exact. |
| Instagram | `ig:{ig_account_id}:{igsid}` | Exact. |
| Email | derived — see below | **Heuristic. This is the hard one.** |

Email threading, in order; first match wins:

1. **Our own token.** Outbound messages carry a `Message-ID` we generate as
   `<{conversation_id}.{message_id}@{sending_domain}>`. When a reply's `In-Reply-To` or `References` contains
   one of ours, the conversation is known with certainty. Set this from day one — it converts most of the
   problem into a lookup.
2. **`In-Reply-To` / `References` chain** → `message_identifiers` lookup for any known id.
3. **Heuristic fallback**: same channel + same participant set + normalized subject (strip `Re:`/`Fwd:`,
   collapse whitespace, lowercase) + within 30 days.
4. **New conversation.**

Do *not* thread on subject alone. Two customers both writing "Invoice question" are not one conversation, and
merging them shows customer A's messages to customer B. When in doubt, **create a new conversation** — a split
thread is a cosmetic annoyance, a merged thread is a data breach.

## Per-provider notes

### Resend (email) — first provider
- Inbound: MX → Resend, `email.received` webhook. Signature via Svix headers (`svix-id`,
  `svix-timestamp`, `svix-signature`) over the raw body — the existing code does this correctly.
- Fetching the full body requires a second API call: **that belongs in the worker**, never the handler.
- Delivery events: `email.sent`, `.delivered`, `.delivery_delayed`, `.bounced`, `.complained`, `.opened`,
  `.clicked`. Match to a message by `provider_message_id`. `bounced` (hard) and `complained` **must** write
  `suppressions` in the same transaction.
- Domain setup: SPF (`include:`), DKIM (CNAME/TXT selector), and a DMARC policy record. MailDesk shows the
  records, a cron re-checks with a DNS resolver, and `channels.is_active` follows verification.
- **Email-specific work that will surprise you**: MIME multipart walking, quoted-printable and base64
  decoding, charset detection and transcoding to UTF-8, inline `cid:` image rewriting, reply-quote and
  signature stripping for the preview, DSN/bounce-body parsing for soft-bounce reasons, and **loop
  prevention** — never auto-reply to anything carrying `Auto-Submitted: auto-*`, `Precedence: bulk|list|junk`,
  or `List-Id`. Use `mailparser` rather than writing a MIME parser.

### Telegram — second provider, and the falsification test
Telegram is the right second integration precisely because it is *nothing like email*: no subject, no MIME,
exact threading, editable messages, instant delivery. If the abstraction survives Telegram, it is real. If
adding Telegram requires changing `packages/core`, the abstraction was Resend-shaped and you learned it for
the price of one small integration rather than five large ones.

- Auth: bot token from BotFather, stored as a `credentials` row.
- `setWebhook` with a **secret path segment** *and* `secret_token` (arrives as
  `X-Telegram-Bot-Api-Secret-Token`) — Telegram does not sign payloads, so the URL secret and the header
  token are the whole authentication story. Additionally allowlist Telegram's published CIDR ranges at nginx.
- Media arrives as a `file_id`; the worker calls `getFile` then downloads. Bot API caps downloads (~20 MB) —
  surface that in `maxAttachmentBytes`, don't discover it in production.
- Long-polling is the fallback for local dev where no public URL exists.

### Meta (Messenger / Instagram) — last, and externally gated
- **Blocked on external process**: Meta App Review + Business Verification, `pages_messaging` permission,
  and for Instagram a Professional account linked to a Facebook Page. Multi-week, not schedulable by you.
  Build the adapter against recorded fixtures; ship when approved. *Verify current requirements before
  starting — Meta changes them.*
- `GET /webhooks/meta` handshake echoing `hub.challenge`; `POST` verified by
  `X-Hub-Signature-256` = HMAC-SHA256 of the raw body with the app secret.
- **A single webhook delivery batches events for many pages, i.e. many orgs.** Fan out per entry and resolve
  the org per entry. Getting this wrong is a cross-tenant bug.
- **24-hour messaging window.** Outside it, only approved message tags (e.g. human agent, which extends to
  7 days). Model as `conversations.reply_window_expires_at` and block the composer with an explanation.
- Tokens: short-lived user token → long-lived page token. `refresh_after` + a cron; a revoked token must
  degrade the integration to `error` and notify admins, not silently stop working.

### Google — authentication only for v1
- OIDC via `arctic`. **Require `email_verified === true` in the ID token before linking to an existing
  account** — without it, an attacker creates an unverified Google account bearing your victim's address and
  takes over by linking.
- Gmail as a *channel* is a separate project: restricted scopes require an annual third-party CASA security
  assessment with real cost and lead time. Deliberately deferred; verify current requirements before planning.

### Stripe — an integration like any other
Same ingestion pipeline: verify signature over the raw body, persist to `provider_events`, return 200, process
in the worker. Do not special-case it; the uniformity is the point.

## Adding a provider: the checklist

The abstraction is only real if this list is sufficient. If a new provider requires edits outside it, the
abstraction leaked and should be fixed rather than worked around.

1. `packages/providers/{name}/` implementing `InboundAdapter` + `OutboundTransport` (+ `CredentialManager`).
2. A `capabilities()` descriptor.
3. Add the id to the `provider` and `channel type` CHECK constraints (one migration).
4. Register in the adapter registry.
5. Recorded-fixture tests: one per event type, asserting the `NormalizedEvent` output.
6. Idempotency test: feed the same fixture twice, assert one message row.
7. Out-of-order test: feed delivery events in reverse, assert the projected status is correct.
8. A route entry `POST /webhooks/{name}`.
9. Docs: setup steps, required scopes, rate limits, known quirks.

**Zero changes to `packages/core`, the database schema (beyond the CHECK), the API surface, or the frontend.**
