import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = process.env.SESSION_COOKIE ?? "session_id";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/google",
  "/api/auth/local-login",
  "/api/auth/logout",
  "/api/users",
  "/_next",
  "/favicon.ico",
  "/uploads",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  if (!hasSession) {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)"],
};
