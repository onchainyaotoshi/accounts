[![Publish @yaotoshi/auth-sdk](https://github.com/onchainyaotoshi/accounts/actions/workflows/publish-auth-sdk.yml/badge.svg)](https://github.com/onchainyaotoshi/accounts/actions/workflows/publish-auth-sdk.yml)
[![npm](https://img.shields.io/npm/v/@yaotoshi/auth-sdk)](https://www.npmjs.com/package/@yaotoshi/auth-sdk)

# Accounts Service

Centralized authentication and authorization service. Invite-only registration, session-based auth, and OAuth 2.0 with PKCE.

Deploy on any domain — all configuration is done via environment variables.

---

## Getting Started

### 1. Copy the env file

```bash
cp .env.example .env
```

Edit `.env` and set your values:

```env
# Required for seeding the database
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-secure-password
SEED_INVITE_CODE=YOUR-INVITE-CODE

# Your domain (used for CORS wildcard — all *.yourdomain.com will be allowed)
APP_DOMAIN=yourdomain.com

# Where the accounts UI is hosted (used for OIDC discovery)
ISSUER_URL=https://accounts.yourdomain.com
```

See [Environment Variables](#environment-variables) for the full reference.

### 2. Start all services

```bash
docker compose up -d
```

This starts PostgreSQL, the API, the web UI, and MailHog. The API automatically runs database migrations on startup.

### 3. Seed the database

```bash
docker compose exec api npx prisma db seed
```

This creates the admin user, a seed invite code, and a demo OAuth client.

### 4. Verify

```bash
curl http://localhost:7767/health   # { "status": "ok" }
curl http://localhost:7767/ready    # { "status": "ready", "database": "connected" }
```

### 5. Open the UI

Go to http://localhost:7768 and log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `.env`.

---

## Environment Variables

All configuration is done via environment variables. No hardcoded domains.

### Required for seeding

These must be set before running `prisma db seed`. There are no defaults — the seed will fail if these are missing.

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_EMAIL` | Admin user email | `admin@yourdomain.com` |
| `ADMIN_PASSWORD` | Admin user password | `my-secure-password-123` |
| `SEED_INVITE_CODE` | First invite code for signups | `WELCOME2024` |

### App configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment (`development` / `production`) |
| `PORT` | `3000` | API server port (inside container) |
| `ISSUER_URL` | *(required)* | Base URL of the accounts UI, used in OIDC discovery. Example: `https://accounts.yourdomain.com` |
| `APP_DOMAIN` | *(empty)* | Your root domain. When set, all `*.APP_DOMAIN` subdomains are allowed for CORS. Example: `yourdomain.com` |
| `CORS_ORIGINS` | `http://localhost:7768,...` | Comma-separated explicit CORS origins. Example: `https://app.yourdomain.com,https://admin.yourdomain.com` |
| `APP_NAME` | `Accounts` | Brand name shown in the web UI |

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | *(auto from compose)* | PostgreSQL connection string |
| `POSTGRES_USER` | `accounts` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `accounts_secret` | PostgreSQL password |
| `POSTGRES_DB` | `accounts_db` | PostgreSQL database name |

### CORS: `APP_DOMAIN` vs `CORS_ORIGINS`

You have two ways to allow cross-origin requests:

**Option A: `APP_DOMAIN`** — wildcard, allows all subdomains automatically.

```env
APP_DOMAIN=yourdomain.com
# Result: https://app.yourdomain.com, https://admin.yourdomain.com, https://anything.yourdomain.com — all allowed
```

Use this when you control all subdomains of your domain.

**Option B: `CORS_ORIGINS`** — explicit list, only exact matches allowed.

```env
CORS_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
# Result: only these two origins are allowed, nothing else
```

Use this when you want strict control, or when you have third-party origins.

You can use both at the same time. In local development (`NODE_ENV=development`), `localhost:*` is always allowed automatically.

---

## Integrating Your App with the Auth SDK

This is how you add login/signup to your own app using the `@yaotoshi/auth-sdk`.

### Step 1: Register an OAuth client

Go to the admin UI at http://localhost:7768/admin/clients and create a new client:

- **Name**: Your app name
- **Slug**: `my-app` (unique identifier)
- **Type**: `PUBLIC` (for browser apps)
- **Redirect URIs**: `http://localhost:3000/callback` (where your app handles the OAuth callback)
- **Post-Logout Redirect URIs**: `http://localhost:3000` (where to go after logout)

After creating, copy the **Client ID** — you'll need it.

### Step 2: Install the SDK

```bash
npm install @yaotoshi/auth-sdk
# or
pnpm add @yaotoshi/auth-sdk
```

### Step 3: Set up the auth client

```ts
import { YaotoshiAuth } from '@yaotoshi/auth-sdk';

const auth = new YaotoshiAuth({
  clientId: 'your-client-id-here',           // from Step 1
  redirectUri: 'http://localhost:3000/callback', // must match what you registered
  postLogoutRedirectUri: 'http://localhost:3000',
  accountsUrl: 'http://localhost:7768',       // where the accounts UI is running
});
```

#### Config options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `clientId` | Yes | — | OAuth client ID from the admin UI |
| `redirectUri` | Yes | — | Your app's callback URL (must be registered in the client) |
| `accountsUrl` | Yes | — | Base URL of the accounts service |
| `postLogoutRedirectUri` | No | — | Where to redirect after logout |
| `scopes` | No | `['openid', 'email']` | OAuth scopes to request |
| `apiPathPrefix` | No | `'/api/proxy'` | API path prefix. Use `''` if connecting directly to the API instead of through the Next.js proxy |
| `storagePrefix` | No | `'yaotoshi_auth'` | Prefix for localStorage/sessionStorage keys |

### Step 4: Add login

```ts
// On your login button click
function handleLogin() {
  auth.login(); // redirects the user to the accounts login page
}
```

The user will be redirected to the accounts service to log in, then sent back to your `redirectUri` with an authorization code.

### Step 5: Handle the callback

On your callback page (e.g., `/callback`):

```ts
// This exchanges the authorization code for an access token
const { accessToken, user, scope, expiresIn } = await auth.handleCallback();

console.log(user.email);      // user's email
console.log(user.sub);         // user's unique ID
console.log(expiresIn);        // token lifetime in seconds (default: 30 days)

// Redirect to your app's main page
window.location.href = '/dashboard';
```

### Step 6: Check auth status and get user info

```ts
// Check if the user is logged in (also checks token expiry)
if (auth.isAuthenticated()) {
  const user = await auth.getUser();
  console.log(`Logged in as ${user.email}`);
}

// Get the raw access token (for API calls)
const token = auth.getAccessToken();
```

### Step 7: Logout

```ts
async function handleLogout() {
  await auth.logout(); // revokes the session on the server, clears local token, redirects
}
```

### Full example (React)

```tsx
import { YaotoshiAuth } from '@yaotoshi/auth-sdk';
import { useEffect, useState } from 'react';

const auth = new YaotoshiAuth({
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000/callback',
  postLogoutRedirectUri: 'http://localhost:3000',
  accountsUrl: 'http://localhost:7768',
});

// Login page
function LoginPage() {
  return <button onClick={() => auth.login()}>Sign in</button>;
}

// Callback page — handles the OAuth redirect
function CallbackPage() {
  useEffect(() => {
    auth.handleCallback()
      .then(() => window.location.href = '/dashboard')
      .catch(err => console.error('Login failed:', err));
  }, []);

  return <p>Signing you in...</p>;
}

// Dashboard — shows user info
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

### Connecting directly to the API (without the Next.js proxy)

By default, the SDK sends requests through the Next.js proxy at `/api/proxy/*`. If your app talks directly to the API server, set `apiPathPrefix` to `''`:

```ts
const auth = new YaotoshiAuth({
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000/callback',
  accountsUrl: 'http://localhost:7767', // direct API URL, not the web UI
  apiPathPrefix: '',                     // no proxy prefix
});
```

### Security note

The SDK stores access tokens in `localStorage`. This is standard for browser SPAs (Auth0, Firebase do the same), but means an XSS vulnerability in your app could expose the token. To mitigate:

- Set a strong `Content-Security-Policy` header
- Sanitize all user input
- For high-security apps, use a Backend-for-Frontend (BFF) pattern where a server-side proxy holds the token in an httpOnly cookie

---

## Access Points

| Service | URL | Description |
|---------|-----|-------------|
| API | http://localhost:7767 | Backend API |
| Web | http://localhost:7768 | Accounts UI (login, admin panel) |
| Demo client | http://localhost:7769 | Example app that uses the SDK |
| MailHog | http://localhost:8025 | Dev email viewer |
| PostgreSQL | localhost:5435 | Database (bound to 127.0.0.1) |

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/login | Email + password login |
| POST | /auth/logout | End session |
| POST | /auth/signup-with-invite | Register with invite code |
| POST | /auth/forgot-password | Request password reset |
| POST | /auth/reset-password | Reset password with token |

### OAuth / SSO
| Method | Path | Description |
|--------|------|-------------|
| GET | /authorize | Start OAuth flow (PKCE required) |
| POST | /token | Exchange auth code for access token |
| GET | /me | Get current user info |
| POST | /logout | Revoke session + redirect |
| GET | /.well-known/openid-configuration | OIDC discovery |

### Sessions
| Method | Path | Description |
|--------|------|-------------|
| GET | /sessions | List your active sessions |
| DELETE | /sessions/:id | Revoke a session |
| DELETE | /sessions/others/all | Revoke all other sessions |

### Admin (requires ADMIN role)
| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/users | List users |
| GET | /admin/invites | List invite codes |
| POST | /admin/invites | Create invite code |
| POST | /admin/invites/:id/revoke | Revoke invite code |
| GET | /admin/clients | List OAuth clients |
| POST | /admin/clients | Register OAuth client |
| PATCH | /admin/clients/:id | Update OAuth client |
| GET | /admin/audit-logs | Query audit logs |
| GET | /admin/users/:userId/sessions | List user's sessions |
| POST | /admin/sessions/:id/revoke | Revoke any session |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Process health check |
| GET | /ready | Database connectivity (returns 503 if down) |

---

## Deploying to Production

### 1. Set environment variables

```env
NODE_ENV=production
ISSUER_URL=https://accounts.yourdomain.com
APP_DOMAIN=yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=a-very-strong-password
SEED_INVITE_CODE=YOUR-FIRST-INVITE
POSTGRES_PASSWORD=a-different-strong-password
APP_NAME=YourAppName
```

### 2. Generate nginx config

```bash
ACCOUNTS_HOSTNAME=accounts.yourdomain.com \
  envsubst '${ACCOUNTS_HOSTNAME}' < infra/nginx/accounts.conf.template > infra/nginx/accounts.conf
```

### 3. Set up TLS

The nginx template listens on port 80 only. Put it behind a TLS-terminating reverse proxy (e.g., Cloudflare, Caddy, or nginx with certbot).

---

## Commands

```bash
# Development
docker compose up -d              # Start all services
docker compose logs -f api        # Watch API logs
docker compose down               # Stop all services
docker compose down -v            # Stop and destroy data

# Database
docker compose exec api npx prisma migrate deploy   # Apply migrations
docker compose exec api npx prisma db seed           # Run seed
docker compose exec api npx prisma studio            # Visual DB browser

# Direct database access
docker compose exec postgres psql -U accounts accounts_db
```

## Project Structure

```
accounts/
├── apps/
│   ├── api/                    # NestJS backend (port 7767)
│   │   └── src/
│   │       ├── auth/           # Login, signup, password reset
│   │       ├── oauth/          # OAuth 2.0 + PKCE, OIDC discovery
│   │       ├── sessions/       # Session management
│   │       ├── admin/          # Admin API (users, invites, clients, audit)
│   │       └── common/         # Guards, decorators, crypto, Prisma
│   ├── web/                    # Next.js frontend (port 7768)
│   └── demo-client/            # Vite demo app (port 7769)
├── packages/
│   └── auth-sdk/               # @yaotoshi/auth-sdk (npm package)
├── prisma/                     # Database schema + migrations + seed
├── infra/
│   ├── docker/                 # Dockerfiles
│   └── nginx/                  # Nginx config template
├── docs/                       # Architecture and operations docs
├── docker-compose.yml
└── .env.example                # All configurable env vars
```

## Documentation

- [Architecture](docs/architecture.md) -- System overview, module boundaries, data model
- [Auth Flow](docs/auth-flow.md) -- Login, signup, OAuth PKCE flow, session lifecycle
- [Security](docs/security.md) -- Hashing, PKCE, rate limiting, audit events
- [Deployment](docs/deployment.md) -- Environment variables, backup/restore, server migration
- [Development Rules](docs/development-rules.md) -- Code conventions for Claude Code
- [Tasks](TASKS.md) -- Backlog
- [Decisions](DECISIONS.md) -- Technical decisions with rationale
