#!/usr/bin/env node
// HTTP transport — used by Claude.ai and Claude desktop app (custom integration)
// Each person runs this locally: npm run serve
// Then add http://localhost:PORT as a custom MCP integration in Claude settings

import http from "http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

const httpServer = http.createServer(async (req, res) => {
  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", server: "aeonpass-mcp" }));
    return;
  }

  // MCP over Streamable HTTP — one server instance per request (stateless)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
  });

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks).toString();

  res.on("close", () => transport.close());

  await createServer().connect(transport);
  await transport.handleRequest(req, res, body ? JSON.parse(body) : undefined);
});

httpServer.listen(PORT, () => {
  console.log(`AeonPass MCP server listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Add to Claude: http://localhost:${PORT}`);
});

httpServer.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});
