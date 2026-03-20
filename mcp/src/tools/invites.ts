import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AccountsApiClient } from "../api-client.js";

export function registerInviteTools(
  server: McpServer,
  api: AccountsApiClient
) {
  server.tool(
    "accounts_list_invites",
    "List all invite codes (paginated)",
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
      const result = await api.get("/admin/invites", {
        skip: skip ?? 0,
        take: take ?? 50,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "accounts_create_invite",
    "Create a new invite code. Optionally assign it to a specific email, set max uses, or set an expiration date.",
    {
      assignedEmail: z
        .string()
        .email()
        .optional()
        .describe("Email address to assign the invite to (optional)"),
      maxUses: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe("Maximum number of times the invite can be used (optional)"),
      expiresAt: z
        .string()
        .optional()
        .describe(
          "ISO 8601 date string for when the invite expires (optional)"
        ),
    },
    async ({ assignedEmail, maxUses, expiresAt }) => {
      const body: Record<string, unknown> = {};
      if (assignedEmail) body.assignedEmail = assignedEmail;
      if (maxUses) body.maxUses = maxUses;
      if (expiresAt) body.expiresAt = expiresAt;

      const result = await api.post("/admin/invites", body);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "accounts_revoke_invite",
    "Revoke an invite code by its ID, making it unusable",
    {
      id: z.string().describe("The invite ID to revoke"),
    },
    async ({ id }) => {
      const result = await api.post(`/admin/invites/${id}/revoke`);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
