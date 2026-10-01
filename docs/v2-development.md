# MailDesk v2: local development

> v2 is a work in progress and is not the deployed app. For the live v1 app, see the [README](../README.md).

The MailDesk v2 stack is built as a monorepo with npm workspaces and Turborepo. This is a walking skeleton implementation that provides the foundation for the multi-tenant platform.

## Prerequisites

- Node.js 22
- Docker and Docker Compose
- npm 10.x

## Local Development

1. **Start the development stack:**
```bash
docker compose -f docker-compose.dev.yml up
```

This brings up:
- PostgreSQL 17
- Redis 7
- MinIO (S3-compatible object storage)
- Mailpit (email testing)
- Fastify API (port 4000)
- BullMQ Worker
- Next.js Web App (port 3000)
- Bull Board (queue monitoring, port 3001)

2. **Run database migrations:**
```bash
npm run db:migrate
```

3. **Seed the database:**
```bash
npm run db:seed
```

4. **Run tests:**
```bash
npm run test              # Unit tests
npm run test:integration  # Integration tests
```

5. **Type checking and linting:**
```bash
npm run typecheck
npm run lint
```

## Services

- **API:** http://localhost:4000
  - Health check: `GET /healthz`
  - Readiness check: `GET /readyz`
  - Metrics: `GET /metrics`
  - Dev noop job: `POST /_dev/noop` (dev only)

- **Web:** http://localhost:3000
- **Bull Board:** http://localhost:3001
- **Mailpit:** http://localhost:8025

## Architecture

- **Monorepo:** npm workspaces + Turborepo
- **API:** Fastify 5 with TypeScript
- **Worker:** BullMQ on Redis
- **Database:** PostgreSQL with Drizzle ORM
- **Observability:** pino logging, prom-client metrics
- **Testing:** Vitest with Testcontainers

See `docs/architecture/` for detailed architecture documentation.
