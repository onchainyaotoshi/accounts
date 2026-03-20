# Security Skill

## Description

Security practices and implementation details for accounts.yaotoshi.xyz.

## Password Security

- **Algorithm:** Argon2id (memory-hard, GPU-resistant)
- **Parameters:** 64 MB memory, 3 iterations, 4 parallelism
- **Implementation:** `apps/api/src/common/utils/crypto.ts`

## Token Security

- All tokens (session, auth code, reset) are 256-bit random values
- Only SHA-256 hashes are stored in the database
- Tokens are never logged or returned after initial creation (except password reset in dev mode)

## PKCE

- Required for all OAuth authorization code flows
- Only S256 method supported (SHA-256 based)
- Server-side verification: `SHA-256(code_verifier) === stored code_challenge`

## Session Security

- httpOnly cookies (no JS access)
- Secure flag in production
- SameSite=Lax
- 30-day expiry
- Instant revocation via `revokedAt` timestamp
- Password reset revokes all sessions

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| POST /auth/login | 5/min |
| POST /auth/signup-with-invite | 3/min |
| POST /auth/forgot-password | 3/min |
| POST /auth/reset-password | 3/min |

## Anti-Enumeration

- Login: generic "Invalid email or password" for all failure reasons
- Forgot password: always returns success message
- Failed attempts logged to audit with specific reason (for admin review, not client)

## HTTP Security Headers

- Helmet middleware enabled (X-Content-Type-Options, X-Frame-Options, etc.)
- CORS restricted to configured origins

## Audit Trail

Every security event is logged with userId, clientId, eventType, IP address, user agent, and metadata. Key events:

- LOGIN_SUCCESS, LOGIN_FAILED
- LOGOUT
- SIGNUP, INVITE_USED
- PASSWORD_RESET_REQUEST, PASSWORD_RESET_COMPLETE
- AUTH_CODE_ISSUED, TOKEN_ISSUED
- SESSION_REVOKED, ALL_SESSIONS_REVOKED
- INVITE_CREATED, INVITE_REVOKED
- CLIENT_CREATED, CLIENT_UPDATED

## Security Checklist for New Features

- [ ] Are user inputs validated with class-validator DTOs?
- [ ] Are sensitive operations behind SessionGuard?
- [ ] Are rate limits applied to abuse-prone endpoints?
- [ ] Are audit events logged for security-relevant actions?
- [ ] Are error messages generic (no internal details leaked)?
- [ ] Are tokens hashed before storage?
- [ ] Is redirect URI validated against registered URIs?
