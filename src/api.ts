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
