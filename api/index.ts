// Vercel entrypoint.
//
// No fallback key is passed, so every caller must send their own X-API-KEY and
// this deployment holds no AeonPass credential. Do NOT set AEONPASS_API_KEY in
// the Vercel project env — doing so would turn pass-through back into a shared
// server-held key.
//
// Must go through hono/vercel's `handle`, not `export default app.fetch`.
// `app.fetch` declares (request, env, executionCtx); Vercel sniffs arity to tell
// Fetch handlers from Node-style (req, res) ones, guesses wrong, and the request
// hangs with no response. `handle` wraps it in a 1-arg function.

import { handle } from "hono/vercel";
import { createApp } from "../src/app.js";

const app = createApp();

export default handle(app);
