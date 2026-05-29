import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as api from "./api.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "aeonpass",
    version: "1.0.0",
  });

  // ── Techaeon Tools ──

  server.tool(
    "get_techaeon",
    "Get full details of a single techaeon by ID, including status, holder info, group, and redirect URL",
    { id: z.string().describe("Techaeon GUID") },
    async ({ id }) => ({
      content: [{ type: "text", text: JSON.stringify(await api.getTechaeon(id), null, 2) }],
    })
  );

  server.tool(
    "list_techaeons",
    "List techaeons with pagination, filtering by group/status/search, and sorting. Returns holder details for each.",
    {
      groupId: z.string().optional().describe("Filter to a specific group"),
      pageNo: z.number().optional().describe("Page number (1-based)"),
      pageSize: z.number().optional().describe("Results per page"),
      sortBy: z.string().optional().describe("Field to sort by (e.g. CreatedOn, StatusCode)"),
      sortDirection: z.enum(["asc", "desc"]).optional(),
      searchTerm: z.string().optional().describe("Search holder name, email, phone, or techaeon code"),
      unUsedOnly: z.boolean().optional().describe("Only return unconsumed techaeons"),
      resourceType: z.string().optional().describe("Filter by resource type (e.g. EVENT)"),
      resourceValue: z.string().optional().describe("Filter by resource value (e.g. event ID)"),
      statusId: z.string().optional().describe("Filter by status GUID"),
      privilegeId: z.string().optional().describe("Filter by privilege GUID"),
      privilegeCode: z.string().optional().describe("Filter by privilege code (e.g. ENTRY)"),
    },
    async (params) => ({
      content: [{ type: "text", text: JSON.stringify(await api.listTechaeons(params), null, 2) }],
    })
  );

  server.tool(
    "create_techaeon",
    "Create a new techaeon and assign it to a holder. Status starts as CREATED.",
    {
      firstName: z.string().describe("Holder's first name (required)"),
      lastName: z.string().optional().describe("Holder's last name"),
      email: z.string().optional().describe("Holder's email (required if no phone)"),
      phone: z.string().optional().describe("Holder's phone with country code (required if no email)"),
      redirectUrl: z.string().optional().describe("URL to redirect to on scan"),
      eventId: z.string().optional().describe("Event GUID to auto-assign Entry privilege"),
      groupId: z.string().optional().describe("Group GUID to assign this techaeon to"),
    },
    async ({ firstName, lastName, email, phone, redirectUrl, eventId, groupId }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            await api.createTechaeon({
              redirectUrl,
              eventId,
              groupId,
              techaeonHolder: { firstName, lastName, email, phone },
            }),
            null,
            2
          ),
        },
      ],
    })
  );

  server.tool(
    "update_techaeon_status",
    "Change the lifecycle status of a techaeon. Valid codes: CREATED, ISSUED, TRANSFERRED, CANCELLED, CONSUMED",
    {
      id: z.string().describe("Techaeon GUID"),
      statusCode: z
        .enum(["CREATED", "ISSUED", "TRANSFERRED", "CANCELLED", "CONSUMED"])
        .describe("New status code"),
    },
    async ({ id, statusCode }) => ({
      content: [
        { type: "text", text: JSON.stringify(await api.updateTechaeonStatus(id, statusCode), null, 2) },
      ],
    })
  );

  server.tool(
    "update_techaeon_redirect",
    "Set or clear the redirect URL for a techaeon",
    {
      id: z.string().describe("Techaeon GUID"),
      redirectUrl: z.string().nullable().describe("New redirect URL, or null to remove"),
    },
    async ({ id, redirectUrl }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await api.updateTechaeonRedirect(id, redirectUrl), null, 2),
        },
      ],
    })
  );

  server.tool(
    "delete_techaeon",
    "Permanently delete a techaeon. This is irreversible.",
    { id: z.string().describe("Techaeon GUID") },
    async ({ id }) => ({
      content: [{ type: "text", text: JSON.stringify(await api.deleteTechaeon(id), null, 2) }],
    })
  );

  // ── Group Tools ──

  server.tool(
    "list_groups",
    "List techaeon groups with pagination, sorting, and search",
    {
      pageNo: z.number().optional().describe("Page number (1-based)"),
      pageSize: z.number().optional().describe("Results per page"),
      sortBy: z.string().optional().describe("Field to sort by (e.g. GroupName, CreatedOn)"),
      sortDirection: z.enum(["asc", "desc"]).optional(),
      searchTerm: z.string().optional().describe("Search group names"),
    },
    async (params) => ({
      content: [{ type: "text", text: JSON.stringify(await api.listGroups(params), null, 2) }],
    })
  );

  server.tool(
    "create_group",
    "Create a techaeon group and bulk-generate techaeons within it",
    {
      groupName: z.string().describe("Display name for the group"),
      noOfTechaeons: z.number().describe("Number of techaeons to generate"),
      eventId: z.string().optional().describe("Event GUID to link and auto-assign Entry privileges"),
      redirectUrl: z.string().optional().describe("Redirect URL for all techaeons in the group"),
      isTechaeonCodeEnabled: z
        .boolean()
        .optional()
        .describe("Generate unique short codes for QR/manual entry"),
    },
    async (params) => ({
      content: [{ type: "text", text: JSON.stringify(await api.createGroup(params), null, 2) }],
    })
  );

  server.tool(
    "update_group",
    "Update an existing techaeon group's name, event link, redirect URL, or code settings",
    {
      id: z.string().describe("Group GUID"),
      groupName: z.string().describe("Updated group name"),
      eventId: z.string().optional().describe("Event GUID to link"),
      redirectUrl: z.string().optional().describe("Redirect URL (null/empty to remove)"),
      isTechaeonCodeEnabled: z.boolean().optional().describe("Toggle short code generation"),
    },
    async ({ id, ...params }) => ({
      content: [{ type: "text", text: JSON.stringify(await api.updateGroup(id, params), null, 2) }],
    })
  );

  return server;
}
