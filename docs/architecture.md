# Architecture

## System Overview

accounts.example.com is a centralized authentication and authorization service for the Yaotoshi ecosystem. It provides user registration (invite-only), session management, and OAuth 2.0 authorization code flow with PKCE for client applications.

**Stack:** NestJS 11 + Prisma 6 + PostgreSQL 16 + Docker Compose + pnpm workspace monorepo.

**Runtime:** Node.js with Express adapter, deployed as a single API container alongside PostgreSQL and MailHog (dev email).

## Module Boundaries

```
apps/api/src/
├── auth/           # Login, signup, forgot/reset password
├── oauth/          # Authorization code flow, token exchange, /me
├── sessions/       # User-facing session list, revoke, revoke-others
├── admin/          # Admin endpoints: users, invites, clients, audit, sessions
├── users/          # User CRUD service (internal)
├── invites/        # Invite code validation, creation, consumption
├── clients/        # OAuth client registration, redirect URI validation
├── audit/          # Audit log writes and queries
├── health/         # GET /health and GET /ready
├── common/         # Shared: guards, decorators, pipes, filters, prisma, crypto
└── main.ts         # Bootstrap
```

### Dependency Direction

- **Controllers** depend on **Services** only
- **AuthService** orchestrates UsersService, SessionsService, InvitesService, AuditService
- **OAuthService** orchestrates ClientsService, AuditService, PrismaService
- **AdminController** aggregates all services directly (thin controller, no AdminService)
- **AdminGuard** protects all admin endpoints, requiring both SessionGuard authentication and ADMIN role
- **EmailService** (using Resend integration) handles all transactional email sending
- **CleanupService** runs daily via cron to expire and clean up obsolete records (old sessions, expired auth codes, etc.)
- All modules share **PrismaService** as the single database access layer

## Data Model

```
User (1)──(N) Session
User (1)──(N) AuthCode
User (1)──(N) PasswordResetToken
User (1)──(N) AuditLog
User (1)──(N) InviteCode          (created by)
User (1)──(N) InviteCodeUsage     (used by)

Client (1)──(N) AuthCode
Client (1)──(N) Session
Client (1)──(N) AuditLog

InviteCode (1)──(N) InviteCodeUsage
```

### User Model

The User entity includes:
- **Basic fields:** email, passwordHash, firstName, lastName
- **Status:** UserStatus (ACTIVE, SUSPENDED, DELETED)
- **Role:** UserRole (USER or ADMIN) — determines access to administrative endpoints
- **Security:** failedLoginAttempts (incremented on failed login), lockedUntil (account lockout timestamp), lastFailedLoginAt (timestamp of most recent failed attempt)
- **Audit:** createdAt, updatedAt

### Key Enums

- **UserRole:** USER, ADMIN
- **UserStatus:** ACTIVE, SUSPENDED, DELETED
- **ClientType:** PUBLIC, CONFIDENTIAL
- **ClientStatus:** ACTIVE, INACTIVE

## Auth Flow (High Level)

1. User logs in via `POST /auth/login` with email + password
2. Server validates credentials (Argon2id), creates a Session row, returns a `session_token` cookie (httpOnly, secure in prod, sameSite=lax, 30-day expiry)
3. Authenticated requests are validated by `SessionGuard` which looks up the token hash in the sessions table
4. Client apps use OAuth `/authorize` + `/token` flow with PKCE to obtain an access token (which is itself a session token)

## Session Model

- Sessions are **opaque tokens** (32-byte random hex), stored as SHA-256 hashes in the database
- Each session tracks: userId, optional clientId, IP address, user agent, lastSeenAt, expiresAt, revokedAt
- Sessions expire after 30 days
- Revocation is a soft-delete (sets `revokedAt` timestamp)
- Password reset revokes all sessions for that user
- Users can revoke individual sessions or all others via `/sessions`

## Invite Model

- Registration is invite-only via `POST /auth/signup-with-invite`
- InviteCodes have: code (unique), maxUses, usedCount, optional assignedEmail, optional expiresAt, optional revokedAt
- Each usage creates an InviteCodeUsage record linking the invite to the user who consumed it
- Admins create and revoke invites via `/admin/invites`

## Client Model

- OAuth clients are registered via `/admin/clients`
- Each client has: name, slug (unique), clientId (unique), optional clientSecretHash, type (PUBLIC/CONFIDENTIAL), redirectUris[], postLogoutRedirectUris[], scopes[], status
- Redirect URI validation is enforced at authorization time (exact match against registered URIs)
- Client creation generates a random clientId and optionally a clientSecret (returned once, stored as hash)
