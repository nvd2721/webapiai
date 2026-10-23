import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// New API dropped the session (expired, logged out elsewhere, password changed).
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login?expired=1", req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
