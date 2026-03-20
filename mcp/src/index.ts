#!/usr/bin/env node

/**
 * MCP server for accounts.yaotoshi.xyz administration.
 *
 * Provides tools for managing users, invites, OAuth clients, sessions,
 * and viewing audit logs through the accounts admin API.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AccountsApiClient } from "./api-client.js";
import { registerUserTools } from "./tools/users.js";
import { registerInviteTools } from "./tools/invites.js";
import { registerClientTools } from "./tools/clients.js";
import { registerSessionTools } from "./tools/sessions.js";
import { registerAuditTools } from "./tools/audit.js";

async function main() {
  const api = new AccountsApiClient();

  const server = new McpServer({
    name: "accounts",
    version: "1.0.0",
  });

  // Register all tool groups
  registerUserTools(server, api);
  registerInviteTools(server, api);
  registerClientTools(server, api);
  registerSessionTools(server, api);
  registerAuditTools(server, api);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error starting MCP server:", err);
  process.exit(1);
});
