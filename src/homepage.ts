// Landing page served at GET /. Exists so that a person who opens the URL in a
// browser learns what this is and how to connect, rather than seeing a protocol
// error. The origin is passed in so the page is correct on any host.

export function homepage(origin: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AeonPass MCP</title>
<style>
  :root {
    --bg: #fbfbfa; --fg: #1a1a19; --muted: #6b6b68;
    --line: #e4e4e1; --card: #fff; --accent: #b8562f; --code-bg: #f2f2ef;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #191918; --fg: #ecece9; --muted: #9a9a95;
      --line: #302f2d; --card: #211f1e; --accent: #e08a5f; --code-bg: #262523;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 3rem 1.5rem; background: var(--bg); color: var(--fg);
    font: 16px/1.6 ui-sans-serif, -apple-system, "Segoe UI", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  main { max-width: 46rem; margin: 0 auto; }
  h1 { font-size: 1.6rem; margin: 0 0 .4rem; letter-spacing: -.02em; }
  .sub { color: var(--muted); margin: 0 0 2.5rem; }
  h2 {
    font-size: .75rem; text-transform: uppercase; letter-spacing: .08em;
    color: var(--muted); margin: 2.5rem 0 .75rem; font-weight: 600;
  }
  .card {
    background: var(--card); border: 1px solid var(--line);
    border-radius: 10px; padding: 1rem 1.25rem;
  }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .875em;
    background: var(--code-bg); padding: .15em .4em; border-radius: 4px;
  }
  pre {
    background: var(--code-bg); border: 1px solid var(--line); border-radius: 10px;
    padding: 1rem 1.25rem; overflow-x: auto; margin: 0;
  }
  pre code { background: none; padding: 0; font-size: .8125rem; line-height: 1.7; }
  .dot {
    display: inline-block; width: 7px; height: 7px; border-radius: 50%;
    background: #3fb950; margin-right: .5rem; vertical-align: middle;
  }
  .row {
    display: flex; justify-content: space-between; gap: 1rem;
    padding: .6rem 0; border-bottom: 1px solid var(--line);
  }
  .row:last-child { border-bottom: 0; }
  .row span:last-child { color: var(--muted); text-align: right; }
  .note {
    border-left: 2px solid var(--accent); padding: .1rem 0 .1rem 1rem;
    margin: 1rem 0 0; color: var(--muted); font-size: .9375rem;
  }
  footer {
    margin-top: 3.5rem; padding-top: 1.25rem; border-top: 1px solid var(--line);
    color: var(--muted); font-size: .875rem;
  }
  a { color: var(--accent); }
</style>
</head>
<body>
<main>
  <h1>AeonPass MCP</h1>
  <p class="sub">A Model Context Protocol server for the AeonPass platform API.</p>

  <div class="card">
    <div class="row"><span><span class="dot"></span>Status</span><span>Operational</span></div>
    <div class="row"><span>Endpoint</span><span><code>${origin}/mcp</code></span></div>
    <div class="row"><span>Transport</span><span>Streamable HTTP</span></div>
    <div class="row"><span>Tools</span><span>24 &middot; techaeons, events, guests, contacts</span></div>
  </div>

  <h2>Connect</h2>
  <pre><code>claude mcp add --transport http \\
  --header "X-API-KEY: YOUR_KEY" \\
  --scope user \\
  aeonpass ${origin}/mcp</code></pre>

  <p class="note">
    Replace <code>YOUR_KEY</code> with your own AeonPass API key before running this.
    This server stores no credentials &mdash; every request is authenticated with the
    key you supply, so your calls are attributable to you and revocable on their own.
  </p>

  <h2>Getting a key</h2>
  <p style="margin:0;color:var(--muted)">
    Ask your AeonPass administrator for a key scoped to your account. Keys are issued
    per person &mdash; please don't share one.
  </p>

  <footer>
    This is an API endpoint, not a web app. Requests to <code>/mcp</code> need a valid
    <code>X-API-KEY</code> header.
  </footer>
</main>
</body>
</html>`;
}
