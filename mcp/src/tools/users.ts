import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AccountsApiClient } from "../api-client.js";

export function registerUserTools(server: McpServer, api: AccountsApiClient) {
  server.tool(
    "accounts_list_users",
    "List all users in the accounts system (paginated)",
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
      const result = await api.get("/admin/users", {
        skip: skip ?? 0,
        take: take ?? 50,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "accounts_get_user",
    "Get a user by their email address",
    {
      email: z.string().email().describe("The email address to look up"),
    },
    async ({ email }) => {
      // The admin endpoint lists users; we filter by fetching all and matching.
      // For a direct lookup we use the list endpoint with a small page and rely on the API.
      // Since there's no direct get-by-email admin endpoint, we list and filter.
      const result = await api.get<{
        users: Array<{ id: string; email: string; [key: string]: unknown }>;
        total: number;
      }>("/admin/users", { take: 200 });

      const user = result.users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );

      if (!user) {
        return {
          content: [
            {
              type: "text",
              text: `No user found with email: ${email}`,
            },
          ],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(user, null, 2) }],
      };
    }
  );
}
