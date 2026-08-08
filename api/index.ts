// Vercel entrypoint.
//
// No fallback key is passed, so every caller must send their own X-API-KEY and
// this deployment holds no AeonPass credential. Do NOT set AEONPASS_API_KEY in
// the Vercel project env — doing so would turn pass-through back into a shared
// server-held key.
//
// Export named HTTP methods, never `export default`. Vercel treats a default
// export as the Node-style `(req, res) => void` signature and silently discards
// any Response it returns, so the request hangs or 500s. Named method exports
// are what select the Fetch-style signature this app uses.

import { handle } from "hono/vercel";
import { createApp } from "../src/app.js";

const handler = handle(createApp());

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS,
  handler as HEAD,
};
