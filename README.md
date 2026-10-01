<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="files/maildesk-logo-dark.svg">
    <img src="files/maildesk-logo-light.svg" alt="MailDesk" height="48">
  </picture>
</p>

# MailDesk

A no-code email platform on top of [Resend](https://resend.com). Connect your own Resend account, then send and receive email from a Gmail-style dashboard, with no code and no API calls.

**Live:** https://inbound.tably.site

> **Status:** the app described here (v1) is what runs in production. A v2 platform rebuild is in progress and is **not deployed yet**. See [Roadmap](#roadmap).

## What it does

- **Connect Resend** with your own API key (stored encrypted, never sent back to the browser)
- **Per-domain keys:** assign a key to a specific sending domain, or leave it account-wide
- **Compose and send** from your verified domains
- **Inbox:** receive email at generated inbound addresses via Resend webhooks, with read/unread state
- **Sent history** with delivery status
- **Accounts:** email + password sign-up; every query is scoped to the signed-in user

## Stack (v1, what's deployed)

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| API | Next.js route handlers |
| Auth | NextAuth.js v4 (credentials provider, JWT sessions), bcrypt |
| Database | PostgreSQL on Supabase, Prisma 5 |
| Email | Resend: outbound API and inbound webhooks (Svix signature verification) |
| Validation | Zod |
| Hosting | Vercel |

## Security

- Resend API keys are encrypted at rest with **AES-256-GCM**. The key is derived from `ENCRYPTION_KEY` with PBKDF2 (100k iterations, SHA-256), with a random salt and IV per value.
- Passwords are hashed with bcrypt.
- Inbound webhooks are verified against `RESEND_WEBHOOK_SECRET` before anything is stored.
- Database queries are scoped to the authenticated user.
- Sending is rate limited to 10 emails per minute per user. This is an in-memory limiter, so on serverless it is best-effort per instance. Moving it to a shared store such as Redis is on the roadmap.

## Engineering notes

**Prisma on a serverless Postgres pooler.** The app runs on Vercel lambdas, so connections go through Supabase's transaction pooler (PgBouncer, port `6543`). Prisma uses named prepared statements, and in transaction mode two requests can collide on the same name, which surfaces as an intermittent `prepared statement "s0" already exists` error: a page that loads on one click and fails on the next. The fix is to tell Prisma a pooler is in the middle:

```
DATABASE_URL = ...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=3
DIRECT_URL   = ...pooler.supabase.com:5432/postgres
```

`DATABASE_URL` serves runtime queries. `DIRECT_URL` (session mode) is used for migrations, which need a real session. See `prisma.config.ts`.

## Getting started

Requires Node.js 22 and a PostgreSQL database (a local one, or a free Supabase project).

```bash
npm ci
cp .env.example .env      # then fill in the values below
npx prisma migrate dev
npx prisma generate
npm run dev:legacy
```

Open http://localhost:3000. Note: this is the v1 app, so use `dev:legacy`. Plain `npm run dev` starts the v2 workspace via Turborepo.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Runtime database URL. On Supabase use the **transaction pooler** (`:6543`) with `?pgbouncer=true&connection_limit=3`. Locally, a plain Postgres URL is fine. |
| `DIRECT_URL` | Used for migrations. Supabase session pooler / direct connection (`:5432`). Optional locally. |
| `AUTH_SECRET` | Session signing secret (`openssl rand -base64 32`) |
| `ENCRYPTION_KEY` | Key material for encrypting users' Resend API keys (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | Public base URL, e.g. `http://localhost:3000` |
| `RESEND_API_KEY` | **MailDesk's own** Resend key, used for inbound email. Separate from users' encrypted keys used for outbound sending. |
| `RESEND_WEBHOOK_SECRET` | Signing secret from the Resend webhook (`whsec_...`) |
| `MAILDESK_INBOUND_DOMAIN` | Domain used to generate inbound addresses |

### Testing inbound email locally

Resend has to reach your machine to deliver webhooks, so expose the dev server:

```bash
ngrok http 3000
# or
cloudflared tunnel --url http://localhost:3000
```

1. In [Resend Webhooks](https://resend.com/webhooks), add `https://<your-tunnel>/api/webhooks/resend` and select the `email.received` event.
2. Copy the signing secret into `RESEND_WEBHOOK_SECRET`.
3. Sign up at `/signup`. The response includes your inbound address (for example `username-abc123@your-domain.resend.app`).
4. Send an email to that address from any external account.
5. It should appear at `/dashboard/inbox`. Opening it marks it as read.

## Deployment

Deployed on Vercel (`vercel.json`: `prisma generate && npm run build:legacy`). Set all environment variables above in the project settings. After changing them, **redeploy**, because a running deployment keeps the values it was built with.

Database migrations are **not** run automatically on deploy. Apply them yourself against `DIRECT_URL`:

```bash
npx prisma migrate deploy
```

## Roadmap

A v2 rebuild is underway as a Turborepo monorepo: a Fastify API, a BullMQ worker on Redis, PostgreSQL with Drizzle, and structured logging and metrics. It is a walking skeleton today and is not part of the deployed app. The goals are multi-tenant isolation, queued sending with retries, and a shared rate limiter.

- Local setup for v2: [`docs/v2-development.md`](docs/v2-development.md)
- Design docs: [`docs/architecture/`](docs/architecture/)

## License

MIT. See [LICENSE](LICENSE).
