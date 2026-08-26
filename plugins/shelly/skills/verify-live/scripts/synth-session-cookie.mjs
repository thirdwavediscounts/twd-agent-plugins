// Turn a supabase-js session string into the fleet's `twd-auth.*` cookies, so a
// Playwright storageState the deployed app trusts can be rebuilt headlessly from
// a password login — no browser, no magic link. Mirrors
// packages/auth-client/src/sessionCookie.ts (v1). The end-to-end profile-menu
// check in the skill is the drift detector: if this format ever diverges, the
// app is simply not signed in and the run aborts.
//
// Run directly (`node synth-session-cookie.mjs`) for the round-trip self-test —
// no credentials needed. It proves synth → read returns the input.

const PREFIX = "twd-auth";
const META_NAME = `${PREFIX}.meta`;
const META_VERSION = "v1";
const CHUNK_NAME = /^twd-auth\.(\d+)$/;
export const MAX_CHUNK_LENGTH = 3800;
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/** FNV-1a over the encoded payload — identical to sessionCookie.ts. */
function checksum(payload) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

/** session string → [{name,value}] for `twd-auth.0..N-1` + `twd-auth.meta`. */
export function sessionCookies(session) {
  const payload = encodeURIComponent(session);
  const chunks = [];
  for (let at = 0; at < payload.length; at += MAX_CHUNK_LENGTH) {
    chunks.push(payload.slice(at, at + MAX_CHUNK_LENGTH));
  }
  const out = chunks.map((chunk, i) => ({ name: `${PREFIX}.${i}`, value: chunk }));
  out.push({ name: META_NAME, value: `${META_VERSION}:${chunks.length}:${checksum(payload)}` });
  return out;
}

/** Playwright storageState cookie objects for the fleet zone. */
export function storageStateCookies(session) {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  return sessionCookies(session).map(({ name, value }) => ({
    name,
    value,
    domain: ".apps.repsxi.com",
    path: "/",
    expires,
    httpOnly: false,
    secure: true,
    sameSite: "Lax",
  }));
}

// --- reader reimplementation, only for the self-test (mirrors readSessionCookie) ---
function readBack(cookies) {
  const map = new Map(cookies.map((c) => [c.name, c.value]));
  const meta = map.get(META_NAME);
  if (!meta) return null;
  const [version, count, expected] = meta.split(":");
  if (version !== META_VERSION) return null;
  const total = Number(count);
  if (!Number.isInteger(total) || total < 1) return null;
  let payload = "";
  for (let i = 0; i < total; i += 1) {
    const chunk = map.get(`${PREFIX}.${i}`);
    if (chunk === undefined) return null;
    payload += chunk;
  }
  if (checksum(payload) !== expected) return null;
  return decodeURIComponent(payload);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const big = JSON.stringify({
    access_token: "a".repeat(900) + ".b.c",
    refresh_token: "r".repeat(40),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: 9999999999,
    user: { id: "u", email: "sean+verify@thirdwavediscounts.com", note: "spaces & symbols =;%" },
  });
  for (const session of ["{}", big, JSON.stringify({ s: "x".repeat(9000) })]) {
    const cookies = sessionCookies(session);
    const back = readBack(cookies);
    const chunks = cookies.filter((c) => CHUNK_NAME.test(c.name)).length;
    if (back !== session) {
      console.error(`FAIL round-trip (${chunks} chunks)`);
      process.exit(1);
    }
    if (cookies.some((c) => `${c.name}=${c.value}`.length > 4096)) {
      console.error("FAIL a cookie exceeds the 4096-byte browser cap");
      process.exit(1);
    }
    console.log(`ok  ${chunks} chunk(s), largest pair ${Math.max(...cookies.map((c) => `${c.name}=${c.value}`.length))} bytes`);
  }
  console.log("self-test passed");
}
