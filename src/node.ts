#!/usr/bin/env node
// Node HTTP entrypoint — local runs (`npm run serve`) and any container host
// (Azure Container Apps, Fly, Render, a plain VM).
//
// Locally this falls back to AEONPASS_API_KEY so it behaves as it always has.
// When deploying, leave AEONPASS_API_KEY unset: callers then have to send their
// own key as X-API-KEY and this process holds no credential.

import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

const PORT = parseInt(process.env.PORT ?? "47821", 10);
const fallbackApiKey = process.env.AEONPASS_API_KEY;

const app = createApp({ fallbackApiKey });

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`AeonPass MCP listening on http://localhost:${info.port}`);
  console.log(`  MCP endpoint: http://localhost:${info.port}/mcp`);
  console.log(`  Health:       http://localhost:${info.port}/health`);
  console.log(
    fallbackApiKey
      ? "  Auth: falling back to AEONPASS_API_KEY (local mode)"
      : "  Auth: X-API-KEY header required on every request (pass-through mode)"
  );
});
