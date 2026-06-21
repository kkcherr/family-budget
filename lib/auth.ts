/**
 * Shared-password auth.
 *
 * Both partners type one shared password (APP_PASSWORD). On success we set a
 * signed, httpOnly cookie. The signature is an HMAC-SHA256 over the payload
 * using SESSION_SECRET, computed with the Web Crypto API so the same code runs
 * in Edge middleware and Node API routes.
 */

export const SESSION_COOKIE = "fb_session";
const SESSION_TTL_DAYS = 30;

function getSecret(): string {
  return process.env.SESSION_SECRET ?? "";
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmac(message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return new Uint8Array(sig);
}

/** Constant-time-ish comparison of two byte arrays. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Create a signed session token. Payload encodes the expiry timestamp. */
export async function createSessionToken(): Promise<string> {
  const expires = Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  const payload = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify({ exp: expires }))
  );
  const sig = bytesToBase64Url(await hmac(payload));
  return `${payload}.${sig}`;
}

/** Verify a session token's signature and expiry. */
export async function verifySessionToken(
  token: string | undefined
): Promise<boolean> {
  if (!token || !getSecret()) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;

  const expected = await hmac(payload);
  const provided = base64UrlToBytes(sig);
  if (!timingSafeEqual(expected, provided)) return false;

  try {
    const data = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(payload))
    ) as { exp?: number };
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

/** Compare a submitted password against APP_PASSWORD in constant time. */
export async function passwordMatches(submitted: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD ?? "";
  if (!expected) return false;
  const enc = new TextEncoder();
  const a = enc.encode(submitted);
  const b = enc.encode(expected);
  // Hash both to equal-length digests first so length isn't leaked.
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", a),
    crypto.subtle.digest("SHA-256", b),
  ]);
  return timingSafeEqual(new Uint8Array(ha), new Uint8Array(hb)) &&
    submitted.length === expected.length;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
};
