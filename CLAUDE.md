# CLAUDE.md

This project is developed entirely using Claude Code.

## Project

Centralized auth service — invite-only registration, session-based auth, OAuth 2.0 + PKCE. NestJS 11 API + Next.js 14 frontend + PostgreSQL 16 + Prisma 6. Monorepo with pnpm.

## Key Rules

- Read existing code before writing. Follow established patterns.
- Never hardcode domains. Use env vars (`APP_DOMAIN`, `ISSUER_URL`, etc.).
- Admin endpoints: `@UseGuards(SessionGuard, AdminGuard)`.
- Auth error messages must be generic — never reveal if an account exists.
- Use `EmailService` for sending emails, never `console.log`.
- Use `$transaction` for operations that must be atomic.
- Use `class-validator` DTOs with `@IsString()`, `@MaxLength()`, etc. on all endpoints.
- Passwords: `MinLength(8)`, `MaxLength(128)`, check `isWeakPassword()` on signup/reset.

## Stack

```
apps/api/          NestJS backend (port 9998)
apps/web/          Next.js frontend (port 9999)
packages/auth-sdk/ @yaotoshi/auth-sdk (npm)
prisma/            Schema, migrations, seed
```

## Commands

```bash
docker compose up -d                              # start
docker compose exec api npx prisma db seed        # seed (first time)
docker compose exec api npx prisma migrate dev --name <name>  # new migration
```

## Env Vars (required, no defaults)

```
ADMIN_EMAIL, ADMIN_PASSWORD, SEED_INVITE_CODE
```

## Conventions

- Files: `kebab-case.ts`
- Classes: `PascalCase`
- DB columns: `snake_case` via `@map()`
- API paths: `kebab-case`
- Module structure: `module.ts`, `service.ts`, `controller.ts`, `dto.ts`

## Git Workflow

- Git Flow: `main` (production), `develop` (integration), `feature/*`, `release/*`, `hotfix/*`
- Conventional commits required (`feat:`, `fix:`, `docs:`, `chore:`, `ci:`, `refactor:`, `test:`, `perf:`)
- Never commit directly to `main` — only via `release/*` or `hotfix/*` merges
- Always use `--no-ff` on merges to preserve branch context
- Semantic versioning auto-determined from commit types

See [docs/development-rules.md](docs/development-rules.md) for full details.
