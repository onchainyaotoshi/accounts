# Tasks

MVP backlog for accounts service.

## Completed

- [x] Project scaffolding (pnpm monorepo, NestJS app, Docker Compose)
- [x] PostgreSQL setup with Docker volume persistence
- [x] Prisma schema with all core models (User, Session, AuthCode, Client, InviteCode, InviteCodeUsage, PasswordResetToken, AuditLog)
- [x] Initial migration (20260320152307_init)
- [x] Database seed script (admin user, invite code, demo client)
- [x] PrismaService and PrismaModule (shared database access)
- [x] Crypto utilities (Argon2id hashing, token generation, SHA-256 hashing)
- [x] SessionGuard for authenticated endpoints
- [x] CurrentUser and CurrentSessionId decorators
- [x] POST /auth/login (email + password, session cookie)
- [x] POST /auth/logout (session revocation, cookie clearing)
- [x] POST /auth/signup-with-invite (invite-only registration)
- [x] POST /auth/forgot-password (reset token generation)
- [x] POST /auth/reset-password (password update, session revocation)
- [x] GET /authorize (OAuth authorization code with PKCE)
- [x] POST /token (code exchange with PKCE verification)
- [x] GET /me (user info from session token)
- [x] GET /sessions (list user's active sessions)
- [x] DELETE /sessions/:id (revoke specific session)
- [x] DELETE /sessions/others/all (revoke all other sessions)
- [x] Admin: GET /admin/users (list users)
- [x] Admin: GET /admin/invites, POST /admin/invites, POST /admin/invites/:id/revoke
- [x] Admin: GET /admin/clients, POST /admin/clients, PATCH /admin/clients/:id
- [x] Admin: GET /admin/audit-logs
- [x] Admin: GET /admin/users/:userId/sessions, POST /admin/sessions/:id/revoke
- [x] GET /health, GET /ready (health checks)
- [x] Rate limiting on auth endpoints (ThrottlerGuard global + per-endpoint overrides)
- [x] Helmet security headers
- [x] CORS configuration (APP_DOMAIN wildcard + CORS_ORIGINS explicit)
- [x] Audit logging for all security events
- [x] Documentation (architecture, auth-flow, security, deployment, development-rules)
- [x] Admin role enforcement (UserRole enum + AdminGuard)
- [x] Input validation with class-validator on all DTOs (including OAuth endpoints)
- [x] Session lastSeenAt update on authenticated requests (throttled to 5-min intervals)
- [x] Expired record cleanup (daily cron: auth codes, reset tokens, sessions)
- [x] Account lockout after 10 failed login attempts (15-min auto-unlock)
- [x] Common password blocklist on signup and password reset
- [x] OpenID Connect discovery endpoint (/.well-known/openid-configuration)
- [x] Scope enforcement on /authorize (validated against client's registered scopes)
- [x] Post-logout redirect support (validated against client's registered URIs)
- [x] Client secret verification for confidential OAuth clients
- [x] Domain-agnostic deployment (all domains configurable via env vars)
- [x] Nginx reverse proxy template (envsubst-based)
- [x] Security hardening (race conditions, PKCE validation, atomic transactions, CORS, cookie handling)

## Pending

### High Priority

- [ ] Email integration (password reset emails via SMTP/MailHog)
- [ ] Refresh token support for long-lived client sessions

### Medium Priority

- [ ] Email verification flow (send verification email on signup, verify endpoint)
- [ ] User profile update endpoint (change email, change password)
- [ ] Client secret rotation endpoint
- [ ] Pagination metadata in list responses (total count, page info)
- [ ] ID token (JWT) support alongside opaque access tokens
- [ ] CSRF protection for cookie-based auth

### Low Priority

- [ ] Account deletion flow (soft delete with data retention period)
- [ ] Webhook notifications for security events
- [ ] Multi-factor authentication (TOTP)
- [ ] API key authentication for service-to-service calls
- [ ] Request logging middleware (structured JSON logs)
- [ ] Prometheus metrics endpoint
- [ ] E2E test suite for critical flows
- [ ] Rate limiting per-user (not just per-IP)
- [ ] CI/CD pipeline configuration
