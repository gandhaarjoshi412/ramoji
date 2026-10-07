import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Allow public paths unconditionally
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Protected paths check
  const protectedRoutes = [
    "/dashboard",
    "/events",
    "/foods",
    "/recipes",
    "/ingredients",
    "/settings",
  ];

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute) {
    const accessToken = request.cookies.get("access_token")?.value;
    const refreshToken = request.cookies.get("refresh_token")?.value;
    const token = request.cookies.get("token")?.value;

    const hasAuthCookie = !!(accessToken || refreshToken || token);

    if (!hasAuthCookie) {
      // Determine public domain and protocol behind reverse proxy
      const forwardedHost = request.headers.get("x-forwarded-host");
      const hostHeader = request.headers.get("host") || "";
      const forwardedProto = request.headers.get("x-forwarded-proto") || "http";

      let host = forwardedHost || hostHeader;
      // If external request over HTTPS arrived but host header is loopback, map to public domain
      if (forwardedProto === "https" && (host.includes("localhost") || host.includes("127.0.0.1"))) {
        host = process.env.DOMAIN || "ai.platesight.in";
      }

      const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
      const proto = isLocal ? "http" : forwardedProto;

      const callbackUrl = `${pathname}${search}`;
      const redirectUrl = new URL(`${proto}://${host}/login`);
      redirectUrl.searchParams.set("callbackUrl", callbackUrl);

      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
