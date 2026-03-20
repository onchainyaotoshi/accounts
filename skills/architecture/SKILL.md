# Architecture Skill

## Description

Architecture overview for the accounts.yaotoshi.xyz authentication service.

## System Overview

Centralized authentication and authorization service for the Yaotoshi ecosystem. Built with NestJS + Prisma + PostgreSQL, deployed via Docker Compose.

## Module Map

| Module | Path | Purpose |
|--------|------|---------|
| auth | `apps/api/src/auth/` | Login, signup, forgot/reset password |
| oauth | `apps/api/src/oauth/` | Authorization code + PKCE, token exchange, /me |
| sessions | `apps/api/src/sessions/` | User session management (list, revoke) |
| admin | `apps/api/src/admin/` | Admin API for users, invites, clients, audit, sessions |
| users | `apps/api/src/users/` | User CRUD (internal service, no controller) |
| invites | `apps/api/src/invites/` | Invite code lifecycle (internal service) |
| clients | `apps/api/src/clients/` | OAuth client management (internal service) |
| audit | `apps/api/src/audit/` | Audit event logging and querying |
| health | `apps/api/src/health/` | Health and readiness endpoints |
| common | `apps/api/src/common/` | Guards, decorators, pipes, filters, Prisma, crypto utilities |

## API Endpoints

### Auth (`/auth`)
- `POST /auth/login` -- Email + password login
- `POST /auth/logout` -- End current session
- `POST /auth/signup-with-invite` -- Register with invite code
- `POST /auth/forgot-password` -- Request password reset
- `POST /auth/reset-password` -- Reset password with token

### OAuth (root)
- `GET /authorize` -- Authorization code request (requires session)
- `POST /token` -- Exchange code for access token
- `GET /me` -- Get current user info

### Sessions (`/sessions`)
- `GET /sessions` -- List current user's active sessions
- `DELETE /sessions/:id` -- Revoke a specific session
- `DELETE /sessions/others/all` -- Revoke all other sessions

### Admin (`/admin`)
- `GET /admin/users` -- List users
- `GET /admin/invites` -- List invite codes
- `POST /admin/invites` -- Create invite code
- `POST /admin/invites/:id/revoke` -- Revoke invite
- `GET /admin/clients` -- List OAuth clients
- `POST /admin/clients` -- Register OAuth client
- `PATCH /admin/clients/:id` -- Update OAuth client
- `GET /admin/audit-logs` -- Query audit logs
- `GET /admin/users/:userId/sessions` -- List user's sessions
- `POST /admin/sessions/:id/revoke` -- Admin revoke session

### Health (root)
- `GET /health` -- Process health
- `GET /ready` -- Database connectivity check

## Data Models

- **User** -- id, email, passwordHash, status (ACTIVE/SUSPENDED/DELETED)
- **Session** -- id, userId, clientId?, tokenHash, ipAddress, userAgent, expiresAt, revokedAt
- **AuthCode** -- id, codeHash, userId, clientId, redirectUri, codeChallenge, expiresAt, consumedAt
- **Client** -- id, name, slug, clientId, secretHash?, type, redirectUris[], scopes[], status
- **InviteCode** -- id, code, createdByUserId?, assignedEmail?, maxUses, usedCount, expiresAt?, revokedAt?
- **InviteCodeUsage** -- id, inviteCodeId, usedByUserId, usedEmail
- **PasswordResetToken** -- id, userId, tokenHash, expiresAt, consumedAt
- **AuditLog** -- id, userId?, clientId?, eventType, ipAddress, userAgent, metadata, createdAt

## Key Design Decisions

- **Session-based auth** (not JWT) -- tokens are opaque, stored as hashes, revocable instantly
- **Invite-only registration** -- no open signup, controlled growth
- **PKCE required** -- all OAuth flows must use S256 code challenge
- **Audit everything** -- every security event is logged with context
