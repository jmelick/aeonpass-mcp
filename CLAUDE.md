# CLAUDE.md — aeonpass-mcp

## What this is
MCP server for the AeonPass platform API. Exposes Techaeon and Group CRUD operations as MCP tools so Claude Code can query and manage techaeons directly.

## Tech stack
- TypeScript, Node 22+
- `@modelcontextprotocol/sdk` for MCP server
- Runs over stdio transport

## API
All tools call the AeonPass gateway at `https://apv2-gatewayapp-prod-westus3.azurewebsites.net/api/portal/techaeon/...` using the `X-API-KEY` header. List endpoints return `{ data: [...], pagination: { totalCount, page, pageSize, totalPages } }`.

### Tools
| Tool | Description |
|------|-------------|
| `get_techaeon` | Get a single techaeon by ID |
| `list_techaeons` | List/search/filter techaeons (paginated) |
| `create_techaeon` | Create a techaeon and assign to a holder |
| `update_techaeon_status` | Change status (CREATED/ISSUED/TRANSFERRED/CANCELLED/CONSUMED) |
| `update_techaeon_redirect` | Set or clear redirect URL |
| `delete_techaeon` | Permanently delete a techaeon |
| `list_groups` | List/search techaeon groups |
| `create_group` | Create group + bulk-generate techaeons |
| `update_group` | Update group config |

## Environment
Requires `AEONPASS_API_KEY` env var.

## Commands
```
npm run build   # compile TypeScript
npm run dev     # run with tsx (dev)
npm run start   # run compiled JS
```
