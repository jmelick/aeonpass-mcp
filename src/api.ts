const BASE_URL = "https://apv2-gatewayapp-prod-westus3.azurewebsites.net";

/** One API call, recorded without credentials or personal data. */
export interface CallLog {
  ts: string;
  /** First 8 hex of SHA-256(apiKey). A stable pseudonym — never the key. */
  caller: string;
  method: string;
  ok: boolean;
  ms: number;
  /** HTTP status, on failure only. */
  status?: number;
  /** Argument *shape* for sensitive calls. Never message bodies or PII. */
  meta?: Record<string, unknown>;
}

/**
 * Default sink: one JSON object per line on **stderr**.
 *
 * stderr matters. The stdio transport owns stdout for JSON-RPC frames, so
 * anything written there corrupts the protocol. Vercel captures stderr as
 * runtime logs either way.
 */
export function logToStderr(entry: CallLog): void {
  console.error(JSON.stringify({ src: "aeonpass-mcp", ...entry }));
}

export interface ClientOptions {
  /** Receives one record per call. Pass `() => {}` to disable. */
  onCall?: (entry: CallLog) => void;
}

/**
 * Records the *shape* of arguments for calls where that matters after the fact
 * — bulk sends, deletes, and the org-scoped reads. Deliberately omits message
 * bodies, recipient lists, and contact records: those are the PII, and logs are
 * not the place for them.
 *
 * organizationId is included on the org-scoped calls because the API currently
 * trusts that argument rather than deriving it from the key, so this is the
 * only signal that would show a key reaching another org's data.
 */
function callMeta(method: string, args: unknown[]): Record<string, unknown> | undefined {
  const a = args[0] as any;
  const b = args[1] as any;
  switch (method) {
    case "sendInvite":
      return { eventId: a?.eventId, sendToAll: !!a?.sendToAll, guests: a?.guestIds?.length ?? 0 };
    case "sendMessageToGuests":
      return {
        eventId: a?.eventId,
        sendToAll: !!a?.sendToAll,
        guests: a?.guestIds?.length ?? 0,
        channels: a?.typeIds,
        bodyChars: a?.messageBody?.length ?? 0,
      };
    case "sendMessageToContacts":
      return {
        organizationId: a?.organizationId,
        contacts: a?.contactIds?.length ?? 0,
        channels: a?.typeIds,
        bodyChars: a?.messageBody?.length ?? 0,
      };
    case "uploadContacts":
      return { organizationId: a?.organizationId, rows: a?.contacts?.length ?? 0 };
    case "createGroup":
      return { generated: a?.noOfTechaeons };
    case "deleteTechaeon":
    case "deleteContact":
      return { id: a };
    case "deleteGuest":
      return { id: a, invitationId: b };
    case "listContacts":
    case "listGuestGroups":
      return { organizationId: a };
    default:
      return undefined;
  }
}

/**
 * Builds an Aeon Pass API client bound to a single API key.
 *
 * The key is a parameter rather than a module-level env read so that a hosted
 * deployment can pass the caller's own key per request — the server itself
 * never holds a credential. The stdio entrypoint passes the env var.
 */
