[![Publish @yaotoshi/auth-sdk](https://github.com/onchainyaotoshi/accounts/actions/workflows/publish-auth-sdk.yml/badge.svg)](https://github.com/onchainyaotoshi/accounts/actions/workflows/publish-auth-sdk.yml)
[![npm](https://img.shields.io/npm/v/@yaotoshi/auth-sdk)](https://www.npmjs.com/package/@yaotoshi/auth-sdk)

# Accounts

Centralized auth service for your apps. Invite-only signup, session-based auth, OAuth 2.0 + PKCE. One login for all your subdomains.

```
  app.example.com ──────┐
                        │
  dashboard.example.com ├──── accounts.example.com ──── PostgreSQL
                        │       (one login for all)
  admin.example.com ────┘
```

---

## Quick Start

```bash
cp .env.example .env
```

Edit `.env` — set these three:

```env
ADMIN_EMAIL=admin@yourteam.com
ADMIN_PASSWORD=your-password
SEED_INVITE_CODE=YOUR-INVITE-CODE
```

Start:

```bash
docker compose up -d
docker compose exec api npx prisma db seed   # first time only
```

Open **http://localhost:9999** and log in with your admin credentials.

---

## Environment Variables

All config lives in `.env`. Below is what each variable does and when you need it.

### Required (no defaults)

| Variable | Description |
|----------|-------------|
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin login password |
| `SEED_INVITE_CODE` | Invite code for signups — share with your team |

### Ports

These control which localhost ports the services are exposed on. Internal container ports are handled automatically.

| Variable | Default | What it exposes |
|----------|---------|-----------------|
| `WEB_PORT` | `9999` | Web UI — point your reverse proxy here |
| `API_PORT` | `9998` | Backend API (browser calls this directly) |
| `DB_PORT` | `9997` | PostgreSQL (for local debugging, e.g. `psql`) |

Most users never need to change these. Only change if the defaults conflict with another service.

### Domain

Only needed for production. Skip for local dev.

| Variable | Description |
|----------|-------------|
| `APP_DOMAIN` | Your root domain (e.g. `example.com`). All `*.example.com` subdomains are automatically allowed for CORS |
| `ISSUER_URL` | Public URL of the accounts web UI (e.g. `https://accounts.example.com`) |

```env
APP_DOMAIN=example.com
ISSUER_URL=https://accounts.example.com
```

`CORS_ORIGINS` — optional. Only needed if you have origins **outside** your `APP_DOMAIN` (e.g. a partner site). Comma-separated list.

### Email

Password reset emails are sent via [Resend](https://resend.com). Optional — if not set, reset links are logged to console.

| Variable | Default | Description |
|----------|---------|-------------|
| `RESEND_API_KEY` | *(empty)* | API key from resend.com |
| `EMAIL_FROM` | `noreply@example.com` | Sender address |

Setup: create a Resend account, verify your domain, copy the API key.

### Other

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | `Accounts` | Brand name shown in the UI |
| `NODE_ENV` | `development` | Set to `production` on real servers |
| `POSTGRES_PASSWORD` | `accounts_secret` | Database password — **change for production** |

---

## Production Deployment

### 1. Configure `.env`

```env
NODE_ENV=production

# Required
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=a-strong-password
SEED_INVITE_CODE=YOUR-CODE
POSTGRES_PASSWORD=a-strong-db-password

# Domain
APP_DOMAIN=example.com
ISSUER_URL=https://accounts.example.com

# Email (optional)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@accounts.example.com
```

Everything else has sensible defaults. `WEB_PORT`, `API_PORT`, `DB_PORT`, `APP_NAME`, `CORS_ORIGINS` — all optional.

### 2. Start

```bash
docker compose up -d
docker compose exec api npx prisma db seed   # first time only
```

### 3. Reverse proxy

Point your reverse proxy at the web UI port (default `9999`). The web UI proxies API calls internally — you only expose one port.

**nginx:**

```bash
ACCOUNTS_HOSTNAME=accounts.example.com \
  envsubst '${ACCOUNTS_HOSTNAME}' < infra/nginx/accounts.conf.template > infra/nginx/accounts.conf
```

**Cloudflare Tunnel:**

```bash
cloudflared tunnel --url http://localhost:9999
```

### 4. TLS

The nginx template listens on port 80. Use Cloudflare, Caddy, or certbot for HTTPS. `ISSUER_URL` must match the public HTTPS URL.

---

## Commands

```bash
docker compose up -d                                   # Start
docker compose down                                    # Stop
docker compose logs -f api                             # View API logs
docker compose down -v                                 # Stop + delete all data
docker compose exec api npx prisma db seed             # Seed database
docker compose exec api npx prisma studio              # Visual DB browser
docker compose exec api npx prisma migrate dev --name <name>  # New migration
```

---

## How It Works

**Login flow (OAuth 2.0 + PKCE):**

1. User clicks "Sign in" in your app
2. SDK redirects to accounts service login page
3. User enters email + password
4. Accounts service redirects back with an auth code
5. SDK exchanges code for an access token (PKCE protects this)
6. Your app calls `GET /me` with the token to get user info
7. User is logged in

**Logout flow:**

- With `postLogoutRedirectUri`: session revoked, user redirected back to your app
- Without: session revoked, user stays on accounts login page

---

## Auth SDK

Add login to your app with [`@yaotoshi/auth-sdk`](https://www.npmjs.com/package/@yaotoshi/auth-sdk).

### 1. Register an OAuth client

In the web UI, go to **Admin > Clients** and create a client:

- **Type**: `PUBLIC`
- **Redirect URIs**: `http://localhost:3000/callback`
- **Post-Logout Redirect URIs**: `http://localhost:3000` *(optional)*

Copy the **Client ID**.

### 2. Install

```bash
npm install @yaotoshi/auth-sdk
```

### 3. Use

```ts
import { YaotoshiAuth } from '@yaotoshi/auth-sdk';

const auth = new YaotoshiAuth({
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000/callback',
  accountsUrl: 'http://localhost:9999',
  postLogoutRedirectUri: 'http://localhost:3000', // optional
});

// Login — redirects to accounts service
auth.login();

// Callback page — exchange code for token
const { user } = await auth.handleCallback();

// Check if logged in
auth.isAuthenticated();

// Get user info
const user = await auth.getUser();

// Logout
await auth.logout();
```

### SDK options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `clientId` | Yes | — | OAuth client ID from admin panel |
| `redirectUri` | Yes | — | Your callback URL (must match registered URI) |
| `accountsUrl` | Yes | — | Accounts service URL |
| `postLogoutRedirectUri` | No | — | Redirect here after logout. Must match registered URI |
| `scopes` | No | `['openid', 'email']` | OAuth scopes |
| `proxyBaseUrl` | No | — | Same-origin proxy URL to avoid CORS (e.g. `/auth/proxy`) |
| `apiPathPrefix` | No | `'/api/proxy'` | API path prefix. Set to `''` for direct API access |
| `storagePrefix` | No | `'yaotoshi_auth'` | localStorage key prefix |

<details>
<summary>React example</summary>

```tsx
import { YaotoshiAuth } from '@yaotoshi/auth-sdk';
import { useEffect, useState } from 'react';

const auth = new YaotoshiAuth({
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000/callback',
  postLogoutRedirectUri: 'http://localhost:3000',
  accountsUrl: 'http://localhost:9999',
});

function LoginPage() {
  return <button onClick={() => auth.login()}>Sign in</button>;
}

function CallbackPage() {
  useEffect(() => {
    auth.handleCallback()
      .then(() => window.location.href = '/dashboard')
      .catch(err => console.error('Login failed:', err));
  }, []);
  return <p>Signing you in...</p>;
}

function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      window.location.href = '/login';
      return;
    }
    auth.getUser().then(setUser);
  }, []);

  if (!user) return <p>Loading...</p>;
  return (
    <div>
      <p>Welcome, {user.email}</p>
      <button onClick={() => auth.logout()}>Sign out</button>
    </div>
  );
}
```

</details>

<details>
<summary>Backend integration (without SDK)</summary>

If your backend (Node.js, Python, etc.) handles auth directly:

1. Redirect to `{ACCOUNTS_URL}/authorize?client_id=...&redirect_uri=...&response_type=code&code_challenge=...&code_challenge_method=S256&state=...`
2. Handle callback: exchange auth code at `POST {ACCOUNTS_URL}/token`
3. Get user info: `GET {ACCOUNTS_URL}/me` with `Authorization: Bearer <token>`
4. Logout: `POST {ACCOUNTS_URL}/logout` with `{ token, client_id, post_logout_redirect_uri }`

</details>

### Security

Tokens are stored in `localStorage` (same as Auth0, Firebase). Mitigate XSS with a strong Content-Security-Policy header.

---

## API Endpoints

<details>
<summary>Full endpoint list</summary>

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/login | Login |
| POST | /auth/logout | Logout |
| POST | /auth/signup-with-invite | Register with invite code |
| POST | /auth/forgot-password | Request password reset |
| POST | /auth/reset-password | Reset password |

### OAuth

| Method | Path | Description |
|--------|------|-------------|
| GET | /authorize | Start OAuth flow |
| POST | /token | Exchange code for token |
| GET | /me | Get current user |
| POST | /logout | Revoke session |
| GET | /.well-known/openid-configuration | OIDC discovery |

### Sessions

| Method | Path | Description |
|--------|------|-------------|
| GET | /sessions | List sessions |
| DELETE | /sessions/:id | Revoke session |
| DELETE | /sessions/others/all | Revoke all others |

### Admin (requires ADMIN role)

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/users | List users |
| GET | /admin/invites | List invites |
| POST | /admin/invites | Create invite |
| POST | /admin/invites/:id/revoke | Revoke invite |
| GET | /admin/clients | List clients |
| POST | /admin/clients | Register client |
| PATCH | /admin/clients/:id | Update client |
| GET | /admin/audit-logs | Query audit logs |
| GET | /admin/users/:userId/sessions | User sessions |
| POST | /admin/sessions/:id/revoke | Revoke any session |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /ready | DB connectivity |

</details>

---

## Docs

- [Architecture](docs/architecture.md)
- [Auth Flow](docs/auth-flow.md)
- [Security](docs/security.md)
- [Deployment](docs/deployment.md)
- [Development Rules](docs/development-rules.md)
