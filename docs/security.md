# Security

## Password Hashing

Passwords are hashed with **Argon2id** using the following parameters:

```typescript
argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MB
  timeCost: 3,
  parallelism: 4,
});
```

Argon2id is the recommended algorithm for password hashing (hybrid of Argon2i and Argon2d). The parameters are tuned for server-side use, balancing security against response time.

## Token Generation and Storage

- **Session tokens** and **auth codes** are generated using `crypto.randomBytes(32)` (256-bit entropy), encoded as hex
- Tokens are **never stored in plaintext** -- only SHA-256 hashes are persisted in the database
- Token lookup is always by hash: `hashToken(token) -> lookup by hash`
- **Password reset tokens** follow the same pattern: random generation, hash storage

## PKCE (Proof Key for Code Exchange)

The OAuth authorization code flow requires PKCE (RFC 7636):

1. Client generates a random `code_verifier`
2. Client computes `code_challenge = base64url(SHA-256(code_verifier))`
3. `code_challenge` is sent with the authorization request and stored with the auth code
4. At token exchange, client sends `code_verifier`
5. Server computes SHA-256 of the verifier and compares to stored challenge
6. Only `S256` method is supported (plain is not allowed)

This prevents authorization code interception attacks, which is critical for public clients.

## Redirect URI Validation

- Redirect URIs are registered per-client at creation time
- At authorization, the provided `redirect_uri` must exactly match one of the registered URIs
- No wildcard or pattern matching is used
- This prevents open redirect attacks through the OAuth flow

## Session Security

- Session tokens are set as **httpOnly** cookies (not accessible to JavaScript)
- **Secure** flag is enabled in production (`NODE_ENV === 'production'`)
- **SameSite=Lax** prevents CSRF in most scenarios
- 30-day expiry on both the cookie and the database session record

## Session Revocation

Users can revoke sessions through multiple mechanisms:

| Action | Effect |
|--------|--------|
| `DELETE /sessions/:id` | Revoke a specific session |
| `DELETE /sessions/others/all` | Revoke all sessions except the current one |
| `POST /auth/logout` | Revoke the current session |
| `POST /auth/reset-password` | Revokes ALL sessions for the user |
| `POST /admin/sessions/:id/revoke` | Admin revokes any session |

Revocation is a soft-delete (`revokedAt` timestamp). The SessionGuard checks this on every request.

## Password Reset Rules

- Reset tokens expire after **1 hour**
- Tokens are single-use (marked as consumed after use)
- Successful password reset **revokes all existing sessions** (forces re-authentication everywhere)
- The `POST /auth/forgot-password` endpoint always returns a success message regardless of whether the email exists (prevents email enumeration)

## Rate Limiting

Rate limiting is handled by `@nestjs/throttler`:

| Endpoint | Limit |
|----------|-------|
| `POST /auth/login` | 5 requests / 60 seconds |
| `POST /auth/signup-with-invite` | 3 requests / 60 seconds |
| `POST /auth/forgot-password` | 3 requests / 60 seconds |
| `POST /auth/reset-password` | 3 requests / 60 seconds |

Rate limits are applied per-IP by default.

## Request Security

- **Helmet** middleware is enabled for security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- **CORS** is configured via `CORS_ORIGINS` environment variable (comma-separated origins)
- **cookie-parser** middleware parses session cookies

## Audit Events

All security-relevant actions are logged to the `audit_logs` table:

| Event Type | Trigger |
|------------|---------|
| `LOGIN_SUCCESS` | Successful login |
| `LOGIN_FAILED` | Failed login (with reason: user_not_found, account_not_active, invalid_password) |
| `LOGOUT` | User logout |
| `SIGNUP` | New user registration |
| `INVITE_USED` | Invite code consumed |
| `INVITE_CREATED` | Admin created an invite |
| `INVITE_REVOKED` | Admin revoked an invite |
| `PASSWORD_RESET_REQUEST` | Forgot password initiated |
| `PASSWORD_RESET_COMPLETE` | Password successfully reset |
| `AUTH_CODE_ISSUED` | OAuth authorization code created |
| `TOKEN_ISSUED` | OAuth token exchange completed |
| `SESSION_REVOKED` | Single session revoked |
| `ALL_SESSIONS_REVOKED` | All other sessions revoked |
| `CLIENT_CREATED` | OAuth client registered |
| `CLIENT_UPDATED` | OAuth client updated |

Each audit log records: userId (optional), clientId (optional), eventType, ipAddress, userAgent, metadata (JSON), and timestamp.

## Account Lockout

- **10 consecutive failed logins** triggers a 15-minute lockout
- Lockout is automatic and auto-unlocks after the timeout
- The failed attempt counter resets on successful login
- Password reset also clears the lockout state

## Role-Based Access Control

- `UserRole` enum: `USER`, `ADMIN`
- All `/admin` endpoints are protected by `AdminGuard`
- Guards are chained: `SessionGuard` runs first (authenticates), then `AdminGuard` (authorizes)

## Password Requirements

- Minimum length: 8 characters
- Maximum length: 128 characters
- Checked against a common password blocklist

## Email Integration

- Password reset emails are sent via **Resend** when `RESEND_API_KEY` is configured
- Reset link format: `https://example.com/reset-password?token=<token>`
- If `RESEND_API_KEY` is not set, the reset link is logged to `console.log` as a fallback

## Anti-Enumeration

- Login errors use a generic message ("Invalid email or password") regardless of whether the email exists
- Forgot password always returns success message
- Signup returns "Email already registered" -- this is an acceptable tradeoff for UX since registration is invite-only
