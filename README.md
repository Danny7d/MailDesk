# MailDesk

A no-code email sending SaaS that allows users to send transactional emails through their Resend account without writing code.

## Features

- Connect your Resend API key securely
- Compose and send emails from verified domains
- View email sending history
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
```

Generate secrets:
```bash
openssl rand -base64 32  # For AUTH_SECRET
openssl rand -base64 32  # For ENCRYPTION_KEY
```

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

## Security

- API keys encrypted with AES-256-GCM at rest
- Never exposed to client or logs
- User-scoped database queries
- Rate limiting (10 emails/minute per user)

## License

MIT
