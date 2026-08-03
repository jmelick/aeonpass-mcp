const BASE_URL = "https://apv2-gatewayapp-prod-westus3.azurewebsites.net";

function getApiKey(): string {
  const key = process.env.AEONPASS_API_KEY;
  if (!key) throw new Error("AEONPASS_API_KEY environment variable is not set");
  return key;
}

async function request(
  method: string,
  path: string,
  body?: unknown,
  query?: Record<string, string | undefined>
): Promise<unknown> {
  const url = new URL(path, BASE_URL);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, v);
      }
    }
  }

  const headers: Record<string, string> = {
    "X-API-KEY": getApiKey(),
  };

  const hasBody = method !== "GET" && method !== "DELETE";
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: hasBody ? JSON.stringify(body ?? {}) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${text}`);
  }

  if (!text) return { success: true };
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ── Techaeons ──

export async function getTechaeon(id: string) {
  return request("GET", `/api/portal/techaeon/${id}`);
}

export async function createTechaeon(params: {
  redirectUrl?: string;
  eventId?: string;
  groupId?: string;
  techaeonHolder?: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
}) {
  return request("POST", "/api/portal/techaeon", params);
}

export async function deleteTechaeon(id: string) {
  return request("DELETE", `/api/portal/techaeon/${id}`);
}

export async function updateTechaeonStatus(id: string, statusCode: string) {
  return request("PUT", `/api/portal/techaeon/${id}/status`, { statusCode });
}

export async function updateTechaeonRedirect(id: string, redirectUrl: string | null) {
  return request("PUT", `/api/portal/techaeon/${id}/redirectUrl`, { redirectUrl });
}

export async function listTechaeons(params: {
  groupId?: string;
  pageNo?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
  searchTerm?: string;
  unUsedOnly?: boolean;
  resourceType?: string;
  resourceValue?: string;
  statusId?: string;
  privilegeId?: string;
  privilegeCode?: string;
}) {
  const query: Record<string, string | undefined> = {};
  if (params.groupId) query.groupId = params.groupId;
  if (params.pageNo) query.pageNo = String(params.pageNo);
  if (params.pageSize) query.pageSize = String(params.pageSize);
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortDirection) query.sortDirection = params.sortDirection;
  if (params.searchTerm) query.searchTerm = params.searchTerm;
  if (params.unUsedOnly !== undefined) query.unUsedOnly = String(params.unUsedOnly);
  if (params.resourceType) query.resourceType = params.resourceType;
  if (params.resourceValue) query.resourceValue = params.resourceValue;
  if (params.statusId) query.statusId = params.statusId;
  if (params.privilegeId) query.privilegeId = params.privilegeId;
  if (params.privilegeCode) query.privilegeCode = params.privilegeCode;
  return request("GET", "/api/portal/techaeon/list", undefined, query);
}

// ── Groups ──

export async function createGroup(params: {
  groupName: string;
  noOfTechaeons: number;
  eventId?: string;
  redirectUrl?: string;
  isTechaeonCodeEnabled?: boolean;
}) {
  return request("POST", "/api/portal/techaeon/group", params);
}

export async function updateGroup(
  id: string,
  params: {
    groupName: string;
    eventId?: string;
    redirectUrl?: string;
    isTechaeonCodeEnabled?: boolean;
  }
) {
  return request("PUT", `/api/portal/techaeon/group/${id}`, params);
}

export async function listGroups(params: {
  pageNo?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
  searchTerm?: string;
}) {
  const query: Record<string, string | undefined> = {};
  if (params.pageNo) query.pageNo = String(params.pageNo);
  if (params.pageSize) query.pageSize = String(params.pageSize);
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortDirection) query.sortDirection = params.sortDirection;
  if (params.searchTerm) query.searchTerm = params.searchTerm;
  return request("GET", "/api/portal/techaeon/group/list", undefined, query);
}

// ── Events ──

export async function getEvent(id: string) {
  return request("GET", `/api/portal/event/${id}`);
}

// ── Guests ──

export async function createGuest(params: {
  eventId: string;
  firstName: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  email?: string;
  groupId: string;
  isUpdateAllEvent?: boolean;
  techaeonCode?: string;
  guestCode?: string;
  invitation?: {
    designMappingId: string;
    guestPasses?: number;
    isUnlimited?: boolean;
  };
}) {
  return request("POST", "/api/portal/guest", params);
}

export async function listGuests(
  eventId: string,
  params: {
    pageNo?: number;
    pageSize?: number;
    searchTerm?: string;
    groupId?: string;
    designMappingId?: string;
    sortBy?: string;
    sortDirection?: string;
  }
) {
  return request("POST", `/api/portal/guest/${eventId}/list`, params);
}

export async function updateGuest(
  id: string,
  params: {
    eventId: string;
    firstName: string;
    lastName?: string;
    displayName?: string;
    phone?: string;
    email?: string;
    groupId: string;
    isUpdateAllEvent?: boolean;
    techaeonCode?: string;
    guestCode?: string;
    invitation?: {
      id: string;
      designMappingId: string;
      guestPasses?: number;
      isUnlimited?: boolean;
      statusId?: string;
    };
  }
) {
  return request("PUT", `/api/portal/guest/${id}`, params);
}

export async function deleteGuest(id: string, invitationId?: string) {
  const query: Record<string, string | undefined> = {};
  if (invitationId) query.invitationId = invitationId;
  return request("DELETE", `/api/portal/guest/${id}`, undefined, query);
}

export async function sendInvite(params: {
  eventId: string;
  sendToAll?: boolean;
  guestIds?: string[];
  inviteMessageTemplate?: string;
}) {
  return request("POST", "/api/portal/guest/send-invite", params);
}

export async function sendMessageToGuests(params: {
  eventId: string;
  messageBody: string;
  guestIds?: string[];
  typeIds?: number[];
  sendToAll?: boolean;
  designMappingId?: string;
}) {
  return request("POST", "/api/portal/guest/send-message", params);
}

// ── Contacts ──

async function formRequest(
  method: string,
  path: string,
  fields: Record<string, string | number | boolean | undefined | null>
): Promise<unknown> {
  const url = new URL(path, BASE_URL);
  const formData = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) {
      formData.append(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method,
    headers: { "X-API-KEY": getApiKey() },
    body: formData,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${res.status}: ${text}`);
  if (!text) return { success: true };
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function createContact(params: {
  organizationId: string;
  firstName: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  address?: string;
  state?: string;
  city?: string;
  country?: string;
  zip?: string;
  socialHandle?: string;
}) {
  return formRequest("POST", "/api/portal/contact", params);
}

