# Deployment

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `ADMIN_EMAIL` | Seed admin user email |
| `ADMIN_PASSWORD` | Seed admin user password |
| `SEED_INVITE_CODE` | Seed invite code |

The seed step will fail if any of these are missing.

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `accounts` | PostgreSQL user |
| `POSTGRES_PASSWORD` | `accounts_secret` | PostgreSQL password |
| `POSTGRES_DB` | `accounts_db` | PostgreSQL database name |
| `NODE_ENV` | `development` | Environment (`development`, `production`) |
| `CORS_ORIGINS` | `http://localhost:9999` | Comma-separated allowed origins |
| `ISSUER_URL` | `http://localhost:9999` | OIDC issuer URL (must match public-facing web URL) |
| `APP_DOMAIN` | — | Domain for wildcard CORS and redirect validation (e.g. `example.com`) |
| `APP_NAME` | `Accounts` | Display name used in UI and emails |
| `RESEND_API_KEY` | — | Resend API key for sending emails (omit to log emails to console) |
| `EMAIL_FROM` | `noreply@example.com` | Sender address for outbound emails |
| `WEB_PORT` | `9999` | Host port for the web frontend |
| `API_PORT` | `9998` | Host port for the API |
| `DB_PORT` | `9997` | Host port for PostgreSQL |

`DATABASE_URL` is constructed automatically from `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` inside `docker-compose.yml`. You do not need to set it separately.

All ports bind to `127.0.0.1` only. Use a reverse proxy (nginx, Caddy, etc.) to expose services externally.

## Docker Compose Services

| Service | Image | Host Port | Purpose |
|---------|-------|-----------|---------|
| `postgres` | postgres:16-alpine | `127.0.0.1:${DB_PORT}` (9997) | Database |
| `api` | Custom (Dockerfile.api) | `127.0.0.1:${API_PORT}` (9998) | NestJS API |
| `web` | Custom (Dockerfile.web) | `127.0.0.1:${WEB_PORT}` (9999) | Next.js frontend |

All services have `restart: unless-stopped`.

## Volumes

- `postgres_data` -- Persists PostgreSQL data across container restarts

## Startup

```bash
# 1. Copy and edit environment
cp .env.example .env
# Edit .env — set ADMIN_EMAIL, ADMIN_PASSWORD, SEED_INVITE_CODE at minimum

# 2. Start all services
docker compose up -d

# 3. Watch logs
docker compose logs -f api
```

The API container automatically runs `prisma migrate deploy` then starts the server.

### Production

For production, also set:

```bash
NODE_ENV=production
APP_DOMAIN=example.com
ISSUER_URL=https://accounts.example.com
CORS_ORIGINS=https://accounts.example.com
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@example.com
```

### First-time seed

The seed runs automatically on first startup via the API entrypoint. It creates:

- Admin user (from `ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- Invite code (from `SEED_INVITE_CODE`)

To seed manually:

```bash
docker compose exec api npx prisma db seed
```

## Nginx Reverse Proxy

An nginx config template is provided at `infra/nginx/accounts.conf.template`. Generate the final config with `envsubst`:

```bash
ACCOUNTS_HOSTNAME=accounts.example.com \
  envsubst '${ACCOUNTS_HOSTNAME}' < infra/nginx/accounts.conf.template > /etc/nginx/sites-enabled/accounts.conf

nginx -t && systemctl reload nginx
```

The template proxies to the API on `http://api:3000`. Adjust `proxy_pass` to `http://127.0.0.1:9998` if nginx runs outside Docker.

## Database Migration

```bash
# Apply pending migrations
docker compose exec api npx prisma migrate deploy

# Create a new migration (development only)
docker compose exec api npx prisma migrate dev --name <migration_name>

# Check migration status
docker compose exec api npx prisma migrate status
```

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
   curl http://127.0.0.1:9998/health
   curl http://127.0.0.1:9998/ready
   ```

5. **Update DNS** to point to the new server.

## Health Checks

- `GET /health` -- Returns `{ status: "ok" }` if the process is running
- `GET /ready` -- Returns `{ status: "ready", database: "connected" }` if the database is reachable

Use `/ready` for load balancer health checks and deployment readiness probes.
