# Setup Skill

## Description

How to set up the accounts.yaotoshi.xyz project for local development.

## Prerequisites

- Docker and Docker Compose
- Node.js 22+
- pnpm 10+

## Steps

### 1. Clone and Install Dependencies

```bash
cd /root/workspace/accounts
pnpm install
```

### 2. Start Services

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port 5435 (mapped from container 5432)
- **API** on port 3000 (with hot reload)
- **MailHog** on port 8025 (email UI) and 1025 (SMTP)

The API container automatically runs `prisma migrate deploy`, `prisma generate`, and starts in watch mode.

### 3. Verify

```bash
# Check services are running
docker compose ps

# Check API health
curl http://localhost:3000/health
# Expected: { "status": "ok", "timestamp": "..." }

# Check database connectivity
curl http://localhost:3000/ready
# Expected: { "status": "ready", "database": "connected" }
```

### 4. Seed Data (if needed manually)

The seed runs automatically on first boot, but you can re-run it:

```bash
docker compose exec api pnpm prisma db seed
```

### 5. Default Credentials

| Resource | Value |
|----------|-------|
| Admin email | `admin@yaotoshi.xyz` |
| Admin password | `admin12345678` |
| Invite code | `YAOTOSHI1` |
| Demo client | Configured for `localhost:3002` |

### 6. Database Access

```bash
# Prisma Studio (visual database browser)
docker compose exec api pnpm prisma studio

# Direct psql access
docker compose exec postgres psql -U accounts accounts_db
```

### 7. Common Development Commands

```bash
# View API logs
docker compose logs -f api

# Restart API only
docker compose restart api

# Run a new migration
docker compose exec api npx prisma migrate dev --name <name>

# Stop everything
docker compose down

# Stop and remove volumes (full reset)
docker compose down -v
```

## Troubleshooting

- **Port conflict on 5435:** Another PostgreSQL instance may be running. Stop it or change the port in `docker-compose.yml`.
- **API fails to start:** Check logs with `docker compose logs api`. Usually a migration issue or missing env var.
- **Prisma client out of date:** Run `docker compose exec api pnpm prisma generate` to regenerate.
