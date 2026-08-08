/**
 * Shared session token derivation for admin UI cookie.
 * Works in Node (route handlers) and Edge (middleware) via Web Crypto.
 */

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export async function deriveAdminUiSessionToken(
  secret: string,
  password: string
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`admin-ui:${password}`)
  );
  return toHex(signature);
}

export async function sessionTokensEqual(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false;
  const enc = new TextEncoder();
  const aa = enc.encode(a);
  const bb = enc.encode(b);
  // constant-time-ish compare
  let out = 0;
  for (let i = 0; i < aa.length; i += 1) out |= aa[i] ^ bb[i];
  return out === 0;
}
