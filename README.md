[![Publish @yaotoshi/auth-sdk](https://github.com/onchainyaotoshi/accounts/actions/workflows/publish-auth-sdk.yml/badge.svg)](https://github.com/onchainyaotoshi/accounts/actions/workflows/publish-auth-sdk.yml)
[![npm](https://img.shields.io/npm/v/@yaotoshi/auth-sdk)](https://www.npmjs.com/package/@yaotoshi/auth-sdk)

# Accounts Service

Centralized authentication service. Invite-only registration, session-based auth, and OAuth 2.0 with PKCE.

---

## Setup

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
ADMIN_EMAIL=admin@yourteam.com
ADMIN_PASSWORD=your-password
SEED_INVITE_CODE=YOUR-INVITE-CODE
```

Start and seed:

```bash
docker compose up -d
docker compose exec api npx prisma db seed   # first time only
```

Open **http://localhost:9999** and log in.

For cloudflared:

```bash
cloudflared tunnel --url http://localhost:9999
```

---

## Configuration

All config is in `.env`. Below is every variable you can set.

### Credentials (required, no defaults)

| Variable | Description |
|----------|-------------|
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin login password |
| `SEED_INVITE_CODE` | Invite code for signups — share with your team |

### Ports

| Variable | Default | Description |
|----------|---------|-------------|
| `WEB_PORT` | `9999` | Web UI — **point cloudflared here** |
| `API_PORT` | `9998` | Backend API |
| `DB_PORT` | `9997` | PostgreSQL |

Example — change web UI to port 8080:

```env
WEB_PORT=8080
```

Then tunnel with `cloudflared tunnel --url http://localhost:8080`.

### Domain and CORS (only needed with a real domain)

Skip these for local dev. Only set when deploying with a domain name.

| Variable | Default | Description |
|----------|---------|-------------|
| `ISSUER_URL` | `http://localhost:9999` | Public URL of the web UI. Set to `https://accounts.yourdomain.com` in production |
| `APP_DOMAIN` | *(empty)* | Your root domain. If set, all `*.yourdomain.com` subdomains can talk to the API |
| `CORS_ORIGINS` | `http://localhost:9999` | Explicit origins that can talk to the API (comma-separated) |

### Other

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | `Accounts` | Brand name shown in the web UI |
| `NODE_ENV` | `development` | Set to `production` on real servers |
| `POSTGRES_PASSWORD` | `accounts_secret` | Database password — change for production |

### Example `.env` for production

```env
NODE_ENV=production
ADMIN_EMAIL=admin@yourteam.com
ADMIN_PASSWORD=a-strong-password
SEED_INVITE_CODE=YOUR-CODE
ISSUER_URL=https://accounts.yourdomain.com
APP_DOMAIN=yourdomain.com
POSTGRES_PASSWORD=a-strong-db-password
APP_NAME=MyTeam
```

---

## Commands

```bash
docker compose up -d              # Start
docker compose down               # Stop
docker compose logs -f api        # View logs
docker compose down -v            # Stop + delete all data
docker compose exec api npx prisma db seed     # Seed database
docker compose exec api npx prisma studio      # Visual DB browser
```

---

## Auth SDK (for developers)

Add login to your own app using `@yaotoshi/auth-sdk`.

<details>
<summary>Expand SDK guide</summary>

### 1. Register an OAuth client

Go to **Admin > Clients** in the web UI and create a client:

- **Name**: Your app name
- **Slug**: `my-app`
- **Type**: `PUBLIC`
- **Redirect URIs**: `http://localhost:3000/callback`
- **Post-Logout Redirect URIs**: `http://localhost:3000`

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
  postLogoutRedirectUri: 'http://localhost:3000',
  accountsUrl: 'http://localhost:9999',
});

auth.login();                                    // redirect to login
const { user } = await auth.handleCallback();    // on /callback page
auth.isAuthenticated();                          // check login status
const user = await auth.getUser();               // get user info
await auth.logout();                             // logout
```

### Config options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `clientId` | Yes | — | OAuth client ID |
| `redirectUri` | Yes | — | Your callback URL |
| `accountsUrl` | Yes | — | Accounts service URL |
| `postLogoutRedirectUri` | No | — | Redirect after logout |
| `scopes` | No | `['openid', 'email']` | OAuth scopes |
| `apiPathPrefix` | No | `'/api/proxy'` | Set to `''` for direct API access |

### React example

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

### Security

Tokens are stored in `localStorage` (same as Auth0, Firebase). Mitigate XSS risk with a strong Content-Security-Policy header.

</details>

---

## API Endpoints

<details>
<summary>Expand</summary>

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

## Production Deployment

<details>
<summary>Expand</summary>

### 1. Set environment variables

See the [production `.env` example](#example-env-for-production) above.

### 2. Generate nginx config

```bash
ACCOUNTS_HOSTNAME=accounts.yourdomain.com \
  envsubst '${ACCOUNTS_HOSTNAME}' < infra/nginx/accounts.conf.template > infra/nginx/accounts.conf
```

### 3. TLS

The nginx template listens on port 80. Put it behind Cloudflare, Caddy, or nginx with certbot for HTTPS.

</details>

## Docs

- [Architecture](docs/architecture.md)
- [Auth Flow](docs/auth-flow.md)
- [Security](docs/security.md)
- [Deployment](docs/deployment.md)
- [Tasks](TASKS.md)
- [Decisions](DECISIONS.md)
