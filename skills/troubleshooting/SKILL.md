# Troubleshooting Skill

## Description

Common issues and solutions for the accounts.yaotoshi.xyz project.

## Service Won't Start

### API container exits immediately

**Check logs:**
```bash
docker compose logs api
```

**Common causes:**
- PostgreSQL not ready yet. The API depends on `postgres` with a healthcheck, but if the database is slow to initialize, restart: `docker compose restart api`
- Missing environment variable. Check that `DATABASE_URL` is set and correct.
- Port 3000 already in use. Stop the conflicting process or change the port.

### PostgreSQL won't start

**Check logs:**
```bash
docker compose logs postgres
```

**Common causes:**
- Port 5435 conflict. Another PostgreSQL or service is using it.
- Corrupted volume. Reset with `docker compose down -v` (destroys data).
- Disk full. Free up space.

## Database Issues

### "relation does not exist" error

Migrations haven't been applied:
```bash
docker compose exec api npx prisma migrate deploy
```

### Prisma client out of sync with schema

Regenerate the client:
```bash
docker compose exec api npx prisma generate
```
Then restart the API: `docker compose restart api`

### Need to reset database completely

```bash
docker compose down -v
docker compose up -d
```

This destroys all data and recreates everything from scratch (migrations + seed).

## Authentication Issues

### "Invalid email or password" on login

- Verify the user exists: check `users` table
- Verify user status is ACTIVE (not SUSPENDED or DELETED)
- Reset password via database if needed:
  ```bash
  docker compose exec postgres psql -U accounts accounts_db
  # Then update password_hash manually (or use the forgot-password flow)
  ```

### Session token not working

- Session may be expired (30-day limit) or revoked
- Check the `sessions` table for the token hash
- Verify the cookie is being sent (check browser dev tools)
- In production, ensure `NODE_ENV=production` for Secure cookie flag and that HTTPS is being used

### OAuth flow returns "Invalid or expired authorization code"

- Auth codes expire after 10 minutes
- Auth codes are single-use (check `consumed_at`)
- Verify client_id matches between /authorize and /token requests
- Verify redirect_uri is identical in both requests
- Verify PKCE: the code_verifier must match the original code_challenge

### "Missing required parameters" on /authorize

Required query parameters:
- `response_type=code`
- `client_id` (registered client)
- `redirect_uri` (must match registered URI exactly)
- `code_challenge` (base64url-encoded SHA-256)

## Invite Issues

### Invite code rejected during signup

- Code may be revoked (check `revoked_at`)
- Code may be expired (check `expires_at`)
- Code may have reached max uses (check `used_count` vs `max_uses`)
- If `assigned_email` is set, the signup email must match

### Need to create a new invite

```bash
curl -X POST http://localhost:3000/admin/invites \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=<admin_token>" \
  -d '{"maxUses": 5}'
```

## Performance Issues

### API responses are slow

- Check PostgreSQL performance: `docker compose exec postgres psql -U accounts -c "SELECT count(*) FROM sessions WHERE revoked_at IS NULL"`
- Large number of expired/revoked sessions can slow queries. Consider adding a cleanup job.
- Check if rate limiting is being hit (429 responses)

### High memory usage

- Argon2 hashing uses 64 MB per hash operation. Under heavy load, this adds up.
- Check for memory leaks in long-running connections.

## Docker Issues

### Volumes not mounting correctly

- Ensure paths in docker-compose.yml match your directory structure
- On macOS/Windows, check Docker Desktop file sharing settings
- Try `docker compose down && docker compose up -d` for a clean restart

### Cannot connect to database from host

The database is exposed on port 5435 (not the default 5432):
```bash
psql -h localhost -p 5435 -U accounts accounts_db
```

## Useful Debug Commands

```bash
# Check all running containers
docker compose ps

# Shell into API container
docker compose exec api sh

# Shell into PostgreSQL
docker compose exec postgres psql -U accounts accounts_db

# View recent audit logs
docker compose exec postgres psql -U accounts accounts_db -c \
  "SELECT event_type, user_id, ip_address, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 20"

# Count active sessions
docker compose exec postgres psql -U accounts accounts_db -c \
  "SELECT count(*) FROM sessions WHERE revoked_at IS NULL AND expires_at > now()"

# Check invite code status
docker compose exec postgres psql -U accounts accounts_db -c \
  "SELECT code, max_uses, used_count, revoked_at, expires_at FROM invite_codes"
```
