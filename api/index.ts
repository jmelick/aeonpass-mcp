// Vercel entrypoint.
//
// No fallback key is passed, so every caller must send their own X-API-KEY and
// this deployment holds no AeonPass credential. Do NOT set AEONPASS_API_KEY in
// the Vercel project env — doing so would turn pass-through back into a shared
// server-held key.

import { createApp } from "../src/app.js";

const app = createApp();

export default app.fetch;
