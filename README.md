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

### Claude.ai / Claude Desktop (HTTP)

Run the HTTP server locally, then point Claude at it.

**1. Create a `.env` file:**
```bash
echo "AEONPASS_API_KEY=YOUR_API_KEY" > .env
```

**2. Start the server** (keep this running):
```bash
npm run serve
# → AeonPass MCP server listening on http://localhost:3001
```

To use a different port: `PORT=12345 npm run serve`

**3. Add to Claude:**
- **Claude.ai** → Settings → Integrations → Add custom integration → `http://localhost:47821`
- **Claude Desktop** → Settings → Developer → Add MCP server → `http://localhost:47821`

> The server must be running before you open Claude. You can add it to your login items or a shell profile to start it automatically.

## Tools

### Techaeons

| Tool | Description |
|------|-------------|
| `get_techaeon` | Get a single techaeon by ID |
| `list_techaeons` | List, search, and filter techaeons (paginated) |
| `create_techaeon` | Create a techaeon and assign to a holder |
| `update_techaeon_status` | Change lifecycle status |
| `update_techaeon_redirect` | Set or clear redirect URL |
| `delete_techaeon` | Permanently delete a techaeon |

### Groups

| Tool | Description |
|------|-------------|
| `list_groups` | List and search techaeon groups |
| `create_group` | Create a group and bulk-generate techaeons |
| `update_group` | Update group configuration |

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
