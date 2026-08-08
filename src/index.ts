#!/usr/bin/env node
// stdio transport — used by Claude Code and the Claude desktop app (config file).
// Unchanged behaviour: the key comes from the environment.

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "./api.js";
import { createServer } from "./server.js";

async function main() {
  const apiKey = process.env.AEONPASS_API_KEY;
  if (!apiKey) {
    throw new Error("AEONPASS_API_KEY environment variable is not set");
  }

  const transport = new StdioServerTransport();
  await createServer(createClient(apiKey)).connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