export async function getContact(id: string) {
  return request("GET", `/api/portal/contact/${id}`);
}

export async function updateContact(
  id: string,
  params: {
    organizationId: string;
    firstName: string;
    lastName?: string;
    displayName?: string;
    email?: string;
    phone?: string;
    userId?: string;
    address?: string;
    state?: string;
    city?: string;
    country?: string;
    zip?: string;
    socialHandle?: string;
  }
) {
  return formRequest("PUT", `/api/portal/contact/${id}`, params);
}

export async function deleteContact(id: string) {
  return request("DELETE", `/api/portal/contact/${id}`);
}

export async function listContacts(
  organizationId: string,
  params: {
    pageNo?: number;
    pageSize?: number;
    searchTerm?: string;
    sortBy?: string;
    sortDirection?: string;
    includeAll?: boolean;
  }
) {
  const query: Record<string, string | undefined> = {
    includeAll: String(params.includeAll ?? true),
  };
  if (params.pageNo) query.pageNo = String(params.pageNo);
  if (params.pageSize) query.pageSize = String(params.pageSize);
  if (params.searchTerm) query.searchTerm = params.searchTerm;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortDirection) query.sortDirection = params.sortDirection;
  return request("GET", `/api/portal/contact/${organizationId}/list`, undefined, query);
}

export async function sendMessageToContacts(params: {
  organizationId: string;
  messageBody: string;
  contactIds: string[];
  typeIds?: number[];
}) {
  return request("POST", "/api/portal/contact/send-message", params);
}

export async function uploadContacts(params: {
  organizationId: string;
  contacts: Array<{
    firstName: string;
    lastName?: string;
    phone?: string;
    email?: string;
    state?: string;
    country?: string;
  }>;
}) {
  return request("POST", "/api/portal/contact/upload-list", params);
}

export async function listGuestGroups(organizationId: string) {
  return request("GET", `/api/portal/guest-group/${organizationId}/list`);
}
