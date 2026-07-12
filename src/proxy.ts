import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "ccm_session";

// Coarse-grained gate: only checks whether a session cookie is present, to
// avoid a DB round-trip on every request. Each protected page/route still
// verifies the session (and role, for /admin) server-side via
// requireUser()/requireAdmin() — this is a UX redirect, not the security
// boundary.
//
// Deliberately does NOT redirect an already-has-a-cookie visitor away from
// /login: cookie presence isn't proof the session is still valid (e.g. the
// DB was reset, or it expired), and redirecting on presence alone can ping-
// pong against the (app) layout's redirect-to-/login-when-invalid check.
// The "already logged in, skip the form" convenience is handled instead by
// src/app/login/layout.tsx, which validates the session for real.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(COOKIE_NAME);
  const { pathname } = request.nextUrl;

  if (!hasSession && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/achievement/:path*",
    "/leaderboard",
    "/secret",
    "/admin/:path*",
    "/login",
  ],
};
