// Host-agnostic HTTP app. Runs on Node, Vercel, Cloudflare Workers, Deno, Bun,
// or a container — the transport is Fetch-native, so the entrypoint is the only
// thing that changes per host.

import { Hono } from "hono";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createClient } from "./api.js";
import { createServer } from "./server.js";

export interface AppOptions {
  /**
   * API key to use when a request carries no `X-API-KEY` header.
   *
   * Set this only for local single-user runs, where it preserves the existing
   * `npm run serve` behaviour. Leave it undefined in any hosted deployment so
   * every caller must supply their own key and the server holds no credential
   * of its own.
   */
  fallbackApiKey?: string;
}

export function createApp(options: AppOptions = {}) {
  const app = new Hono();

  app.get("/health", (c) => c.json({ status: "ok", server: "aeonpass-mcp" }));

  // NOTE: the caller's API key arrives on every request. Do not add request
  // logging that captures headers, and keep header capture off in any log
  // drain configured for this service.
  const handleMcp = async (c: { req: { header: (n: string) => string | undefined; raw: Request } }) => {
    const apiKey = c.req.header("x-api-key") ?? options.fallbackApiKey;
    if (!apiKey) {
      return Response.json(
        { error: "Missing X-API-KEY header. Supply your own AeonPass API key." },
        { status: 401 }
      );
    }

    // Stateless: a fresh client, server, and transport per request, so one
    // caller's key is never visible to another's tool calls.
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await createServer(createClient(apiKey)).connect(transport);
    return transport.handleRequest(c.req.raw);
  };

  app.all("/mcp", handleMcp);
  app.all("/", handleMcp); // back-compat: the old server answered on the root

  return app;
}
