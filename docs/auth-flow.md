# Authentication Flow

## Login

```
POST /auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "..." }
```

1. Look up user by email
2. Check user status is ACTIVE
3. Check account lockout (10 consecutive failures → 15-minute lockout, auto-unlock)
4. Verify password with Argon2id
5. On success, reset failed login counter
6. Create session (generate random token, store SHA-256 hash)
7. Set `session_token` httpOnly cookie (30-day maxAge)
8. Log `LOGIN_SUCCESS` audit event
9. Return `{ user: { id, email, status } }`

On failure, increments the failed login counter and logs `LOGIN_FAILED` with reason (user_not_found, account_not_active, invalid_password, account_locked). Response is always a generic "Invalid email or password" to prevent enumeration.

**Rate limit:** 5 requests per 60 seconds.

## Signup with Invite

```
POST /auth/signup-with-invite
Content-Type: application/json

{ "email": "new@example.com", "password": "...", "inviteCode": "YAOTOSHI1" }
```

1. Check email is not already registered
2. Validate invite code (exists, not revoked, not expired, uses remaining, email matches if assigned)
3. Create user with Argon2id-hashed password
4. Consume invite (increment usedCount, create InviteCodeUsage)
5. Log `SIGNUP` and `INVITE_USED` audit events
6. Create session and set cookie
7. Return `{ user: { id, email, status } }`

**Rate limit:** 3 requests per 60 seconds.

## OAuth Authorization Code + PKCE Flow

This is the primary mechanism for client applications to authenticate users.

### Step 1: Client Initiates Authorization

Client generates a `code_verifier` (random string) and derives `code_challenge` = base64url(SHA-256(code_verifier)).

```
GET /authorize?
  response_type=code&
  client_id=<client_id>&
  redirect_uri=<registered_uri>&
  scope=openid+email&
  state=<random>&
  code_challenge=<challenge>&
  code_challenge_method=S256
```

- Requires active session (SessionGuard)
- Validates client_id and redirect_uri match a registered client
- Creates an AuthCode (10-minute expiry), stores code_challenge
- Redirects to `redirect_uri?code=<code>&state=<state>`
- Logs `AUTH_CODE_ISSUED`

### Step 2: Client Exchanges Code for Token

```
POST /token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "<code>",
  "client_id": "<client_id>",
  "redirect_uri": "<same_uri>",
  "code_verifier": "<original_verifier>"
}
```

1. Look up auth code by hash
2. Verify not consumed, not expired
3. Verify client_id matches
4. Verify redirect_uri matches exactly
5. Verify PKCE: SHA-256(code_verifier) == stored code_challenge
6. Mark auth code as consumed
7. Create a new session token (linked to both user and client)
8. Log `TOKEN_ISSUED`
9. Return `{ access_token, token_type: "Bearer", expires_in, scope }`

### Step 3: Client Accesses User Info

```
GET /me
Authorization: Bearer <access_token>

-- or with cookie --
GET /me
Cookie: session_token=<token>
```

Returns `{ sub, email, email_verified }`.

## Forgot Password

```
POST /auth/forgot-password
{ "email": "user@example.com" }
```

- Always returns `{ message: "If the email exists, a reset link has been sent" }` (prevents enumeration)
- If user exists, creates a PasswordResetToken (1-hour expiry) and sends a reset link via Resend (when `RESEND_API_KEY` is configured; falls back to `console.log`)
- Logs `PASSWORD_RESET_REQUEST`

**Rate limit:** 3 requests per 60 seconds.

## Reset Password

```
POST /auth/reset-password
{ "token": "<reset_token>", "newPassword": "..." }
```

1. Look up token by SHA-256 hash
2. Verify not consumed and not expired
3. Update user password hash (Argon2id)
4. Mark token as consumed
5. Revoke ALL sessions for that user (security measure)
6. Log `PASSWORD_RESET_COMPLETE`

**Rate limit:** 3 requests per 60 seconds.

## Logout

```
POST /auth/logout
Cookie: session_token=<token>
```

OAuth logout is also `POST` (not `GET`).

1. Extract token from cookie or Authorization header
2. Revoke session (set `revokedAt`)
3. Clear `session_token` cookie
4. Log `LOGOUT` audit event
5. Return 204 No Content

## Session Lifecycle

| State | Description |
|-------|-------------|
| Active | `revokedAt` is null AND `expiresAt` is in the future |
| Expired | `expiresAt` has passed |
| Revoked | `revokedAt` is set (manual revocation or password reset) |

Sessions are validated by `SessionGuard` on every authenticated request:
1. Extract token from cookie or Bearer header
2. SHA-256 hash the token
3. Look up session by hash, include user
4. Reject if session is revoked, expired, or user is not ACTIVE
5. Attach user and session ID to request object
