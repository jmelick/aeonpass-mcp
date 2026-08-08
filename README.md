# AeonPass MCP Server

MCP server for the [AeonPass](https://aeonpass-dev-portal.vercel.app) platform API. Exposes Techaeon and Group operations as tools for Claude.

## Getting an API Key

Get your key from the [AeonPass Developer Portal](https://aeonpass-dev-portal.vercel.app) before starting.

## Setup

```bash
git clone git@github.com:jmelick/aeonpass-mcp.git
cd aeonpass-mcp
npm install
npm run build
```

### Claude Code (CLI)

Runs as a local stdio process — no server needed.

```bash
claude mcp add --transport stdio \
  --env AEONPASS_API_KEY=YOUR_API_KEY \
  --scope user \
  aeonpass -- node $(pwd)/dist/index.js
```

Restart Claude Code. The `aeonpass` tools will be available in all projects.

### Claude Desktop App (config file)

The Claude desktop app supports stdio MCP servers via a local config file — no HTTP server needed.

**1. Open the config file:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**2. Add the `mcpServers` block** (create the key if it doesn't exist):
```json
{
  "mcpServers": {
    "aeonpass": {
      "command": "node",
      "args": ["/absolute/path/to/aeonpass-mcp/dist/index.js"],
      "env": {
        "AEONPASS_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

**3. Restart the Claude desktop app.** The AeonPass tools will be available in all chats.

### Claude.ai Web (HTTP via tunnel)

Claude.ai web requires a publicly accessible HTTPS URL — `localhost` won't work. Use a temporary Cloudflare tunnel:

```bash
# Terminal 1 — start the MCP HTTP server
AEONPASS_API_KEY=YOUR_API_KEY npm run serve
# → listening on http://localhost:47821

# Terminal 2 — open a public tunnel (no account needed)
npx cloudflared tunnel --url http://localhost:47821
# → https://some-random-name.trycloudflare.com
```

Then: Claude.ai → Settings → Integrations → Add custom integration → paste the `https://` tunnel URL.

> The tunnel URL changes each time you restart. For a stable URL, deploy it — see below.

## Deploying

The HTTP app is Fetch-native, so the same code runs on Node, Vercel, Cloudflare
Workers, or a container. Only the entrypoint differs.

**Deployed instances hold no API key.** Each caller sends their own as an
`X-API-KEY` header, which the server forwards to AeonPass. That means calls are
attributable to a person, keys are revocable one at a time, and compromising the
deployment yields no credential. Do **not** set `AEONPASS_API_KEY` in a hosted
environment — that would turn pass-through back into a shared server-held key.

| Target | Entrypoint | Notes |
|--------|-----------|-------|
| Vercel | `api/index.ts` | `vercel.json` rewrites all routes to `/api` |
| Container (Azure, Fly, Render) | `dist/node.js` | `npm run serve` with no `AEONPASS_API_KEY` set |
| Cloudflare Workers | ~3-line entry | `export default { fetch: createApp().fetch }` |

Connecting a client to a deployed instance:

```bash
claude mcp add --transport http \
  --header "X-API-KEY: YOUR_API_KEY" \
  --scope user \
  aeonpass https://your-host/mcp
```

> ⚠️ The caller's key is on every request. Don't enable header capture in any
> log drain for this service.

## Tools

### Techaeons

| Tool | Description |
|------|-------------|
| `get_techaeon` | Get a single techaeon by ID |
| `list_techaeons` | List, search, and filter techaeons (paginated) |
| `create_techaeon` | Create a techaeon and assign to a holder |
| `update_techaeon_status` | Change lifecycle status |
| `update_techaeon_redirect` | Set or clear redirect URL |
| `delete_techaeon` | Soft-delete a techaeon |

### Groups

| Tool | Description |
|------|-------------|
| `list_groups` | List and search techaeon groups |
| `create_group` | Create a group and bulk-generate techaeons |
| `update_group` | Update group configuration |

### Events & Guests

| Tool | Description |
|------|-------------|
| `get_event` | Get event details by ID |
| `list_guests` | List, search, and filter guests for an event (paginated) |
| `create_guest` | Add a guest to an event, optionally issuing an invitation |
| `update_guest` | Update guest details or invitation |
| `delete_guest` | Soft-delete a guest, or remove a single invitation |
| `send_invite` | Send or resend invitations (sets status to SENT) |
| `send_message_to_guests` | Message guests via InApp / SMS / Email |
| `list_guest_groups` | List valid guest group IDs for an organization |

### Contacts

| Tool | Description |
|------|-------------|
| `list_contacts` | List and search organization contacts (paginated) |
| `get_contact` | Get a single contact by ID |
| `create_contact` | Create a new contact |
| `update_contact` | Update contact details |
| `delete_contact` | Soft-delete a contact |
| `send_message_to_contacts` | Message contacts via InApp / SMS / Email |
| `upload_contacts` | Bulk upsert contacts from a list |

> `send_invite`, `send_message_to_guests`, and `send_message_to_contacts` reach
> real people over SMS and email, and `sendToAll` is not scoped. Treat them as
> destructive.

### Techaeon Status Codes

| Code | Description |
|------|-------------|
| `CREATED` | Techaeon created |
| `ISSUED` | Active and in use |
| `TRANSFERRED` | Ownership transferred |
| `CANCELLED` | No longer valid |
| `CONSUMED` | Scanned or used |

## Example Usage

Once installed, ask Claude things like:

- "List all techaeons for event `{event-id}`"
- "What's the status of techaeon `{id}`?"
- "Update the redirect URL for techaeon `{id}` to `https://example.com`"
- "Create a new group called 'VIP Guests' with 50 techaeons"
- "Search for techaeons assigned to john@example.com"

## Development

```bash
npm run build       # compile TypeScript
npm run dev         # stdio mode with tsx (hot reload)
npm run dev:http    # HTTP mode with tsx (hot reload)
npm run start       # stdio mode (compiled)
npm run serve       # HTTP mode (compiled)
```

Tools are defined once in `src/server.ts` and shared by every transport. The API
key is a parameter rather than a module-level env read, so each entrypoint
decides where it comes from:

```
src/api.ts     createClient(apiKey) → the 24 API calls, bound to that key
src/server.ts  createServer(client) → registers the tools
src/app.ts     Hono app; reads X-API-KEY per request
src/index.ts   stdio      → key from AEONPASS_API_KEY
src/node.ts    Node HTTP  → header, falling back to env for local runs
api/index.ts   Vercel     → header only, no fallback
```

To add a tool: add the call to `createClient` in `api.ts`, then register it in
`server.ts`. Every transport picks it up.
