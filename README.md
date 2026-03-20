[![Publish @yaotoshi/auth-sdk](https://github.com/onchainyaotoshi/accounts/actions/workflows/publish-auth-sdk.yml/badge.svg)](https://github.com/onchainyaotoshi/accounts/actions/workflows/publish-auth-sdk.yml)
[![npm](https://img.shields.io/npm/v/@yaotoshi/auth-sdk)](https://www.npmjs.com/package/@yaotoshi/auth-sdk)

# accounts.yaotoshi.xyz

Centralized authentication and authorization service for the Yaotoshi ecosystem.

Invite-only user registration, session-based authentication, and OAuth 2.0 authorization code flow with PKCE.

## Stack

- **Runtime:** Node.js + NestJS 11
- **Database:** PostgreSQL 16 + Prisma 6
- **Infrastructure:** Docker Compose
- **Package Manager:** pnpm 10 (workspace monorepo)

## Quickstart

```bash
# Start all services (PostgreSQL, API, MailHog)
docker compose up -d

# View API logs
docker compose logs -f api

# Verify
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

The API auto-runs database migrations and starts in watch mode.

### Default Credentials

| Resource | Value |
|----------|-------|
| Admin login | `admin@yaotoshi.xyz` / `admin12345678` |
| Invite code | `YAOTOSHI1` |
| Demo client | Configured for `http://localhost:3002` |

### Access Points

| Service | URL |
|---------|-----|
| API | http://localhost:3000 |
| MailHog UI | http://localhost:8025 |
| PostgreSQL | localhost:5435 |

## Project Structure

```
accounts/
├── apps/
│   └── api/                    # NestJS backend
│       └── src/
│           ├── auth/           # Login, signup, password reset
│           ├── oauth/          # Authorization code + PKCE, /me
│           ├── sessions/       # User session management
│           ├── admin/          # Admin API (users, invites, clients, audit)
│           ├── users/          # User service
│           ├── invites/        # Invite code service
│           ├── clients/        # OAuth client service
│           ├── audit/          # Audit logging service
│           ├── health/         # Health check endpoints
│           └── common/         # Guards, decorators, crypto, Prisma
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Migration history
│   └── seed.ts                 # Seed data
├── infra/
│   ├── docker/Dockerfile.api   # API container image
│   └── nginx/                  # Reverse proxy config (pending)
├── mcp/                        # MCP tool integration (pending)
├── docs/                       # Architecture and operations docs
├── skills/                     # Claude Code skill definitions
├── scripts/                    # Utility scripts
├── docker-compose.yml
├── package.json
└── pnpm-workspace.yaml
```

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/login | Email + password login |
| POST | /auth/logout | End session |
| POST | /auth/signup-with-invite | Register with invite code |
| POST | /auth/forgot-password | Request reset token |
| POST | /auth/reset-password | Reset password |

### OAuth
| Method | Path | Description |
|--------|------|-------------|
| GET | /authorize | Authorization code request (PKCE) |
| POST | /token | Exchange code for access token |
| GET | /me | Current user info |

### Sessions
| Method | Path | Description |
|--------|------|-------------|
| GET | /sessions | List active sessions |
| DELETE | /sessions/:id | Revoke session |
| DELETE | /sessions/others/all | Revoke all other sessions |

### Admin
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
| GET | /admin/users/:userId/sessions | User's sessions |
| POST | /admin/sessions/:id/revoke | Revoke any session |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Process health |
| GET | /ready | Database connectivity |

## Commands

```bash
# Development
docker compose up -d              # Start all services
docker compose logs -f api        # Watch API logs
docker compose down               # Stop all services
docker compose down -v            # Stop and destroy data

# Database
docker compose exec api pnpm prisma migrate deploy   # Apply migrations
docker compose exec api pnpm prisma db seed           # Run seed
docker compose exec api pnpm prisma studio            # Visual DB browser

# Direct database access
docker compose exec postgres psql -U accounts accounts_db
```

## Documentation

- [Architecture](docs/architecture.md) -- System overview, module boundaries, data model
- [Auth Flow](docs/auth-flow.md) -- Login, signup, OAuth PKCE flow, session lifecycle
- [Security](docs/security.md) -- Hashing, PKCE, rate limiting, audit events
- [Deployment](docs/deployment.md) -- Environment variables, backup/restore, server migration
- [Development Rules](docs/development-rules.md) -- Code conventions for Claude Code
- [MCP](docs/mcp.md) -- MCP tool integration plans
- [Tasks](TASKS.md) -- MVP backlog
- [Decisions](DECISIONS.md) -- Technical decisions with rationale
