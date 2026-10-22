import "server-only";
import { redirect } from "next/navigation";
import { getSession, type Session } from "./session";
import { UnauthorizedError } from "./newapi";

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

/** Runs a New API call; if New API says the session is gone, logs the visitor out. */
export async function authed<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/auth/expired");
    throw e;
  }
}
