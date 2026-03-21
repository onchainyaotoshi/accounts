[![Publish @yaotoshi/auth-sdk](https://github.com/onchainyaotoshi/accounts/actions/workflows/publish-auth-sdk.yml/badge.svg)](https://github.com/onchainyaotoshi/accounts/actions/workflows/publish-auth-sdk.yml)
[![npm](https://img.shields.io/npm/v/@yaotoshi/auth-sdk)](https://www.npmjs.com/package/@yaotoshi/auth-sdk)

# Accounts Service

Centralized authentication service. Invite-only registration, session-based auth, and OAuth 2.0 with PKCE.

---

## Quick Setup

### 1. Configure

```bash
cp .env.example .env
```

Edit `.env` — you only need to set these 3 values:

```env
ADMIN_EMAIL=admin@yourteam.com
ADMIN_PASSWORD=your-password
SEED_INVITE_CODE=YOUR-INVITE-CODE
```

That's it for local dev. Everything else has sensible defaults.

### 2. Start

```bash
docker compose up -d
```

### 3. Seed the database (first time only)

```bash
docker compose exec api npx prisma db seed
```

### 4. Open

Go to **http://localhost:7768** and log in with the email/password you set above.

---

## Ports

For cloudflared tunnels or reverse proxies, these are the ports you need:

| Service | Default port | Env var | What it is |
|---------|-------------|---------|------------|
| **Web UI** | `7768` | `WEB_PORT` | Login page, admin panel — **this is what you expose to users** |
| API | `7767` | `API_PORT` | Backend API (the web UI talks to this internally) |
| PostgreSQL | `5435` | — | Database (localhost only, not exposed externally) |

**For cloudflared:** Point your tunnel to `http://localhost:7768` (or whatever you set `WEB_PORT` to).

To change ports, set them in `.env`:

```env
WEB_PORT=8080
API_PORT=8081
```

---

## Credentials

All set via `.env`. No hardcoded defaults.

| What | Env var | Description |
|------|---------|-------------|
| Admin email | `ADMIN_EMAIL` | Email to log in as admin |
| Admin password | `ADMIN_PASSWORD` | Password to log in |
| Invite code | `SEED_INVITE_CODE` | Give this to people so they can sign up |

To invite more people after setup, go to **Admin > Invites** in the web UI and create new invite codes.

---

## All Environment Variables

Most of these you don't need to touch for local dev. Only change them when deploying to a server with a real domain.

### Must set (no defaults)

| Variable | What it does | Example |
|----------|-------------|---------|
| `ADMIN_EMAIL` | Admin login email | `admin@yourteam.com` |
| `ADMIN_PASSWORD` | Admin login password | `my-password` |
| `SEED_INVITE_CODE` | First invite code for signups | `WELCOME2024` |

### Optional (have defaults)

| Variable | Default | What it does |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Set to `production` on real servers |
| `ISSUER_URL` | `http://localhost:7768` | Public URL of the accounts UI. Change this when you have a real domain, e.g. `https://accounts.yourdomain.com` |
| `APP_DOMAIN` | *(empty)* | Your domain. If set, all `*.yourdomain.com` subdomains can talk to the API. Leave empty for local dev |
| `CORS_ORIGINS` | `http://localhost:7768,...` | Specific URLs that can talk to the API (comma-separated) |
| `APP_NAME` | `Accounts` | Name shown in the login page UI |
| `POSTGRES_PASSWORD` | `accounts_secret` | Database password. Change for production |

### Example `.env` for production (with a domain)

```env
NODE_ENV=production
ADMIN_EMAIL=admin@yourteam.com
ADMIN_PASSWORD=a-strong-password
SEED_INVITE_CODE=YOUR-CODE
ISSUER_URL=https://accounts.yourdomain.com
APP_DOMAIN=yourdomain.com
POSTGRES_PASSWORD=a-different-strong-password
APP_NAME=MyTeam
```

---

## Using the Auth SDK (for developers)

If you want to add login to your own app using this accounts service, use the `@yaotoshi/auth-sdk`.

<details>
<summary>Click to expand SDK guide</summary>

### Step 1: Register an OAuth client

Go to **http://localhost:7768/admin/clients** and create a new client:

- **Name**: Your app name
- **Slug**: `my-app`
- **Type**: `PUBLIC`
- **Redirect URIs**: `http://localhost:3000/callback`
- **Post-Logout Redirect URIs**: `http://localhost:3000`

Copy the **Client ID** after creating.

### Step 2: Install

```bash
npm install @yaotoshi/auth-sdk
```

### Step 3: Use it

```ts
import { YaotoshiAuth } from '@yaotoshi/auth-sdk';

const auth = new YaotoshiAuth({
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000/callback',
  postLogoutRedirectUri: 'http://localhost:3000',
  accountsUrl: 'http://localhost:7768',
});

// Login — redirects user to accounts service
auth.login();

// On your /callback page — exchanges the code for a token
const { user } = await auth.handleCallback();
console.log(user.email);

// Check if logged in
auth.isAuthenticated(); // true/false (checks token expiry too)

// Get user info
const user = await auth.getUser();

// Logout — revokes session, clears token, redirects
await auth.logout();
```

### Config options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `clientId` | Yes | — | From the admin UI |
| `redirectUri` | Yes | — | Your app's callback URL |
| `accountsUrl` | Yes | — | Where the accounts service runs |
| `postLogoutRedirectUri` | No | — | Where to go after logout |
| `scopes` | No | `['openid', 'email']` | What data to request |
| `apiPathPrefix` | No | `'/api/proxy'` | Set to `''` if connecting directly to the API |

### Full React example

```tsx
import { YaotoshiAuth } from '@yaotoshi/auth-sdk';
import { useEffect, useState } from 'react';

const auth = new YaotoshiAuth({
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000/callback',
  postLogoutRedirectUri: 'http://localhost:3000',
  accountsUrl: 'http://localhost:7768',
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

### Security note

The SDK stores tokens in `localStorage` (same as Auth0, Firebase). If your app has an XSS vulnerability, tokens could be exposed. Mitigate with a strong Content-Security-Policy header.

</details>

---

## Commands

```bash
docker compose up -d              # Start
docker compose down               # Stop
docker compose logs -f api        # View API logs
docker compose down -v            # Stop + delete all data

docker compose exec api npx prisma db seed     # Seed database
docker compose exec api npx prisma studio      # Visual DB browser
```

## API Endpoints

<details>
<summary>Click to expand</summary>

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

</details>

## Deploying to Production

<details>
<summary>Click to expand</summary>

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

</details>

## Documentation

- [Architecture](docs/architecture.md) -- System overview, module boundaries, data model
- [Auth Flow](docs/auth-flow.md) -- Login, signup, OAuth PKCE flow, session lifecycle
- [Security](docs/security.md) -- Hashing, PKCE, rate limiting, audit events
- [Deployment](docs/deployment.md) -- Environment variables, backup/restore, server migration
- [Tasks](TASKS.md) -- Backlog
- [Decisions](DECISIONS.md) -- Technical decisions with rationale
