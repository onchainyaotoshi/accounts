# Domain-Agnostic Deployment

## Goal

Remove all hardcoded `yaotoshi.xyz` references from runtime code and configuration. Replace with environment variables so the project can be deployed on any domain without code changes.

## Env Vars

| Env Var | New? | Purpose | Example |
|---------|------|---------|---------|
| `ISSUER_URL` | No | Base URL for OIDC discovery, well-known endpoints | `https://accounts.example.com` |
| `CORS_ORIGINS` | No | Comma-separated allowed CORS origins | `https://app.example.com,https://admin.example.com` |
| `ADMIN_EMAIL` | No | Seed admin user email | `admin@example.com` |
| `ADMIN_PASSWORD` | No | Seed admin user password | (user-defined) |
| `APP_DOMAIN` | **Yes** | Domain for wildcard CORS and frontend redirect validation | `example.com` |
| `NEXT_PUBLIC_APP_DOMAIN` | **Yes** | Same as APP_DOMAIN but exposed to Next.js client bundle | `example.com` |

`APP_DOMAIN` is needed because CORS wildcard matching and frontend redirect validation need to know which domain pattern to allow (e.g., `*.example.com`). If `APP_DOMAIN` is not set, wildcard subdomain matching is disabled entirely (only explicit `CORS_ORIGINS` are allowed).

## Changes

### 1. API CORS — `apps/api/src/main.ts`

Replace hardcoded regex `/^https:\/\/[\w-]+\.yaotoshi\.xyz$/` with a dynamic regex built from `APP_DOMAIN` env var.

```typescript
// Before
if (process.env.NODE_ENV === 'development' && /^https:\/\/[\w-]+\.yaotoshi\.xyz$/.test(origin)) {

// After
const appDomain = process.env.APP_DOMAIN;
if (appDomain) {
  const escapedDomain = appDomain.replace(/\./g, '\\.');
  if (new RegExp(`^https://[\\w-]+\\.${escapedDomain}$`).test(origin)) {
    return callback(null, true);
  }
}
```

The `NODE_ENV === 'development'` guard is removed. Wildcard subdomain CORS is now controlled solely by whether `APP_DOMAIN` is set. Operators who want wildcard subdomain CORS in production set `APP_DOMAIN`; those who don't, leave it unset and use explicit `CORS_ORIGINS` instead. This gives deployers full control.

If `APP_DOMAIN` is not set, no wildcard subdomain CORS is allowed — only explicit origins from `CORS_ORIGINS`.

### 2. Web Middleware CORS — `apps/web/middleware.ts`

Replace hardcoded `yaotoshi.xyz` regex with dynamic pattern from `NEXT_PUBLIC_APP_DOMAIN`.

```typescript
// Before
/^https:\/\/[\w-]+\.yaotoshi\.xyz$/,

// After — build pattern from env var
const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
const subdomainPattern = appDomain
  ? new RegExp(`^https://[\\w-]+\\.${appDomain.replace(/\./g, '\\.')}$`)
  : null;
```

If `NEXT_PUBLIC_APP_DOMAIN` is not set, the wildcard pattern is not added to the allowlist.

### 3. Frontend Redirect Validation — `apps/web/app/login/page.tsx`

Replace hardcoded `yaotoshi.xyz` domain check with `NEXT_PUBLIC_APP_DOMAIN` env var.

```typescript
// Before
hostname === 'yaotoshi.xyz' || hostname.endsWith('.yaotoshi.xyz')

// After
const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
appDomain && (hostname === appDomain || hostname.endsWith(`.${appDomain}`))
```

If `NEXT_PUBLIC_APP_DOMAIN` is not set, only same-origin redirects are allowed (safe default).

### 4. Frontend Placeholders — `apps/web/app/(protected)/admin/clients/page.tsx`

Replace all hardcoded `myapp.yaotoshi.xyz` placeholder text in the OAuth client form with generic examples. Both the redirect URI placeholder (line 210) and the post-logout redirect URI placeholder (line 222).

```
// Before
placeholder="https://myapp.yaotoshi.xyz/callback\nhttp://localhost:3000/callback"
placeholder="https://myapp.yaotoshi.xyz\nhttp://localhost:3000"

