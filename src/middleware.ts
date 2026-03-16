import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and auth API to pass through
  if (pathname === "/admin" || pathname.startsWith("/api/admin/auth")) {
    return NextResponse.next();
  }

  // Protect all other /admin/* and /api/admin/* routes
  const session = request.cookies.get("admin_session")?.value;
  const adminPassword = process.env.ADMIN_PASSWORD;

  const isValid =
    !!adminPassword &&
    !!session &&
    session === Buffer.from(adminPassword).toString("base64");

  if (!isValid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
