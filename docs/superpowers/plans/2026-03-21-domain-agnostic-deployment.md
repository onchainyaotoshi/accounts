# Domain-Agnostic Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all hardcoded `yaotoshi.xyz` references from runtime code and config, replacing with environment variables so the project deploys on any domain.

**Architecture:** Replace hardcoded domain strings with env vars (`APP_DOMAIN`, `ISSUER_URL`, `CORS_ORIGINS`, `ADMIN_EMAIL`). Most env vars already exist — we remove fallbacks and add `APP_DOMAIN` for wildcard CORS/redirect validation. Nginx config becomes a template.

**Tech Stack:** NestJS 11, Next.js 14, Prisma 6, Docker Compose, Nginx

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/api/src/main.ts` | Modify | Replace hardcoded CORS regex with `APP_DOMAIN` env var |
| `apps/api/src/oauth/well-known.controller.ts` | Modify | Remove hardcoded ISSUER_URL fallback |
| `apps/web/middleware.ts` | Modify | Replace hardcoded CORS regex with `NEXT_PUBLIC_APP_DOMAIN` |
| `apps/web/app/login/page.tsx` | Modify | Replace hardcoded redirect validation domain |
| `apps/web/app/(protected)/admin/clients/page.tsx` | Modify | Replace placeholder text |
| `prisma/seed.ts` | Modify | Require env vars instead of hardcoded fallbacks |
| `docker-compose.yml` | Modify | Remove yaotoshi.xyz from CORS fallback, pass APP_DOMAIN |
| `infra/nginx/accounts.conf` | Delete | Replace with template |
| `infra/nginx/accounts.conf.template` | Create | Nginx config with envsubst placeholder |
| `.env.example` | Modify | Update to generic domain examples |
| `README.md` | Modify | Update domain references |
| `docs/*.md` | Modify | Update domain references |

---

### Task 1: API CORS + OIDC Discovery

**Files:**
- Modify: `apps/api/src/main.ts:29-31`
- Modify: `apps/api/src/oauth/well-known.controller.ts:9-10`

**Note:** This task removes the `NODE_ENV === 'development'` guard from CORS wildcard matching. Wildcard subdomain CORS is now controlled solely by whether `APP_DOMAIN` is set — giving deployers explicit control regardless of environment.

- [ ] **Step 1: Replace hardcoded CORS regex with APP_DOMAIN**

In `apps/api/src/main.ts`, replace lines 29-31:

```typescript
      if (process.env.NODE_ENV === 'development' && /^https:\/\/[\w-]+\.yaotoshi\.xyz$/.test(origin)) {
        return callback(null, true);
      }
```

With:

```typescript
      const appDomain = process.env.APP_DOMAIN;
      if (appDomain) {
        const escapedDomain = appDomain.replace(/\./g, '\\.');
        if (new RegExp(`^https://[\\w-]+\\.${escapedDomain}$`).test(origin)) {
          return callback(null, true);
        }
      }
```

- [ ] **Step 2: Remove hardcoded ISSUER_URL fallback**

In `apps/api/src/oauth/well-known.controller.ts`, replace lines 9-10:

```typescript
    const issuer =
      process.env.ISSUER_URL || 'https://accounts.yaotoshi.xyz';
```

With:

```typescript
    const issuer = process.env.ISSUER_URL;
    if (!issuer) {
      throw new Error('ISSUER_URL environment variable is required');
    }
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/main.ts apps/api/src/oauth/well-known.controller.ts
git commit -m "feat: replace hardcoded domain with APP_DOMAIN env var in API"
```

---

### Task 2: Web Middleware + Login Redirect Validation

**Files:**
- Modify: `apps/web/middleware.ts:3-7`
- Modify: `apps/web/app/login/page.tsx:9-29`

- [ ] **Step 1: Replace hardcoded CORS regex in middleware**

In `apps/web/middleware.ts`, replace lines 3-7:

```typescript
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[\w-]+\.yaotoshi\.xyz$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];
```

With:

```typescript
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = (() => {
  const patterns: RegExp[] = [
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
  ];
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
  if (appDomain) {
    const escaped = appDomain.replace(/\./g, '\\.');
    patterns.unshift(new RegExp(`^https:\\/\\/[\\w-]+\\.${escaped}$`));
  }
  return patterns;
})();
```

- [ ] **Step 2: Replace hardcoded domain in login redirect validation**

In `apps/web/app/login/page.tsx`, replace the `isAllowedRedirect` function (lines 9-29):

```typescript
function isAllowedRedirect(url: string): boolean {
  // Allow relative paths
  if (url.startsWith('/')) {
    return true;
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
    if (appDomain && (hostname === appDomain || hostname.endsWith(`.${appDomain}`))) {
      return true;
    }
  } catch {
    // Invalid URL, reject
  }
  return false;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/middleware.ts apps/web/app/login/page.tsx
git commit -m "feat: replace hardcoded domain with NEXT_PUBLIC_APP_DOMAIN in frontend"
```

---

### Task 3: Frontend Placeholders + Seed + Docker Compose

**Files:**
- Modify: `apps/web/app/(protected)/admin/clients/page.tsx:210,222`
- Modify: `prisma/seed.ts:7-9`
- Modify: `docker-compose.yml:30,49-51`

- [ ] **Step 1: Replace placeholder text in clients page**

In `apps/web/app/(protected)/admin/clients/page.tsx`:

Line 210 — change:
```
placeholder={"https://myapp.yaotoshi.xyz/callback\nhttp://localhost:3000/callback"}
```
To:
```
placeholder={"https://myapp.example.com/callback\nhttp://localhost:3000/callback"}
```

Line 222 — change:
```
placeholder={"https://myapp.yaotoshi.xyz\nhttp://localhost:3000"}
```
To:
```
placeholder={"https://myapp.example.com\nhttp://localhost:3000"}
```

- [ ] **Step 2: Require env vars in seed**

In `prisma/seed.ts`, replace lines 7-9:

```typescript
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@yaotoshi.xyz';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin12345678';
  const seedInviteCode = process.env.SEED_INVITE_CODE || 'YAOTOSHI1';
```

With:

```typescript
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) throw new Error('ADMIN_EMAIL env var is required for seeding');
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) throw new Error('ADMIN_PASSWORD env var is required for seeding');
  const seedInviteCode = process.env.SEED_INVITE_CODE;
  if (!seedInviteCode) throw new Error('SEED_INVITE_CODE env var is required for seeding');
```

- [ ] **Step 3: Update docker-compose.yml**

Line 30 — remove `https://accounts.yaotoshi.xyz` from CORS_ORIGINS fallback:

```yaml
      CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:7768,http://localhost:7769}
```

Add `APP_DOMAIN` to api service environment (after ISSUER_URL line 31):

```yaml
      APP_DOMAIN: ${APP_DOMAIN:-}
```

Add `NEXT_PUBLIC_APP_DOMAIN` to web service environment (after NEXT_PUBLIC_API_URL line 51):

```yaml
      NEXT_PUBLIC_APP_DOMAIN: ${APP_DOMAIN:-}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(protected)/admin/clients/page.tsx prisma/seed.ts docker-compose.yml
git commit -m "feat: remove hardcoded domains from placeholders, seed, and docker-compose"
```

---

### Task 4: Nginx Template

**Files:**
- Delete: `infra/nginx/accounts.conf`
- Create: `infra/nginx/accounts.conf.template`

- [ ] **Step 1: Create nginx template**

Create `infra/nginx/accounts.conf.template`:

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

- [ ] **Step 2: Delete old hardcoded config**

```bash
rm infra/nginx/accounts.conf
```

- [ ] **Step 3: Add envsubst usage note**

Add a comment at the top of `infra/nginx/accounts.conf.template`:

```nginx
# Template — generate final config with:
#   ACCOUNTS_HOSTNAME=accounts.example.com envsubst '${ACCOUNTS_HOSTNAME}' < accounts.conf.template > accounts.conf
# Note: the single quotes around '${ACCOUNTS_HOSTNAME}' prevent shell expansion of nginx variables ($host, etc.)
```

- [ ] **Step 4: Commit**

```bash
git add infra/nginx/accounts.conf infra/nginx/accounts.conf.template
git commit -m "feat: replace hardcoded nginx config with envsubst template"
```

---

### Task 5: .env.example + Documentation

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/deployment.md`
- Modify: `docs/security.md`
- Modify: All `skills/*.md` files that reference yaotoshi.xyz

- [ ] **Step 1: Update .env.example**

Replace the full content of `.env.example` with:

```env
# Database
DATABASE_URL=postgresql://accounts:accounts_secret@postgres:5432/accounts_db
POSTGRES_USER=accounts
POSTGRES_PASSWORD=accounts_secret
POSTGRES_DB=accounts_db

# App
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:7768,http://localhost:7769
ISSUER_URL=http://localhost:7768

# Domain (for wildcard CORS and redirect validation)
APP_DOMAIN=example.com

# Session
SESSION_SECRET=change-this-to-a-random-secret-in-production

# Admin seed (all required — no defaults)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=CHANGE_ME_BEFORE_SEEDING

# Seed invite code (required — no default)
SEED_INVITE_CODE=CHANGE_ME_BEFORE_SEEDING
```

- [ ] **Step 2: Update README.md**

Replace all `yaotoshi.xyz` references with `example.com` in examples. Replace `admin@yaotoshi.xyz` with `admin@example.com`. Add note about `APP_DOMAIN` env var. Update the "Default Credentials" table to note that credentials are now configured via env vars (no defaults).

- [ ] **Step 3: Update docs and skills**

In all files under `docs/` and `skills/`, replace `yaotoshi.xyz` with `example.com` in examples and URLs. These are documentation-only changes — no functional impact.

Use find-and-replace across:
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/security.md` (if it has domain refs)
- `skills/setup/SKILL.md`
- `skills/architecture/SKILL.md`
- `skills/deployment/SKILL.md`
- `skills/troubleshooting/SKILL.md`
- `skills/security/SKILL.md`

- [ ] **Step 4: Commit**

```bash
git add .env.example README.md docs/ skills/
git commit -m "docs: replace yaotoshi.xyz with example.com in all documentation"
```

---

## Summary

| Task | Files | What it does |
|------|-------|-------------|
| 1 | main.ts, well-known.controller.ts | API CORS + OIDC discovery |
| 2 | middleware.ts, login/page.tsx | Frontend CORS + redirect validation |
| 3 | clients/page.tsx, seed.ts, docker-compose.yml | Placeholders, seed, compose |
| 4 | nginx config | Template with envsubst |
| 5 | .env.example, README, docs, skills | Documentation |
