# Deployment Skill

## Description

How to deploy and operate the accounts.yaotoshi.xyz service.

## Development Deployment

```bash
docker compose up -d
```

Services start automatically: PostgreSQL, API (with auto-migration and hot reload), MailHog.

## Production Deployment

### Required Environment Variables

```bash
DATABASE_URL="postgresql://user:pass@host:5432/accounts_db"
NODE_ENV=production
SESSION_SECRET="<random-64-char-string>"
CORS_ORIGINS="https://app.yaotoshi.xyz,https://other.yaotoshi.xyz"
PORT=3000
```

### Build and Deploy

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Generate Prisma client
npx prisma generate

# Build
cd apps/api && pnpm build

# Run migrations
DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy

# Seed (first deployment only)
DATABASE_URL="$DATABASE_URL" npx prisma db seed

# Start
NODE_ENV=production node apps/api/dist/main.js
```

### Health Verification

```bash
curl https://accounts.yaotoshi.xyz/health   # { "status": "ok" }
curl https://accounts.yaotoshi.xyz/ready     # { "status": "ready", "database": "connected" }
```

## Database Operations

### Backup

```bash
# SQL dump
pg_dump -U accounts accounts_db > backup_$(date +%Y%m%d).sql

# Compressed
pg_dump -U accounts -Fc accounts_db > backup_$(date +%Y%m%d).dump
```

### Restore

```bash
psql -U accounts accounts_db < backup.sql
# or
pg_restore -U accounts -d accounts_db --clean backup.dump
```

### Migrations

```bash
# Apply pending
npx prisma migrate deploy

# Check status
npx prisma migrate status
```

## Server Migration

1. Backup database on old server
2. Copy project files and backup to new server
3. Start PostgreSQL, restore backup
4. Start API service
5. Verify with /health and /ready endpoints
6. Update DNS

## Monitoring

- `GET /health` -- Returns 200 if process is alive
- `GET /ready` -- Returns 200 with `database: "connected"` if DB is reachable
- Audit logs in `audit_logs` table track all security events
- Docker logs: `docker compose logs -f api`
