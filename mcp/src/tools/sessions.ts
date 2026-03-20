import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AccountsApiClient } from "../api-client.js";

export function registerSessionTools(
  server: McpServer,
  api: AccountsApiClient
) {
  server.tool(
    "accounts_list_user_sessions",
    "List all active sessions for a specific user",
    {
      userId: z.string().describe("The user ID to list sessions for"),
    },
    async ({ userId }) => {
      const result = await api.get(`/admin/users/${userId}/sessions`);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "accounts_revoke_session",
    "Revoke a specific session, forcing the user to re-authenticate",
    {
      sessionId: z.string().describe("The session ID to revoke"),
      userId: z.string().describe("The user ID who owns the session"),
    },
    async ({ sessionId, userId }) => {
      const result = await api.post(
        `/admin/sessions/${sessionId}/revoke`,
        undefined,
        { userId }
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
