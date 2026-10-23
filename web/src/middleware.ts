import { NextResponse, type NextRequest } from "next/server";

// Cheap gate: no cookie, no dashboard. The real check happens server-side when the
// cookie is decrypted and New API accepts the inner session.
export function middleware(req: NextRequest) {
  if (!req.cookies.has("aura_session")) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/console/:path*"] };
