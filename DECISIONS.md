# Decisions

Key technical decisions and their rationale.

## Session-Based Auth (Not JWT)

**Decision:** Use opaque session tokens stored as SHA-256 hashes in the database, not JWTs.

**Rationale:**
- Instant revocation: setting `revokedAt` immediately invalidates a session on the next request
- No token size bloat in cookies
- No signature verification complexity or key rotation
- Server-side session state is acceptable for this scale
- Password reset can revoke all sessions atomically

**Tradeoff:** Every authenticated request requires a database lookup. Acceptable for current scale; can add caching later if needed.

## Invite-Only Registration

**Decision:** No open signup. Users must provide a valid invite code to register.

**Rationale:**
- Controlled growth during MVP phase
- Prevents spam accounts
- Creates an auditable chain: every user traces back to an invite and its creator
- Easy to revoke or limit invites

**Tradeoff:** Adds friction to onboarding. Acceptable for a private ecosystem.

## Argon2id for Password Hashing

**Decision:** Use Argon2id with 64 MB memory, 3 iterations, 4 parallelism.

**Rationale:**
- Argon2id is the winner of the Password Hashing Competition and recommended by OWASP
- Memory-hard: resistant to GPU and ASIC attacks
- The chosen parameters balance security with server response time (~100-200ms per hash)

**Tradeoff:** Higher memory usage per request than bcrypt. Each hash operation uses 64 MB.

## PKCE Required for All OAuth Flows

**Decision:** Require PKCE (S256) for all authorization code flows, even for confidential clients.

**Rationale:**
- Prevents authorization code interception attacks
- Required by OAuth 2.1 draft specification
- Simple to implement and verify
- No downside to requiring it

## SHA-256 for Token Storage

**Decision:** Store all tokens (session, auth code, password reset) as SHA-256 hashes, not plaintext.

**Rationale:**
- Database compromise does not expose active tokens
- SHA-256 is fast enough for lookup (no need for slow hash like Argon2 for non-password tokens)
- Standard practice for bearer token storage

## PostgreSQL as Single Database

**Decision:** Use PostgreSQL for everything: user data, sessions, audit logs, auth codes.

**Rationale:**
- Simplicity: one database to back up, migrate, and monitor
- PostgreSQL handles the expected scale easily
- ACID transactions for multi-step operations (e.g., password reset + session revocation)
- JSON column for audit log metadata provides flexibility without a separate schema

**Tradeoff:** If session lookup becomes a bottleneck, could add Redis as a cache layer later.

## Monorepo with pnpm Workspaces

**Decision:** Use a pnpm workspace monorepo with `apps/` and `packages/` directories.

**Rationale:**
- Single repository for all Yaotoshi services
- Shared Prisma schema and types across packages
- Consistent tooling and dependency management
- Future frontend apps will live alongside the API

## NestJS Framework

**Decision:** Use NestJS as the API framework.

**Rationale:**
- Strong TypeScript support with decorators
- Built-in module system maps cleanly to domain boundaries
- First-class support for guards, pipes, interceptors, and filters
- Throttler module for rate limiting
- Large ecosystem and documentation

## Docker Compose for Development

**Decision:** Use Docker Compose for local development with source mounting and hot reload.

**Rationale:**
- Reproducible environment (same PostgreSQL version as production)
- No need to install PostgreSQL locally
- MailHog for email testing without external SMTP
- Source volumes enable hot reload without rebuilding

## Soft Delete for Sessions

**Decision:** Revoked sessions are not deleted; they have a `revokedAt` timestamp set.

**Rationale:**
- Audit trail: can see when sessions were revoked and correlate with audit events
- Simpler revocation logic (update vs delete)
- Can distinguish between expired and revoked sessions

**Tradeoff:** Sessions table grows over time. Will need a cleanup job for old revoked/expired sessions.

## Admin Endpoints Without Role Check

**Decision (temporary):** Admin endpoints are behind SessionGuard but do not check for an admin role.

**Rationale:**
- MVP simplification: the first user is the admin
- Role-based access control is a pending task
- Single-tenant deployment during MVP phase

**Action needed:** Add role/permission system before multi-user production use.

## Cookie-Based Session Delivery

**Decision:** Session tokens are delivered as httpOnly cookies with SameSite=Lax.

**Rationale:**
- httpOnly prevents XSS from accessing the token
- SameSite=Lax prevents most CSRF attacks
- Cookies are automatically sent with requests (no client-side token management)
- OAuth token exchange returns tokens in the response body (for client apps)

## Audit Everything

**Decision:** Log every security-relevant action to the audit_logs table.

**Rationale:**
- Security incident investigation
- Compliance readiness
- Usage analytics (login patterns, invite usage)
- Low overhead: simple INSERT with no complex processing

**Events logged:** login success/failure, logout, signup, invite creation/usage/revocation, password reset, auth code issuance, token exchange, session revocation, client management.
