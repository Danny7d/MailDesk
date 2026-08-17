# MailDesk

A no-code email sending SaaS that allows users to send transactional emails through their Resend account without writing code.

## Features

- Connect your Resend API key securely
- Compose and send emails from verified domains
- View email sending history
- Receive emails via inbound email addresses
- AES-256-GCM encryption for API keys
- User isolation and authentication

## Tech Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL) with Prisma ORM
- **Auth:** NextAuth.js v5
- **Email:** Resend API
- **Validation:** Zod

## Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
DATABASE_URL="postgresql://postgres:password@project-ref.supabase.co:5432/postgres"
AUTH_SECRET="your-auth-secret"
ENCRYPTION_KEY="your-encryption-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
RESEND_API_KEY="re_xxxxxxxxx"
RESEND_WEBHOOK_SECRET="whsec_xxxxxxxxx"
MAILDESK_INBOUND_DOMAIN="your-inbound-domain.com"
```

Generate secrets:
```bash
openssl rand -base64 32  # For AUTH_SECRET
openssl rand -base64 32  # For ENCRYPTION_KEY
```

**Note:** `RESEND_API_KEY` is MailDesk's own Resend API key for inbound email receiving. This is separate from users' encrypted API keys used for outbound sending.

3. **Run database migrations:**
```bash
npx prisma migrate dev
npx prisma generate
```

4. **Start development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Production

```bash
npm run build
npm start
```

**Important:** Use a managed PostgreSQL service (Supabase, Neon, RDS) and set all environment variables in production.

## Local Inbound Email Testing

To test inbound email functionality locally, you need to expose your development server to the public internet so Resend can send webhooks to it.

### 1. Expose localhost with a tunnel

**Using ngrok:**
```bash
ngrok http 3000
```

**Using Cloudflare Tunnel:**
```bash
cloudflared tunnel --url http://localhost:3000
```

Note the public URL (e.g., `https://abc123.ngrok.io`).

### 2. Configure Resend webhook

1. Go to [Resend Webhooks](https://resend.com/webhooks)
2. Click "Add Webhook"
3. Enter your webhook URL: `https://your-tunnel-url.com/api/webhooks/resend`
4. Select event type: `email.received`
5. Copy the `RESEND_WEBHOOK_SECRET` from the webhook details page
6. Add the secret to your `.env` file

### 3. Required environment variables

Ensure these are set in your `.env`:
```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="your-auth-secret"
ENCRYPTION_KEY="your-encryption-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
RESEND_API_KEY="re_xxxxxxxxx"  # MailDesk's Resend API key
RESEND_WEBHOOK_SECRET="whsec_xxxxxxxxx"  # From webhook setup
MAILDESK_INBOUND_DOMAIN="your-resend-domain.resend.app"
```

### 4. Create a test user

1. Start the dev server: `npm run dev`
2. Sign up at http://localhost:3000/signup
3. The signup response includes your generated inbound address (e.g., `username-abc123@your-domain.resend.app`)
4. Note this address for testing

### 5. Send a test email

From any external email account (Gmail, Outlook, etc.), send an email to your generated inbound address.

### 6. Verify the email

1. Check the Resend webhook logs to confirm delivery
2. Go to http://localhost:3000/dashboard/inbox
3. The email should appear in your inbox
4. Click to view the email (it will be marked as read)

### 7. Verify database

Check PostgreSQL to confirm the email was stored:
```sql
SELECT * FROM "IncomingEmail" WHERE "userId" = 'your-user-id';
```

## Security

- API keys encrypted with AES-256-GCM at rest
- Never exposed to client or logs
- User-scoped database queries
- Rate limiting (10 emails/minute per user)

## License

MIT