export function createClient(apiKey: string, options: ClientOptions = {}) {
  if (!apiKey) {
    throw new Error("No Aeon Pass API key provided");
  }

  const onCall = options.onCall ?? logToStderr;

  // Derived lazily and memoised. Uses Web Crypto rather than node:crypto so the
  // client still runs on Workers, Deno, and Bun.
  let callerId: Promise<string> | undefined;
  const caller = () =>
    (callerId ??= crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(apiKey))
      .then((buf) =>
        Array.from(new Uint8Array(buf).slice(0, 4))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      ));

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
      "X-API-KEY": apiKey,
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

  // Contact create/update are multipart/form-data per the API spec.
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
      headers: { "X-API-KEY": apiKey },
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

  const methods = {
    // ── Techaeons ──

    getTechaeon(id: string) {
      return request("GET", `/api/portal/techaeon/${id}`);
    },

    createTechaeon(params: {
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
    },

    deleteTechaeon(id: string) {
      return request("DELETE", `/api/portal/techaeon/${id}`);
    },

    updateTechaeonStatus(id: string, statusCode: string) {
      return request("PUT", `/api/portal/techaeon/${id}/status`, { statusCode });
    },

    updateTechaeonRedirect(id: string, redirectUrl: string | null) {
      return request("PUT", `/api/portal/techaeon/${id}/redirectUrl`, { redirectUrl });
    },

    listTechaeons(params: {
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
    },

    // ── Groups ──

    createGroup(params: {
      groupName: string;
      noOfTechaeons: number;
      eventId?: string;
      redirectUrl?: string;
      isTechaeonCodeEnabled?: boolean;
    }) {
      return request("POST", "/api/portal/techaeon/group", params);
    },

    updateGroup(
      id: string,
      params: {
        groupName: string;
        eventId?: string;
        redirectUrl?: string;
        isTechaeonCodeEnabled?: boolean;
      }
    ) {
      return request("PUT", `/api/portal/techaeon/group/${id}`, params);
    },

    listGroups(params: {
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
    },

    // ── Events ──

    getEvent(id: string) {
      return request("GET", `/api/portal/event/${id}`);
    },

    // ── Guests ──

    createGuest(params: {
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
    },

    listGuests(
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
    },

    updateGuest(
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
    },

    deleteGuest(id: string, invitationId?: string) {
      const query: Record<string, string | undefined> = {};
      if (invitationId) query.invitationId = invitationId;
      return request("DELETE", `/api/portal/guest/${id}`, undefined, query);
    },

    sendInvite(params: {
      eventId: string;
      sendToAll?: boolean;
      guestIds?: string[];
      inviteMessageTemplate?: string;
    }) {
      return request("POST", "/api/portal/guest/send-invite", params);
    },

    sendMessageToGuests(params: {
      eventId: string;
      messageBody: string;
      guestIds?: string[];
      typeIds?: number[];
      sendToAll?: boolean;
      designMappingId?: string;
    }) {
      return request("POST", "/api/portal/guest/send-message", params);
    },

    // ── Contacts ──

    createContact(params: {
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
    },

    getContact(id: string) {
      return request("GET", `/api/portal/contact/${id}`);
    },

    updateContact(
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
    },

    deleteContact(id: string) {
      return request("DELETE", `/api/portal/contact/${id}`);
    },

    listContacts(
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
    },

    sendMessageToContacts(params: {
      organizationId: string;
      messageBody: string;
      contactIds: string[];
      typeIds?: number[];
    }) {
      return request("POST", "/api/portal/contact/send-message", params);
    },

    uploadContacts(params: {
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
    },

    listGuestGroups(organizationId: string) {
      return request("GET", `/api/portal/guest-group/${organizationId}/list`);
    },
  };

  // Wrap every method once rather than at 24 call sites. Failures are recorded
  // and rethrown — logging must never change behaviour.
  const instrumented = Object.fromEntries(
    Object.entries(methods).map(([name, fn]) => [
      name,
      async (...args: unknown[]) => {
        const started = Date.now();
        try {
          const result = await (fn as (...a: unknown[]) => Promise<unknown>)(...args);
          onCall({
            ts: new Date().toISOString(),
            caller: await caller(),
            method: name,
            ok: true,
            ms: Date.now() - started,
            meta: callMeta(name, args),
          });
          return result;
        } catch (err) {
          // Status only — the API's error body can echo back request content.
          const status = Number(/^API (\d+)/.exec(String((err as Error)?.message))?.[1]) || undefined;
          onCall({
            ts: new Date().toISOString(),
            caller: await caller(),
            method: name,
            ok: false,
            ms: Date.now() - started,
            status,
            meta: callMeta(name, args),
          });
          throw err;
        }
      },
    ])
  ) as typeof methods;

  return instrumented;
}

export type AeonPassClient = ReturnType<typeof createClient>;
