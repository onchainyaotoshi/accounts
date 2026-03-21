[![Publish @yaotoshi/auth-sdk](https://github.com/onchainyaotoshi/accounts/actions/workflows/publish-auth-sdk.yml/badge.svg)](https://github.com/onchainyaotoshi/accounts/actions/workflows/publish-auth-sdk.yml)
[![npm](https://img.shields.io/npm/v/@yaotoshi/auth-sdk)](https://www.npmjs.com/package/@yaotoshi/auth-sdk)

# Accounts Service

Centralized authentication service. Invite-only registration, session-based auth, and OAuth 2.0 with PKCE.

---

## Setup

```bash
cp .env.example .env
```

Edit `.env`:

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

All config is in `.env`.

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

### Domain

Only needed when deploying with a real domain. Skip for local dev.

**`APP_DOMAIN`** — your root domain. When set, all subdomains of this domain can talk to the API.

```env
APP_DOMAIN=example.com
```

This means:
- `app.example.com` — allowed
- `admin.example.com` — allowed
- `accounts.example.com` — allowed
- `anything.example.com` — allowed
- `evil.com` — blocked

**`ISSUER_URL`** — the public URL where the accounts web UI is accessible. Users see this URL in their browser.

```env
ISSUER_URL=https://accounts.example.com
```

**`CORS_ORIGINS`** — you usually don't need this. `APP_DOMAIN` already covers all your subdomains. Only set `CORS_ORIGINS` if you need to allow an origin outside your domain (e.g. an external partner's site).

```env
# Only needed for origins OUTSIDE your APP_DOMAIN:
CORS_ORIGINS=https://partner-site.com,https://external-tool.io
```

**In short:** for most setups, just set these two:

```env
APP_DOMAIN=example.com
ISSUER_URL=https://accounts.example.com
```

### Email (for password reset)

Password reset sends a link to the user's email via [Resend](https://resend.com). Optional — if not configured, reset links are logged to console instead.

Setup:
1. Create account at [resend.com](https://resend.com)
2. Verify your parent domain (e.g. `example.com`) — add the DNS records Resend gives you
3. Copy your API key
4. Set in `.env`:

```env
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@accounts.example.com
```

After verifying `example.com`, you can send from any subdomain (`noreply@accounts.example.com`, `noreply@app.example.com`, etc.) without extra verification.

| Variable | Default | Description |
|----------|---------|-------------|
| `RESEND_API_KEY` | *(empty)* | API key from resend.com. If not set, reset emails are logged to console |
| `EMAIL_FROM` | `noreply@example.com` | Sender address |

### Other

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | `Accounts` | Brand name shown in the web UI |
| `NODE_ENV` | `development` | Set to `production` on real servers |
| `POSTGRES_PASSWORD` | `accounts_secret` | Database password — change for production |

### Example `.env` for production

```env
NODE_ENV=production

# Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=a-strong-password
SEED_INVITE_CODE=YOUR-CODE

# Domain
APP_DOMAIN=example.com
ISSUER_URL=https://accounts.example.com

# Email
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@accounts.example.com

# Other
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

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Domain (example.com)                │
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  Your App         │    │  Accounts Service │                  │
│  │  app.example.com  │    │  accounts.example.com               │
│  │                   │    │                   │                  │
│  │  - Your app UI    │    │  - Login page     │                  │
│  │  - Your features  │    │  - Admin panel    │                  │
│  │  - Uses SDK/API   │    │  - User management│                  │
│  │                   │    │  - OAuth/PKCE     │                  │
│  └────────┬──────────┘    └────────┬──────────┘                  │
│           │                        │                             │
│           │   1. Login click       │                             │
│           │ ──────────────────────>│                             │
│           │                        │  2. User enters             │
│           │                        │     email + password        │
│           │   3. Redirect back     │                             │
│           │   with auth code       │                             │
│           │ <──────────────────────│                             │
│           │                        │                             │
│           │   4. Exchange code     │                             │
│           │   for access token     │                             │
│           │ ──────────────────────>│                             │
│           │                        │                             │
│           │   5. Token returned    │                             │
│           │ <──────────────────────│                             │
│           │                        │                             │
│           │   6. GET /me           │                             │
│           │   (who is this user?)  │                             │
│           │ ──────────────────────>│                             │
│           │                        │                             │
│           │   7. User info         │                             │
│           │   { email, id }        │                             │
│           │ <──────────────────────│                             │
│           │                        │                             │
└───────────┴────────────────────────┴─────────────────────────────┘

         ┌──────────────────────────────┐
         │         PostgreSQL           │
         │  - Users                     │
         │  - Sessions                  │
         │  - OAuth clients             │
         │  - Invite codes              │
         │  - Audit logs                │
         └──────────────────────────────┘
```

**Login flow in short:**
1. User clicks "Sign in" in your app
2. SDK redirects user to accounts service login page
3. User logs in with email + password
4. Accounts service redirects back to your app with a code
5. SDK exchanges the code for an access token (PKCE protects this)
6. Your app calls `/me` to get user info
7. User is now logged in to your app

**Multiple apps, one login:**
```
  app.example.com ──────┐
                        │
  dashboard.example.com ├──── accounts.example.com ──── PostgreSQL
                        │         (one login for all)
  admin.example.com ────┘
```

Users sign up once, log in to any app. Admins manage users, invites, and clients from one place.

**Logout flow:**

```
With postLogoutRedirectUri set:

  Your App                    Accounts Service
     │                              │
     │  1. User clicks logout       │
     │ ────────────────────────────>│
     │                              │  2. Session revoked
     │  3. Redirect back to app     │
     │ <────────────────────────────│
     │                              │
     ▼                              │
  User is back on your app          │
  (e.g. app.example.com)            │


Without postLogoutRedirectUri:

  Your App                    Accounts Service
     │                              │
     │  1. User clicks logout       │
     │ ────────────────────────────>│
     │                              │  2. Session revoked
     │                              │
     │                              ▼
     │                          User stays on
     │                          accounts login page
     │                          (accounts.example.com/login)
```

Set `postLogoutRedirectUri` if you want users to return to your app after logout. If not set, they end up on the accounts login page.

To configure:
- **In SDK:** `postLogoutRedirectUri: 'https://app.example.com'` in the constructor
- **In admin panel:** Register the same URL in the client's **Post-Logout Redirect URIs**
- Both must match — the accounts service validates the redirect URL against the registered list

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
| `redirectUri` | Yes | — | Your callback URL (must be registered in the client) |
| `accountsUrl` | Yes | — | Accounts service URL |
| `postLogoutRedirectUri` | No | — | Where to redirect after logout. If not set, user stays on the accounts login page after logout. Set this if you want users to return to your app. Must be registered in the client's Post-Logout Redirect URIs |
| `scopes` | No | `['openid', 'email']` | OAuth scopes |
| `apiPathPrefix` | No | `'/api/proxy'` | Set to `''` for direct API access |

### Backend integration (without SDK)

If your app has a backend (Node.js, Python, etc.) and you don't use the SDK, you need these env vars:

```env
ACCOUNTS_URL=https://accounts.example.com    # accounts service URL
OAUTH_CLIENT_ID=your-client-id               # from Admin > Clients
OAUTH_REDIRECT_URI=http://localhost:3000/callback  # your callback URL
OAUTH_POST_LOGOUT_REDIRECT_URI=http://localhost:3000  # optional — where to go after logout
```

Your backend should:
1. Redirect users to `{ACCOUNTS_URL}/authorize?client_id=...&redirect_uri=...&response_type=code&code_challenge=...&code_challenge_method=S256&state=...`
2. Handle the callback: exchange the auth code at `POST {ACCOUNTS_URL}/token`
3. Validate tokens: call `GET {ACCOUNTS_URL}/me` with `Authorization: Bearer <token>`
4. Logout: `POST {ACCOUNTS_URL}/logout` with `{ token, client_id, post_logout_redirect_uri }`

`post_logout_redirect_uri` is optional. If not provided, the user stays on the accounts login page after logout. If provided, the user is redirected back to your app.

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
ACCOUNTS_HOSTNAME=accounts.example.com \
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
