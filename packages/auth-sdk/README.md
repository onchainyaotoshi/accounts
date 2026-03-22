# @yaotoshi/auth-sdk

Browser SDK for integrating with a Yaotoshi Accounts service. Handles OAuth 2.0 + PKCE login, token management, and logout.

## Install

```bash
npm install @yaotoshi/auth-sdk
```

## Quick Start

```ts
import { YaotoshiAuth } from '@yaotoshi/auth-sdk';

const auth = new YaotoshiAuth({
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000/callback',
  postLogoutRedirectUri: 'http://localhost:3000',
  accountsUrl: 'http://localhost:9999',
});
```

### Login

```ts
// Redirects the user to the accounts service login page
auth.login();
```

### Handle Callback

On your `/callback` page:

```ts
const { accessToken, user, scope, expiresIn } = await auth.handleCallback();
// user.email, user.sub (unique ID)
// expiresIn: token lifetime in seconds
```

### Check Auth Status

```ts
// Returns false if no token or token is expired
auth.isAuthenticated();
```

### Get User Info

```ts
const user = await auth.getUser();
// { sub: 'user-id', email: 'user@example.com', email_verified: true }
```

### Get Access Token

```ts
const token = auth.getAccessToken();
// Use in Authorization header for your own API calls
```

### Logout

```ts
// Revokes the session on the server, clears local token, redirects to postLogoutRedirectUri
await auth.logout();
```

## Config Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `clientId` | Yes | — | OAuth client ID (from the accounts admin panel) |
| `redirectUri` | Yes | — | Your app's callback URL (must be registered in the OAuth client) |
| `accountsUrl` | Yes | — | Base URL of the accounts service |
| `postLogoutRedirectUri` | No | — | Where to redirect after logout. If not set, user stays on the accounts login page |
| `scopes` | No | `['openid', 'email']` | OAuth scopes to request |
| `apiPathPrefix` | No | `'/api/proxy'` | API path prefix. Use `''` if connecting directly to the API |
| `proxyBaseUrl` | No | — | Base URL for a same-origin backend proxy. When set, API calls go here instead of `accountsUrl`. See [Cross-Origin Setup](#cross-origin-setup-different-domain) |
| `storagePrefix` | No | `'yaotoshi_auth'` | Prefix for localStorage/sessionStorage keys |

## Setup

Before using the SDK, you need an OAuth client registered in the accounts service:

1. Open the accounts admin panel
2. Go to **Admin > Clients**
3. Create a new client with:
   - **Type**: `PUBLIC`
   - **Redirect URIs**: your callback URL (e.g. `http://localhost:3000/callback`)
   - **Post-Logout Redirect URIs**: your app URL (e.g. `http://localhost:3000`)
4. Copy the **Client ID**

## React Example

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

## Cross-Origin Setup (Different Domain)

If your app runs on a different domain than the accounts service (e.g. `app.example.com` → `accounts.example.com`), the SDK's API calls will be cross-origin. You have two options:

### Option A: Backend Proxy (Recommended)

Route API calls through your own backend to avoid CORS entirely. Set `proxyBaseUrl` to point at your backend proxy endpoint:

```ts
const auth = new YaotoshiAuth({
  clientId: 'your-client-id',
  redirectUri: 'https://app.example.com/callback',
  accountsUrl: 'https://accounts.example.com',
  proxyBaseUrl: '/auth/proxy',  // API calls go to /auth/proxy/token, /auth/proxy/me, etc.
});
```

Your backend proxy forwards requests to the accounts API:
- `/auth/proxy/token` → `https://accounts.example.com/api/proxy/token`
- `/auth/proxy/me` → `https://accounts.example.com/api/proxy/me`
- `/auth/proxy/logout` → `https://accounts.example.com/api/proxy/logout`

Login redirects (`auth.login()`) always go directly to `accountsUrl` — browser redirects are not affected by CORS.

### Option B: Configure CORS on Accounts Server

Add your app's origin to `CORS_ORIGINS` on the accounts server:

```env
# In the accounts service .env
CORS_ORIGINS=https://app.example.com,https://other-app.example.com
```

This allows the SDK to make cross-origin requests directly. No `proxyBaseUrl` needed.

For wildcard subdomain support, set `APP_DOMAIN`:

```env
APP_DOMAIN=example.com
# Allows https://*.example.com
```

## Connecting Directly to the API

By default, the SDK sends requests through a Next.js proxy at `/api/proxy/*`. If your app connects directly to the accounts API:

```ts
const auth = new YaotoshiAuth({
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000/callback',
  accountsUrl: 'http://localhost:9998', // direct API URL
  apiPathPrefix: '',                     // no proxy
});
```

## Security

- Tokens are stored in `localStorage` (same approach as Auth0, Firebase)
- PKCE (S256) is used for all OAuth flows
- Token expiry is tracked — `isAuthenticated()` returns `false` when expired
- Mitigate XSS risk with a strong `Content-Security-Policy` header on your app

## Browser Only

This SDK requires `window`, `localStorage`, `sessionStorage`, and `crypto.subtle`. It is designed for browser environments only.

## Links

- [GitHub](https://github.com/onchainyaotoshi/accounts)
- [npm](https://www.npmjs.com/package/@yaotoshi/auth-sdk)

## License

MIT
