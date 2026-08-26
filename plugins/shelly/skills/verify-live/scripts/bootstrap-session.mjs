// Rebuild the verify account's Playwright storageState headlessly from a stored
// password — no browser, no magic link. Run once to seed it, and again whenever
// a run finds the state stale; the skill's doctor calls it automatically.
//
//   NODE_PATH=<monorepo>/apps/product-research/node_modules \
//     node bootstrap-session.mjs
//
// Reads ~/.claude/private/verify-live/creds.json {email, password} (chmod 600,
// set once by Sean). Writes ~/.claude/private/verify-live/state.json (600).
// @supabase/supabase-js resolves from the app's node_modules via NODE_PATH.

import { readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { storageStateCookies } from "./synth-session-cookie.mjs";

const SUPABASE_URL = "https://womayabywfxycbvqxatf.supabase.co";
// Public legacy anon key (publishable; safe in source, same value the browser ships).
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvbWF5YWJ5d2Z4eWNidnF4YXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDg0ODEsImV4cCI6MjA3NDEyNDQ4MX0.oJ9dOGXL68GdAi--3VFM3gbj7N3zE6r9w2-IhOPp3H8";

const dir = join(homedir(), ".claude/private/verify-live");
const creds = JSON.parse(readFileSync(join(dir, "creds.json"), "utf8"));

// Capture the exact string supabase-js persists, so the cookie holds precisely
// what the app's own client would have written — no session shape is guessed.
let persisted = null;
const capturing = {
  getItem: () => persisted,
  setItem: (_k, v) => { persisted = v; },
  removeItem: () => { persisted = null; },
};

const client = createClient(SUPABASE_URL, ANON, {
  auth: { flowType: "pkce", persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, storage: capturing, storageKey: "verify-live" },
});

const { data, error } = await client.auth.signInWithPassword({ email: creds.email, password: creds.password });
if (error) { console.error("signInWithPassword failed:", error.message); process.exit(1); }
if (!persisted) { console.error("no session persisted"); process.exit(1); }

const state = { cookies: storageStateCookies(persisted), origins: [] };
mkdirSync(dir, { recursive: true });
const out = join(dir, "state.json");
writeFileSync(out, JSON.stringify(state));
chmodSync(out, 0o600);
console.log(`state.json written for ${data.user.email} (${state.cookies.length} cookies)`);
