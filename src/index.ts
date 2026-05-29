#!/usr/bin/env node
// stdio transport — used by Claude Code and Claude desktop app (config file)

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main() {
  const transport = new StdioServerTransport();
  await createServer().connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
