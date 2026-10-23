import "server-only";
import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";

// Our own cookie. It wraps New API's Gin "session" cookie in an encrypted JWT so the
// browser never talks to New API directly and cannot read or forge the inner session.
const COOKIE = "aura_session";
const MAX_AGE = 60 * 60 * 24 * 30; // New API sessions also last 30 days

export type Session = {
  uid: number;
  username: string;
  // Raw value of New API's "session" cookie.
  nc: string;
};

let keyPromise: Promise<Uint8Array> | null = null;

function getKey(): Promise<Uint8Array> {
  if (!keyPromise) {
    const secret = process.env.WEB_SESSION_SECRET || process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
      if (process.env.NODE_ENV === "production" && process.env.NEWAPI_URL) {
        throw new Error("WEB_SESSION_SECRET must be set (at least 32 characters)");
      }
    }
    const material = new TextEncoder().encode(secret || "dev-only-insecure-secret-change-me-please");
    keyPromise = crypto.subtle.digest("SHA-256", material).then((buf) => new Uint8Array(buf));
  }
  return keyPromise;
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtDecrypt(raw, await getKey());
    const s = payload as unknown as Session;
    if (typeof s.uid !== "number" || typeof s.nc !== "string") return null;
    return { uid: s.uid, username: String(s.username || ""), nc: s.nc };
  } catch {
    return null;
  }
}

/** Only callable from Server Actions and Route Handlers. */
export async function setSession(s: Session): Promise<void> {
  const token = await new EncryptJWT({ ...s })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .encrypt(await getKey());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** Only callable from Server Actions and Route Handlers. */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export const SESSION_COOKIE = COOKIE;
