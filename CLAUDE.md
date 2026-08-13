# CLAUDE.md — aeonpass-mcp

## What this is
MCP server for the Aeon Pass platform API. Exposes Techaeon and Group CRUD operations as MCP tools so Claude Code can query and manage techaeons directly.

Deployed at **https://mcp.aeonpass.com/mcp** (Vercel, fronted by Cloudflare DNS
in DNS-only mode — the proxy would buffer this transport's SSE stream). Callers
supply their own key; the deployment holds none.

## Tech stack
- TypeScript, Node 22+
- `@modelcontextprotocol/sdk` for MCP server
- Hono for the HTTP app (Fetch-native, so it runs unchanged on Node, Vercel, Workers, or a container)

## Architecture

Tools are defined once and shared by every transport. The API key is a
parameter, not a module-level env read, so each transport decides where it
comes from.

```
src/api.ts     createClient(apiKey) → all 25 API calls bound to that key
src/server.ts  createServer(client) → registers the tools
src/app.ts     Hono app; reads X-API-KEY per request
src/index.ts   stdio      → key from AEONPASS_API_KEY        (Claude Code / desktop)
src/node.ts    Node HTTP  → header, falls back to env locally (npm run serve)
api/index.ts   Vercel     → header only, no fallback
```

**Key handling.** `createApp({ fallbackApiKey })` is the only way to get an
env-var key over HTTP, and it exists for local single-user runs. Hosted
deployments must not set `AEONPASS_API_KEY` — callers supply their own key as
`X-API-KEY`, so the server holds no credential and each call is attributable to
one person's key. Never add request logging that captures headers.

## Logging

`createClient` wraps all 25 methods and emits one JSON line per call to
**stderr** — stdout belongs to the stdio transport's JSON-RPC frames, so writing
there corrupts the protocol.

```json
{"src":"aeonpass-mcp","ts":"…","caller":"c4bc6c74","method":"listTechaeons","ok":true,"ms":953}
```

`caller` is the first 8 hex of SHA-256 of the key — a stable pseudonym, never
the key. Different keys produce different values, which is what makes calls
attributable. Web Crypto, not `node:crypto`, so it still runs on Workers/Deno.

**What is deliberately not logged:** the key, arguments in general, response
bodies, and API error text (which can echo request content back). Only the
status code is kept on failure.

`callMeta` in `api.ts` records argument *shape* for calls where it matters after
the fact — bulk sends, deletes, org-scoped reads. It logs counts and IDs, never
message bodies, recipients, or contact records. `organizationId` is included on
the org-scoped calls specifically because the API trusts that argument instead
of deriving it from the key; that field is the only signal that would reveal a
key reaching another org's data.

Pass `createClient(key, { onCall })` to redirect or disable (`onCall: () => {}`).
Note Vercel runtime logs are short-retention — a log drain is required for
anything meant to serve as an audit trail.

## API
All tools call the Aeon Pass gateway at `https://apv2-gatewayapp-prod-westus3.azurewebsites.net/api/portal/techaeon/...` using the `X-API-KEY` header. List endpoints return `{ data: [...], pagination: { totalCount, page, pageSize, totalPages } }`.

### Tools

**Techaeons**
| Tool | Description |
|------|-------------|
| `get_techaeon` | Get a single techaeon by ID |
| `list_techaeons` | List/search/filter techaeons (paginated) |
| `create_techaeon` | Create a techaeon and assign to a holder |
| `update_techaeon_status` | Change status (CREATED/ISSUED/TRANSFERRED/CANCELLED/CONSUMED) |
| `update_techaeon_redirect` | Set or clear redirect URL |
| `delete_techaeon` | Soft-delete a techaeon |
| `list_groups` | List/search techaeon groups |
| `create_group` | Create group + bulk-generate techaeons |
| `update_group` | Update group config |

**Events & Guests**
| Tool | Description |
|------|-------------|
| `get_event` | Get event details by ID |
| `list_guests` | List/search guests for an event (paginated) |
| `create_guest` | Add a guest to an event, optionally issue invitation |
| `update_guest` | Full update of guest details or invitation |
| `patch_guest` | Partial update — only the fields you pass are changed |
| `delete_guest` | Soft-delete a guest or remove a single invitation |
| `send_invite` | Send/resend invitations to guests (sets status to SENT) |
| `send_message_to_guests` | Message guests via InApp/SMS/Email |
| `list_guest_groups` | List valid guest group IDs for an organization |

**Contacts**
| Tool | Description |
|------|-------------|
| `list_contacts` | List/search organization contacts (paginated) |
| `get_contact` | Get a single contact by ID |
| `create_contact` | Create a new contact |
| `update_contact` | Update contact details |
| `delete_contact` | Soft-delete a contact |
| `send_message_to_contacts` | Message contacts via InApp/SMS/Email |
| `upload_contacts` | Bulk upsert contacts from a list |

## Environment
Requires `AEONPASS_API_KEY` env var.

## Staying in sync with the API

The specs pin `info.version` at `1.0.0` and don't move it — not for the path
restructure, not for the list-response reshape, not for `PATCH /guest/{id}`.
Version is useless for change detection, so `specs/*.json` holds a committed
snapshot and `npm run check:api` diffs the live specs against it, also flagging
operations with no client method and client methods with no operation. A weekly
GitHub Action runs it.

Adding an endpoint: implement in `createClient` (`api.ts`) → register the tool
(`server.ts`) → add the operation to `COVERED` in `scripts/check-api.mjs`.
`GET /contact/{orgId}/export` sits in `SKIPPED` on purpose — a full-contact CSV
is a large PII dump into an LLM context.

## Commands
```
npm run build       # compile TypeScript
npm run dev         # run with tsx (dev)
npm run start       # run compiled JS
npm run check:api   # detect Aeon Pass API drift
```
