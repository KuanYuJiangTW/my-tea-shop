import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Supabase Session Refresh ────────────────────────────────────────────────
  // 必須在每個 request 執行以保持 session 正確
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 重要：不可移除，此呼叫會刷新 session token
  await supabase.auth.getUser();

  // ─── Admin Route Protection ───────────────────────────────────────────────────
  if (pathname === "/admin" || pathname.startsWith("/api/admin/auth")) {
    return response;
  }

  if (pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/")) {
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
  }

  return response;
}

export const config = {
  matcher: [
    // 排除靜態資源，其餘所有路由都執行 middleware（session refresh 需要）
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
