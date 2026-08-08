# CLAUDE.md — aeonpass-mcp

## What this is
MCP server for the AeonPass platform API. Exposes Techaeon and Group CRUD operations as MCP tools so Claude Code can query and manage techaeons directly.

## Tech stack
- TypeScript, Node 22+
- `@modelcontextprotocol/sdk` for MCP server
- Hono for the HTTP app (Fetch-native, so it runs unchanged on Node, Vercel, Workers, or a container)

## Architecture

Tools are defined once and shared by every transport. The API key is a
parameter, not a module-level env read, so each transport decides where it
comes from.

```
src/api.ts     createClient(apiKey) → all 24 API calls bound to that key
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

## API
All tools call the AeonPass gateway at `https://apv2-gatewayapp-prod-westus3.azurewebsites.net/api/portal/techaeon/...` using the `X-API-KEY` header. List endpoints return `{ data: [...], pagination: { totalCount, page, pageSize, totalPages } }`.

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
| `update_guest` | Update guest details or invitation |
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

## Commands
```
npm run build   # compile TypeScript
npm run dev     # run with tsx (dev)
npm run start   # run compiled JS
```
