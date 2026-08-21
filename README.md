# Aeon Pass MCP Server

MCP server for the [Aeon Pass](https://aeonpass-dev-portal.vercel.app) platform API. Exposes techaeon, event, guest, and contact operations as tools for Claude.

**Live at [mcp.aeonpass.com](https://mcp.aeonpass.com)** — nothing to install.

## Quick start

You need your own Aeon Pass API key. Ask your Aeon Pass administrator; keys are
issued per person, so don't share one.

```bash
claude mcp add --transport http \
  --header "X-API-KEY: YOUR_API_KEY" \
  --scope user \
  aeonpass https://mcp.aeonpass.com/mcp
```

Substitute your real key before running this — pasting the literal `YOUR_API_KEY`
produces a server that reports **✓ Connected** but fails on the first tool call.
Then restart Claude Code; the tools are available in every project.

Prefer to keep the key out of your shell history? Skip the command and add the
block directly to `~/.claude.json` under `mcpServers`:

```json
"aeonpass": {
  "type": "http",
  "url": "https://mcp.aeonpass.com/mcp",
  "headers": { "X-API-KEY": "YOUR_API_KEY" }
}
```

### Claude Desktop

Same idea, in `~/Library/Application Support/Claude/claude_desktop_config.json`.
Restart the app afterwards.

### Claude.ai web

Settings → Connectors → Add custom connector → `https://mcp.aeonpass.com/mcp`.
Note that Claude.ai's custom-connector UI is built around OAuth; supplying a
fixed key as a request header relies on the `static_headers` beta, and that
credential is shared org-wide rather than per user.

## Your key never leaves your client

The hosted server holds **no** Aeon Pass credential. Every request carries the
caller's own key, which the server forwards. So calls are attributable to a
person, keys are revocable one at a time, and compromising the deployment yields
no credential.

The flip side: your key is on every request. Don't enable request-header capture
in any log drain pointed at this service.

## Logging

One JSON line per API call, on stderr:

```json
{"src":"aeonpass-mcp","ts":"…","caller":"c4bc6c74","method":"listTechaeons","ok":true,"ms":953}
```

`caller` is a fingerprint — the first 8 hex of SHA-256 of your key, never the
key itself. It's stable per key, so calls are attributable to a person without
the log ever holding a credential.

Not logged: the key, arguments in general, response bodies, or API error text.
Sensitive calls (bulk sends, deletes, org-scoped reads) additionally record
argument *shape* — counts and IDs, never message bodies, recipients, or contact
records:

```json
{"…":"…","method":"sendMessageToGuests","meta":{"eventId":"…","sendToAll":true,"guests":4213,"channels":[2,3],"bodyChars":180}}
```

Vercel runtime logs are short-retention. Anything intended as an audit trail
needs a log drain, and arguably belongs in the Aeon Pass API itself, which sees
every call along with its effect.

## Deploying

Currently on Vercel, fronted by `mcp.aeonpass.com` (Cloudflare DNS, **grey cloud
/ DNS-only** — the orange cloud buffers the SSE stream this transport uses and
also blocks cert issuance).

The HTTP app is Fetch-native, so the same code runs on Node, Vercel, Cloudflare
Workers, or a container. Only the entrypoint differs.

| Target | Entrypoint | Notes |
|--------|-----------|-------|
| Vercel | `api/index.ts` | `vercel.json` rewrites all routes to `/api` |
| Container (Azure, Fly, Render) | `dist/node.js` | `npm run serve`, no `AEONPASS_API_KEY` set |
| Cloudflare Workers | `src/app.ts` | already default-exports `{ fetch }` |

Do **not** set `AEONPASS_API_KEY` in a hosted environment — that turns
pass-through back into a shared server-held key, silently.

### Vercel gotchas

Two things cost real debugging time; both are load-bearing:

- **`api/index.ts` must export named HTTP methods, never `export default`.**
  Vercel treats a default export as Node-style `(req, res) => void` and discards
  any `Response` you return, so requests hang and then 500.
- **`src/app.ts` must keep its default `{ fetch }` export.** Vercel resolves that
  module as a root-level function entrypoint. Without a valid default export,
  every request to `/` dies with `FUNCTION_INVOCATION_FAILED` while other paths
  work fine — a confusing split, since `/mcp` and `/health` route through
  `api/index` instead.

`vercel inspect <url>` lists the functions actually built, and
`vercel logs <url>` gives the real runtime error. Both are faster than guessing.

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
| `update_guest` | Full update of guest details or invitation |
| `patch_guest` | Partial update — only the fields you pass are changed |
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

Only needed if you're changing the server itself. To *use* it, see
[Quick start](#quick-start) — no clone required.

```bash
git clone git@github.com:jmelick/aeonpass-mcp.git
cd aeonpass-mcp
npm install
npm run build
```

Point a client at your local build instead of the hosted one. Project scope
keeps it scoped to this directory, so you aren't carrying a duplicate tool set
around everywhere else:

```bash
claude mcp add --scope project aeonpass-dev -- node "$(pwd)/dist/index.js"
```

That needs `AEONPASS_API_KEY` in your environment, since stdio reads the key
from there. Remove it when you're done — running it alongside the hosted
`aeonpass` server means two copies of all 25 tools, which measurably degrades
tool selection.

```bash
npm run build       # compile TypeScript
npm run dev         # stdio mode with tsx (hot reload)
npm run dev:http    # HTTP mode with tsx (hot reload)
npm run start       # stdio mode (compiled)
npm run serve       # HTTP mode (compiled)
```

`npm run serve` falls back to `AEONPASS_API_KEY` when a request carries no
`X-API-KEY` header, so local runs behave as they always have. That fallback is
deliberately unavailable to the hosted entrypoints.

### Keeping up with the API

```bash
npm run check:api             # what moved since the last snapshot
npm run check:api -- --write  # refresh specs/*.json once handled
```

`info.version` is `1.0.0` on all three Aeon Pass specs and has **not moved**
through a full path restructure (`/api/techaeon/public` → `/api/portal/techaeon`),
a change to every list response shape, and the addition of `PATCH /guest/{id}`.
So the version field can't tell you anything. Instead, `specs/*.json` holds a
committed snapshot of each spec and `check:api` diffs the live ones against it,
reporting:

- `+ NEW` — an operation the API gained (implement it)
- `- GONE` — an operation it dropped (a tool is now broken)
- `~ body changed` — same operations, but schemas moved; `git diff` after `--write`
- `! UNIMPLEMENTED` — in the spec, no client method
- `! STALE` — a client method whose endpoint no longer exists

A GitHub Action runs it weekly, and on any PR touching `specs/`, `src/api.ts`,
or the script. Adding an endpoint means: implement it in `createClient`
(`src/api.ts`), register the tool in `src/server.ts`, then add the operation to
`COVERED` in `scripts/check-api.mjs`.

`GET /contact/export` is deliberately **not** exposed — it returns a CSV
of every contact, which is a large PII dump into an LLM context. `list_contacts`
covers paged reads. It's listed in `SKIPPED` so the check doesn't flag it.

Tools are defined once in `src/server.ts` and shared by every transport. The API
key is a parameter rather than a module-level env read, so each entrypoint
decides where it comes from:

```
src/api.ts     createClient(apiKey) → the 25 API calls, bound to that key
src/server.ts  createServer(client) → registers the tools
src/app.ts     Hono app; reads X-API-KEY per request
src/index.ts   stdio      → key from AEONPASS_API_KEY
src/node.ts    Node HTTP  → header, falling back to env for local runs
api/index.ts   Vercel     → header only, no fallback
```

To add a tool: add the call to `createClient` in `api.ts`, then register it in
`server.ts`. Every transport picks it up.
