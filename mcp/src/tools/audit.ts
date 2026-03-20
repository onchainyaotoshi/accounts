import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AccountsApiClient } from "../api-client.js";

export function registerAuditTools(server: McpServer, api: AccountsApiClient) {
  server.tool(
    "accounts_list_audit_logs",
    "List recent audit log entries from the accounts system",
    {
      skip: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Number of records to skip (default: 0)"),
      take: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of records to return (default: 50, max: 100)"),
    },
    async ({ skip, take }) => {
      const result = await api.get("/admin/audit-logs", {
        skip: skip ?? 0,
        take: take ?? 50,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
