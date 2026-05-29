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

> The tunnel URL changes each time you restart. For a stable URL you'd need a persistent tunnel or hosted deployment.

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
