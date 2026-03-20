# MCP (Model Context Protocol) Integration

## Overview

The accounts service is structured to support MCP tool integration for AI-assisted administration and development workflows. MCP configuration and server definitions are organized under the `/mcp` directory.

## Directory Structure

```
mcp/
├── config/     # MCP client configurations
└── servers/    # MCP server implementations
```

## Current Status

The MCP infrastructure is scaffolded but not yet populated with tool implementations. The project is designed to expose the following categories of tools:

## Planned MCP Tools

### User Management Tools

- **list-users** -- Query users with pagination and filters
- **get-user** -- Retrieve user details by ID or email
- **suspend-user** -- Suspend a user account
- **activate-user** -- Reactivate a suspended user

### Invite Management Tools

- **create-invite** -- Generate a new invite code with optional email assignment and expiry
- **list-invites** -- Query invite codes with usage stats
- **revoke-invite** -- Revoke an active invite code

### Client Management Tools

- **create-client** -- Register a new OAuth client with redirect URIs
- **list-clients** -- Query registered OAuth clients
- **update-client** -- Modify client settings (redirect URIs, scopes, status)

### Session Management Tools

- **list-user-sessions** -- View active sessions for a user
- **revoke-session** -- Revoke a specific session
- **revoke-all-sessions** -- Revoke all sessions for a user

### Audit Tools

- **query-audit-logs** -- Search audit logs by event type, user, date range
- **get-login-failures** -- Retrieve recent failed login attempts

### Database Tools

- **run-migration** -- Apply pending Prisma migrations
- **check-migration-status** -- Report on migration state
- **seed-database** -- Run the seed script

## Implementation Approach

MCP servers will be implemented as lightweight Node.js scripts that:

1. Connect to the PostgreSQL database using PrismaClient
2. Expose tools following the MCP specification
3. Validate inputs and return structured responses
4. Respect the same security boundaries as the API (audit logging, authorization)

## Configuration

MCP clients (Claude Desktop, Claude Code, etc.) will be configured to connect to these servers via the config files in `mcp/config/`.

Example configuration structure:
```json
{
  "mcpServers": {
    "accounts-admin": {
      "command": "node",
      "args": ["mcp/servers/admin.js"],
      "env": {
        "DATABASE_URL": "postgresql://..."
      }
    }
  }
}
```
