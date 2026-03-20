import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AccountsApiClient } from "../api-client.js";

export function registerClientTools(
  server: McpServer,
  api: AccountsApiClient
) {
  server.tool(
    "accounts_list_clients",
    "List all registered OAuth clients",
    {},
    async () => {
      const result = await api.get("/admin/clients");
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "accounts_create_client",
    "Register a new OAuth client application",
    {
      name: z.string().describe("Display name for the client"),
      slug: z.string().describe("URL-friendly unique slug for the client"),
      redirectUris: z
        .array(z.string().url())
        .describe("List of allowed redirect URIs"),
      type: z
        .enum(["PUBLIC", "CONFIDENTIAL"])
        .optional()
        .describe("Client type (default: PUBLIC)"),
      postLogoutRedirectUris: z
        .array(z.string().url())
        .optional()
        .describe("List of allowed post-logout redirect URIs (optional)"),
      scopes: z
        .array(z.string())
        .optional()
        .describe("List of allowed scopes (optional)"),
    },
    async ({ name, slug, redirectUris, type, postLogoutRedirectUris, scopes }) => {
      const body: Record<string, unknown> = {
        name,
        slug,
        redirectUris,
      };
      if (type) body.type = type;
      if (postLogoutRedirectUris) body.postLogoutRedirectUris = postLogoutRedirectUris;
      if (scopes) body.scopes = scopes;

      const result = await api.post("/admin/clients", body);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "accounts_update_client",
    "Update an existing OAuth client",
    {
      id: z.string().describe("The client database ID to update"),
      name: z.string().optional().describe("New display name (optional)"),
      redirectUris: z
        .array(z.string().url())
        .optional()
        .describe("New list of allowed redirect URIs (optional)"),
      status: z
        .enum(["ACTIVE", "SUSPENDED"])
        .optional()
        .describe("New client status (optional)"),
    },
    async ({ id, name, redirectUris, status }) => {
      const body: Record<string, unknown> = {};
      if (name) body.name = name;
      if (redirectUris) body.redirectUris = redirectUris;
      if (status) body.status = status;

      const result = await api.patch(`/admin/clients/${id}`, body);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
