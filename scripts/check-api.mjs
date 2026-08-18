#!/usr/bin/env node
// Detects drift between the published Aeon Pass OpenAPI specs and this server.
//
// Why this exists: `info.version` is "1.0.0" on all three specs and has stayed
// there across a full path restructure (/api/techaeon/public → /api/portal/
// techaeon), a change to every list response shape, and the addition of PATCH
// /guest/{id}. The version field cannot be used to detect change, so we diff
// the surface ourselves.
//
//   npm run check:api          report drift and coverage gaps
//   npm run check:api -- --write   also refresh specs/*.json
//
// Exits non-zero when the live specs differ from the committed snapshots or an
// operation has no client method, so CI can fail on it.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SPEC_DIR = join(ROOT, "specs");
const BASE = "https://aeonpass-dev-portal.vercel.app/api/specs";
const SPECS = ["techaeon", "event", "organization"];

/** operation -> the createClient method that implements it. */
const COVERED = {
  "POST /api/portal/techaeon": "createTechaeon",
  "GET /api/portal/techaeon/{id}": "getTechaeon",
  "DELETE /api/portal/techaeon/{id}": "deleteTechaeon",
  "PUT /api/portal/techaeon/{id}/redirectUrl": "updateTechaeonRedirect",
  "PUT /api/portal/techaeon/{id}/status": "updateTechaeonStatus",
  "POST /api/portal/techaeon/group": "createGroup",
  "PUT /api/portal/techaeon/group/{id}": "updateGroup",
  "GET /api/portal/techaeon/group/list": "listGroups",
  "GET /api/portal/techaeon/list": "listTechaeons",

  "GET /api/portal/event/{id}": "getEvent",
  "POST /api/portal/guest": "createGuest",
  "POST /api/portal/guest/{eventId}/list": "listGuests",
  "PUT /api/portal/guest/{id}": "updateGuest",
  "PATCH /api/portal/guest/{id}": "patchGuest",
  "DELETE /api/portal/guest/{id}": "deleteGuest",
  "POST /api/portal/guest/send-invite": "sendInvite",
  "POST /api/portal/guest/send-message": "sendMessageToGuests",

  "POST /api/portal/contact": "createContact",
  "GET /api/portal/contact/{id}": "getContact",
  "PUT /api/portal/contact/{id}": "updateContact",
  "DELETE /api/portal/contact/{id}": "deleteContact",
  "GET /api/portal/contact/list": "listContacts",
  "POST /api/portal/contact/send-message": "sendMessageToContacts",
  "POST /api/portal/contact/upload-list": "uploadContacts",
  "GET /api/portal/guest-group/list": "listGuestGroups",
};

/** Endpoints we've decided not to expose, and why. */
const SKIPPED = {
  "GET /api/portal/contact/export":
    "bulk CSV of every contact — a large PII dump into an LLM context; list_contacts covers paged reads",
};

const operations = (spec) =>
  Object.entries(spec.paths ?? {})
    .flatMap(([path, methods]) =>
      Object.keys(methods)
        .filter((m) => ["get", "put", "post", "delete", "patch"].includes(m))
        .map((m) => `${m.toUpperCase()} ${path}`)
    )
    .sort();

const write = process.argv.includes("--write");
let problems = 0;

mkdirSync(SPEC_DIR, { recursive: true });

for (const name of SPECS) {
  const res = await fetch(`${BASE}/${name}`);
  if (!res.ok) {
    console.error(`✗ ${name}: fetch failed (${res.status})`);
    problems++;
    continue;
  }
  const live = await res.json();
  const liveOps = operations(live);
  // Must match how the snapshot is written below, or the body comparison
  // reports a change on every run.
  const serialised = JSON.stringify(live, null, 2) + "\n";

  const snapPath = join(SPEC_DIR, `${name}.json`);
  if (existsSync(snapPath)) {
    const prevOps = operations(JSON.parse(readFileSync(snapPath, "utf8")));
    const added = liveOps.filter((o) => !prevOps.includes(o));
    const removed = prevOps.filter((o) => !liveOps.includes(o));

    for (const o of added) {
      console.log(`+ ${name}: NEW  ${o}`);
      problems++;
    }
    for (const o of removed) {
      console.log(`- ${name}: GONE ${o}`);
      problems++;
    }
    // Schema-level edits (response shapes, new fields) don't show up above.
    if (!added.length && !removed.length && serialised !== readFileSync(snapPath, "utf8")) {
      console.log(`~ ${name}: same operations, but the spec body changed — check git diff after --write`);
      problems++;
    }
  } else {
    console.log(`i ${name}: no snapshot yet, recording baseline`);
  }

  for (const op of liveOps) {
    if (!COVERED[op] && !SKIPPED[op]) {
      console.log(`! ${name}: UNIMPLEMENTED ${op}`);
      problems++;
    }
  }

  if (write || !existsSync(snapPath)) {
    writeFileSync(snapPath, serialised);
  }
}

// Anything in COVERED that the specs no longer expose is a dead client method.
const allLive = SPECS.flatMap((n) => {
  const p = join(SPEC_DIR, `${n}.json`);
  return existsSync(p) ? operations(JSON.parse(readFileSync(p, "utf8"))) : [];
});
for (const op of Object.keys(COVERED)) {
  if (!allLive.includes(op)) {
    console.log(`! STALE ${op} → ${COVERED[op]}() has no matching endpoint`);
    problems++;
  }
}

if (problems === 0) {
  console.log(`✓ in sync — ${Object.keys(COVERED).length} operations implemented, ${Object.keys(SKIPPED).length} deliberately skipped`);
} else {
  console.log(`\n${problems} item(s) need attention. Re-run with --write once handled.`);
}
process.exit(problems === 0 ? 0 : 1);
