import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AeonPassClient } from "./api.js";

/**
 * Registers all AeonPass tools against a client. The client carries the API
 * key, so each transport decides where that key comes from — env for stdio,
 * request header for HTTP.
 */
export function createServer(client: AeonPassClient): McpServer {
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
      content: [{ type: "text", text: JSON.stringify(await client.getTechaeon(id), null, 2) }],
    })
  );

  server.tool(
    "list_techaeons",
    "List techaeons with pagination, filtering by group/status/search, and sorting. Returns { data: [...], pagination: { totalCount, page, pageSize, totalPages } }.",
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
      content: [{ type: "text", text: JSON.stringify(await client.listTechaeons(params), null, 2) }],
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
            await client.createTechaeon({
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
        { type: "text", text: JSON.stringify(await client.updateTechaeonStatus(id, statusCode), null, 2) },
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
          text: JSON.stringify(await client.updateTechaeonRedirect(id, redirectUrl), null, 2),
        },
      ],
    })
  );

  server.tool(
    "delete_techaeon",
    "Soft-delete a techaeon (marks it inactive). Returns 204 No Content on success.",
    { id: z.string().describe("Techaeon GUID") },
    async ({ id }) => ({
      content: [{ type: "text", text: JSON.stringify(await client.deleteTechaeon(id), null, 2) }],
    })
  );

  // ── Group Tools ──

  server.tool(
    "list_groups",
    "List techaeon groups with pagination, sorting, and search. Returns { data: [...], pagination: { totalCount, page, pageSize, totalPages } }.",
    {
      pageNo: z.number().optional().describe("Page number (1-based)"),
      pageSize: z.number().optional().describe("Results per page"),
      sortBy: z.string().optional().describe("Field to sort by (e.g. GroupName, CreatedOn)"),
      sortDirection: z.enum(["asc", "desc"]).optional(),
      searchTerm: z.string().optional().describe("Search group names"),
    },
    async (params) => ({
      content: [{ type: "text", text: JSON.stringify(await client.listGroups(params), null, 2) }],
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
      content: [{ type: "text", text: JSON.stringify(await client.createGroup(params), null, 2) }],
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
      content: [{ type: "text", text: JSON.stringify(await client.updateGroup(id, params), null, 2) }],
    })
  );

  // ── Event Tools ──

  server.tool(
    "get_event",
    "Get public details of an event by ID: title, dates, status, type, venue/design reference IDs, ticketing status",
    { id: z.string().describe("Event GUID") },
    async ({ id }) => ({
      content: [{ type: "text", text: JSON.stringify(await client.getEvent(id), null, 2) }],
    })
  );

  // ── Guest Tools ──

  server.tool(
    "list_guests",
    "List guests for an event with pagination, search, and filtering. Returns { data: [...], pagination: { totalCount, page, pageSize, totalPages } }. Each guest includes invitation status.",
    {
      eventId: z.string().describe("Event GUID"),
      pageNo: z.number().optional().describe("Page number (1-based)"),
      pageSize: z.number().optional().describe("Results per page"),
      searchTerm: z.string().optional().describe("Search by name, email, or phone"),
      groupId: z.string().optional().describe("Filter by guest group GUID"),
      designMappingId: z.string().optional().describe("Filter by invitation design GUID"),
      sortBy: z.string().optional().describe("Field to sort by"),
      sortDirection: z.enum(["asc", "desc"]).optional(),
    },
    async ({ eventId, ...params }) => ({
      content: [{ type: "text", text: JSON.stringify(await client.listGuests(eventId, params), null, 2) }],
    })
  );

  server.tool(
    "create_guest",
    "Create a new guest for an event and optionally issue an invitation. groupId is required — use list_guest_groups to find valid IDs.",
    {
      eventId: z.string().describe("Event GUID"),
      firstName: z.string().describe("Guest first name (required)"),
      lastName: z.string().optional(),
      displayName: z.string().optional(),
      phone: z.string().optional().describe("Phone with country code (required if no email)"),
      email: z.string().optional().describe("Email (required if no phone)"),
      groupId: z.string().describe("Guest group GUID (required) — use list_guest_groups to get valid values"),
      isUpdateAllEvent: z.boolean().optional().describe("Apply contact changes to all events for this guest"),
      techaeonCode: z.string().optional().describe("Link a techaeon by its short code"),
      guestCode: z.string().optional().describe("Custom unique code for this guest"),
      invitationDesignMappingId: z.string().optional().describe("Create an invitation using this design GUID"),
      invitationGuestPasses: z.number().optional().describe("Number of passes on the invitation"),
      invitationIsUnlimited: z.boolean().optional().describe("Unlimited passes on the invitation"),
    },
    async ({ eventId, invitationDesignMappingId, invitationGuestPasses, invitationIsUnlimited, ...params }) => {
      const invitation = invitationDesignMappingId
        ? { designMappingId: invitationDesignMappingId, guestPasses: invitationGuestPasses, isUnlimited: invitationIsUnlimited }
        : undefined;
      return {
        content: [{ type: "text", text: JSON.stringify(await client.createGuest({ eventId, ...params, invitation }), null, 2) }],
      };
    }
  );

  server.tool(
    "update_guest",
    "Update an existing guest's details or invitation. groupId is required.",
    {
      id: z.string().describe("Guest GUID"),
      eventId: z.string().describe("Event GUID"),
      firstName: z.string().describe("Guest first name (required)"),
      lastName: z.string().optional(),
      displayName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      groupId: z.string().describe("Guest group GUID (required)"),
      isUpdateAllEvent: z.boolean().optional(),
      techaeonCode: z.string().optional(),
      guestCode: z.string().optional(),
      invitationId: z.string().optional().describe("Invitation GUID to update"),
      invitationDesignMappingId: z.string().optional(),
      invitationGuestPasses: z.number().optional(),
      invitationIsUnlimited: z.boolean().optional(),
      invitationStatusId: z.string().optional().describe("New invitation status GUID"),
    },
    async ({ id, invitationId, invitationDesignMappingId, invitationGuestPasses, invitationIsUnlimited, invitationStatusId, ...params }) => {
      const invitation =
        invitationId && invitationDesignMappingId
          ? { id: invitationId, designMappingId: invitationDesignMappingId, guestPasses: invitationGuestPasses, isUnlimited: invitationIsUnlimited, statusId: invitationStatusId }
          : undefined;
      return {
        content: [{ type: "text", text: JSON.stringify(await client.updateGuest(id, { ...params, invitation }), null, 2) }],
      };
    }
  );

  server.tool(
    "delete_guest",
    "Soft-delete a guest. If invitationId is provided, only that invitation is removed; the guest record stays if other invitations remain.",
    {
      id: z.string().describe("Guest GUID"),
      invitationId: z.string().optional().describe("Remove only this invitation instead of the full guest"),
    },
    async ({ id, invitationId }) => ({
      content: [{ type: "text", text: JSON.stringify(await client.deleteGuest(id, invitationId), null, 2) }],
    })
  );

  server.tool(
    "send_invite",
    "Send or resend invitations to guests in an event. Use sendToAll=true or provide specific guestIds. Updates invitation status to SENT.",
    {
      eventId: z.string().describe("Event GUID"),
      sendToAll: z.boolean().optional().describe("Send to all active guests in the event"),
      guestIds: z.array(z.string()).optional().describe("Specific guest GUIDs to invite"),
      inviteMessageTemplate: z.string().optional().describe("Message template to use for the invite"),
    },
    async (params) => ({
      content: [{ type: "text", text: JSON.stringify(await client.sendInvite(params), null, 2) }],
    })
  );

  server.tool(
    "send_message_to_guests",
    "Send a message to guests in an event via InApp (1), SMS (2), and/or Email (3). Use sendToAll=true or specific guestIds.",
    {
      eventId: z.string().describe("Event GUID"),
      messageBody: z.string().describe("Message text to send"),
      sendToAll: z.boolean().optional().describe("Send to all active guests (excludes DECLINED)"),
      guestIds: z.array(z.string()).optional().describe("Specific guest GUIDs"),
      typeIds: z.array(z.number()).optional().describe("Channel IDs: 1=InApp, 2=SMS, 3=Email"),
      designMappingId: z.string().optional().describe("Scope to guests with this invitation design"),
    },
    async (params) => ({
      content: [{ type: "text", text: JSON.stringify(await client.sendMessageToGuests(params), null, 2) }],
    })
  );

  // ── Contact Tools ──

  server.tool(
    "list_contacts",
    "List contacts for an organization with pagination and search. Returns { data: [...], pagination }.",
    {
      organizationId: z.string().describe("Organization GUID"),
      pageNo: z.number().optional(),
      pageSize: z.number().optional(),
      searchTerm: z.string().optional(),
      sortBy: z.string().optional(),
      sortDirection: z.enum(["asc", "desc"]).optional(),
      includeAll: z.boolean().optional().describe("Include all contacts (default true)"),
    },
    async ({ organizationId, ...params }) => ({
      content: [{ type: "text", text: JSON.stringify(await client.listContacts(organizationId, params), null, 2) }],
    })
  );

  server.tool(
    "get_contact",
    "Get full details of a single contact by ID",
    { id: z.string().describe("Contact GUID") },
    async ({ id }) => ({
      content: [{ type: "text", text: JSON.stringify(await client.getContact(id), null, 2) }],
    })
  );

  server.tool(
    "create_contact",
    "Create a new contact for an organization. firstName and organizationId are required. At least one of phone or email should be provided.",
    {
      organizationId: z.string().describe("Organization GUID"),
      firstName: z.string().describe("Required"),
      lastName: z.string().optional(),
      displayName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional().describe("Include country code, e.g. +12025550191"),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      zip: z.string().optional(),
      socialHandle: z.string().optional(),
    },
    async (params) => ({
      content: [{ type: "text", text: JSON.stringify(await client.createContact(params), null, 2) }],
    })
  );

  server.tool(
    "update_contact",
    "Update an existing contact's details. firstName and organizationId are required.",
    {
      id: z.string().describe("Contact GUID"),
      organizationId: z.string().describe("Organization GUID"),
      firstName: z.string().describe("Required"),
      lastName: z.string().optional(),
      displayName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      userId: z.string().optional().describe("Link to a platform user account GUID"),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      zip: z.string().optional(),
      socialHandle: z.string().optional(),
    },
    async ({ id, ...params }) => ({
      content: [{ type: "text", text: JSON.stringify(await client.updateContact(id, params), null, 2) }],
    })
  );

  server.tool(
    "delete_contact",
    "Soft-delete a contact (marks inactive)",
    { id: z.string().describe("Contact GUID") },
    async ({ id }) => ({
      content: [{ type: "text", text: JSON.stringify(await client.deleteContact(id), null, 2) }],
    })
  );

  server.tool(
    "send_message_to_contacts",
    "Send a message to specific contacts via InApp (1), SMS (2), and/or Email (3).",
    {
      organizationId: z.string().describe("Organization GUID"),
      messageBody: z.string().describe("Message text"),
      contactIds: z.array(z.string()).describe("Contact GUIDs to message"),
      typeIds: z.array(z.number()).optional().describe("Channel IDs: 1=InApp, 2=SMS, 3=Email"),
    },
    async (params) => ({
      content: [{ type: "text", text: JSON.stringify(await client.sendMessageToContacts(params), null, 2) }],
    })
  );

  server.tool(
    "upload_contacts",
    "Bulk create or update contacts from a list. Matches existing contacts by phone/email and upserts. Returns counts of new/updated/error records.",
    {
      organizationId: z.string().describe("Organization GUID"),
      contacts: z.array(
        z.object({
          firstName: z.string(),
          lastName: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          state: z.string().optional(),
          country: z.string().optional(),
        })
      ).describe("List of contacts to import"),
    },
    async (params) => ({
      content: [{ type: "text", text: JSON.stringify(await client.uploadContacts(params), null, 2) }],
    })
  );

  server.tool(
    "list_guest_groups",
    "Get all guest groups available for an organization (org-specific + system defaults). Use the returned IDs when creating or updating guests.",
    { organizationId: z.string().describe("Organization GUID") },
    async ({ organizationId }) => ({
      content: [{ type: "text", text: JSON.stringify(await client.listGuestGroups(organizationId), null, 2) }],
    })
  );

  return server;
}
