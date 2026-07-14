import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/api"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("sims_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session timeout check (8 hours)
  const loginTime = request.cookies.get("sims_login_time")?.value;
  if (loginTime) {
    const elapsed = Date.now() - parseInt(loginTime, 10);
    const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours
    if (elapsed > SESSION_TIMEOUT_MS) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("expired", "true");
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("sims_token");
      response.cookies.delete("sims_login_time");
      response.cookies.delete("sims_refresh_token");
      return response;
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
