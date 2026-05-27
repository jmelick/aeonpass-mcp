# AeonPass MCP Server

MCP server for the [AeonPass](https://aeonpass-dev-portal.vercel.app) platform API. Exposes Techaeon and Group operations as tools for Claude Code.

## Setup

```bash
# Clone & build
git clone git@github.com:jmelick/aeonpass-mcp.git
cd aeonpass-mcp
npm install
npm run build

# Register with Claude Code (replace YOUR_API_KEY)
claude mcp add --transport stdio \
  --env AEONPASS_API_KEY=YOUR_API_KEY \
  --scope user \
  aeonpass -- node $(pwd)/dist/index.js
```

Restart Claude Code. The `aeonpass` tools will be available in all projects.

## Getting an API Key

Get your key from the [AeonPass Developer Portal](https://aeonpass-dev-portal.vercel.app). Include it as `X-API-KEY` — the MCP server handles this automatically.

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
npm run dev     # run with tsx (hot reload)
npm run build   # compile TypeScript
npm run start   # run compiled JS
```