// After
placeholder="https://myapp.example.com/callback\nhttp://localhost:3000/callback"
placeholder="https://myapp.example.com\nhttp://localhost:3000"
```

These are just UI placeholder hints — not functional.

### 5. Docker Compose — `docker-compose.yml`

- Remove `https://accounts.yaotoshi.xyz` from CORS_ORIGINS fallback
- Pass `APP_DOMAIN` to api service
- Pass `NEXT_PUBLIC_APP_DOMAIN` to web service

```yaml
api:
  environment:
    CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:7768,http://localhost:7769}
    APP_DOMAIN: ${APP_DOMAIN:-}

web:
  environment:
    NEXT_PUBLIC_APP_DOMAIN: ${APP_DOMAIN:-}
```

### 6. Seed — `prisma/seed.ts`

Remove the hardcoded `admin@yaotoshi.xyz` fallback. If `ADMIN_EMAIL` is not set, throw an error (same pattern as the already-existing `ADMIN_PASSWORD` recommendation).

```typescript
// Before
const adminEmail = process.env.ADMIN_EMAIL || 'admin@yaotoshi.xyz';

// After
const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) throw new Error('ADMIN_EMAIL env var is required for seeding');
```

Apply the same pattern to `ADMIN_PASSWORD` and `SEED_INVITE_CODE`:

```typescript
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) throw new Error('ADMIN_PASSWORD env var is required for seeding');

const seedInviteCode = process.env.SEED_INVITE_CODE;
if (!seedInviteCode) throw new Error('SEED_INVITE_CODE env var is required for seeding');
```

### 7. OIDC Discovery Fallback — `apps/api/src/oauth/well-known.controller.ts`

Remove the hardcoded `https://accounts.yaotoshi.xyz` fallback from the OIDC discovery endpoint. If `ISSUER_URL` is not set, throw a startup error rather than silently using the wrong domain.

```typescript
// Before
const issuer = process.env.ISSUER_URL || 'https://accounts.yaotoshi.xyz';

// After
const issuer = process.env.ISSUER_URL;
if (!issuer) {
  throw new Error('ISSUER_URL environment variable is required');
}
```

### 8. Nginx — `infra/nginx/accounts.conf`

Rename to `accounts.conf.template` and use `envsubst` placeholder:

```nginx
server {
    listen 80;
    server_name ${ACCOUNTS_HOSTNAME};

    location / {
        proxy_pass http://api:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Add a note in the file or README on how to generate the final config:

```bash
ACCOUNTS_HOSTNAME=accounts.example.com envsubst '${ACCOUNTS_HOSTNAME}' < infra/nginx/accounts.conf.template > infra/nginx/accounts.conf
```

### 9. `.env.example`

Update all domain references to generic placeholders:

```env
APP_DOMAIN=example.com
ISSUER_URL=https://accounts.example.com
CORS_ORIGINS=https://app.example.com
ADMIN_EMAIL=admin@example.com
```

### 10. Documentation

Update `README.md`, `docs/`, and `skills/` to:
- Replace `yaotoshi.xyz` with `example.com` in all examples
- Note that all domain references are configurable via env vars
- Document the new `APP_DOMAIN` env var

## What Does NOT Change

- **SDK (`packages/auth-sdk`)** — already fully configurable via constructor `accountsUrl` param
- **OAuth client redirect URIs** — stored in database, not hardcoded
- **OIDC endpoint paths** — relative paths, domain-independent
- **Branding text** (`apps/web/components/auth-layout.tsx`) — contains "yaotoshi" as product name in UI. This is branding, not a domain reference. Rename separately if rebranding.

## Out of Scope

- Multi-tenancy (serving multiple domains from one instance)
- Automatic SSL/TLS provisioning
- DNS configuration
