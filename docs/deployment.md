# Deployment

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql://accounts:accounts_secret@postgres:5432/accounts_db` | PostgreSQL connection string |
| `NODE_ENV` | No | `development` | Environment (`development`, `production`) |
| `PORT` | No | `3000` | API listen port |
| `CORS_ORIGINS` | No | `http://localhost:3001,http://localhost:3002` | Comma-separated allowed origins |
| `SESSION_SECRET` | Yes | `dev-session-secret` | Secret for session signing |
| `ADMIN_EMAIL` | No | `admin@yaotoshi.xyz` | Seed admin user email |
| `ADMIN_PASSWORD` | No | `admin12345678` | Seed admin user password |
| `SEED_INVITE_CODE` | No | `YAOTOSHI1` | Seed invite code |
| `POSTGRES_USER` | No | `accounts` | PostgreSQL user |
| `POSTGRES_PASSWORD` | No | `accounts_secret` | PostgreSQL password |
| `POSTGRES_DB` | No | `accounts_db` | PostgreSQL database name |

## Docker Compose Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | postgres:16-alpine | 5435:5432 | Database |
| `api` | Custom (Dockerfile.api) | 3000:3000 | NestJS API |
| `mailhog` | mailhog/mailhog | 1025 (SMTP), 8025 (UI) | Dev email testing |

## Volumes

- `postgres_data` -- Persists PostgreSQL data across container restarts
- `./apps/api/src` -- Mounted into API container for hot reload in development
- `./prisma` -- Mounted for migration access

## Startup Steps

### Development

```bash
# 1. Start all services
docker compose up -d

# 2. Watch logs
docker compose logs -f api

# 3. Access
# API: http://localhost:3000
# MailHog UI: http://localhost:8025
```

The API container automatically runs migrations and starts in watch mode:
```sh
pnpm prisma migrate deploy &&
pnpm prisma generate &&
cd apps/api && pnpm start:dev
```

### Production

```bash
# 1. Set environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/accounts_db"
export NODE_ENV=production
export SESSION_SECRET="<generate-a-strong-secret>"
export CORS_ORIGINS="https://app.yaotoshi.xyz"

# 2. Build the API
cd apps/api && pnpm build

# 3. Run migrations
DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy

# 4. Seed (first deployment only)
DATABASE_URL="$DATABASE_URL" npx prisma db seed

# 5. Start
node apps/api/dist/main.js
```

## Database Migration

```bash
# Apply pending migrations
DATABASE_URL="..." npx prisma migrate deploy

# Create a new migration (development only)
DATABASE_URL="..." npx prisma migrate dev --name <migration_name>

# Check migration status
DATABASE_URL="..." npx prisma migrate status

# Seed the database
DATABASE_URL="..." npx prisma db seed
```

The seed script creates:
- Admin user (`admin@yaotoshi.xyz` / `admin12345678`)
- Invite code `YAOTOSHI1`
- Demo OAuth client configured for `localhost:3002`

## Backup and Restore

### Backup

```bash
# Full database dump
docker compose exec postgres pg_dump -U accounts accounts_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
docker compose exec postgres pg_dump -U accounts -Fc accounts_db > backup_$(date +%Y%m%d_%H%M%S).dump
```

### Restore

```bash
# From SQL dump
docker compose exec -T postgres psql -U accounts accounts_db < backup.sql

# From compressed dump
docker compose exec postgres pg_restore -U accounts -d accounts_db --clean backup.dump
```

## Server Migration

To migrate the service to a new server:

1. **Backup the database** on the old server:
   ```bash
   docker compose exec postgres pg_dump -U accounts -Fc accounts_db > accounts_backup.dump
   ```

2. **Copy files** to the new server:
   ```bash
   scp -r /path/to/accounts newserver:/path/to/accounts
   scp accounts_backup.dump newserver:/path/to/
   ```

3. **Start services** on the new server:
   ```bash
   cd /path/to/accounts
   docker compose up -d postgres
   # Wait for postgres to be healthy
   docker compose exec postgres pg_restore -U accounts -d accounts_db --clean /path/to/accounts_backup.dump
   docker compose up -d
   ```

4. **Verify:**
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:3000/ready
   ```

5. **Update DNS** to point to the new server.

## Health Checks

- `GET /health` -- Returns `{ status: "ok" }` if the process is running
- `GET /ready` -- Returns `{ status: "ready", database: "connected" }` if the database is reachable

Use `/ready` for load balancer health checks and deployment readiness probes.
