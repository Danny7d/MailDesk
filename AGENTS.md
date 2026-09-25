# MailDesk agent instructions

This repository is the MailDesk monorepo. The active architecture is organized around npm workspaces and Turborepo, not a single legacy Next.js app.

## Repository layout

- `apps/api/` — Fastify API service
- `apps/worker/` — BullMQ worker
- `packages/contracts/` — shared contracts and schemas
- `packages/core/` — shared domain logic
- `packages/db/` — database layer and migrations
- `packages/observability/` — logging/metrics utilities
- `src/` — existing application code that may be legacy/transitional; do not assume it is the only app entry point

## Working rules

- Prefer repo-level commands for monorepo tasks unless a task is clearly scoped to one package.
- Use the workspace/package structure when editing or validating code.
- Keep changes consistent with the architecture described in `docs/architecture/` and the current package layout.
- Do not add generated boilerplate or tool-specific instruction blocks to this file.
- If you need to make a repo-level change, verify the actual structure before editing scripts, app entry points, or build configs.

## Common commands

- Install dependencies: `npm install`
- Start the local stack: `docker compose -f docker-compose.dev.yml up`
- Run migrations: `npm run db:migrate`
- Seed data: `npm run db:seed`
- Run tests: `npm test`
- Type-check the monorepo: `npm run typecheck`

## Important notes

- This file is intentionally project-specific. Do not replace it with generated framework instructions.
- Avoid assuming the root `src/app` directory is the whole product; the monorepo packages are the authoritative layout for app services.
