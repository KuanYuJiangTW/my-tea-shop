import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const SUPABASE_HOST = "wrknatfejiexqlyywuzz.supabase.co";

function buildCSP(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com https://taiwantea.store`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src 'self' data: blob: https://${SUPABASE_HOST}`,
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' https://${SUPABASE_HOST} https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://payment.ecpay.com.tw https://logistics.ecpay.com.tw https://cloudflareinsights.com`,
    "frame-src https://payment.ecpay.com.tw https://logistics.ecpay.com.tw",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://payment.ecpay.com.tw https://logistics.ecpay.com.tw",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Nonce 生成（Web Crypto API，相容 Edge Runtime）──────────────────────────
  const nonce = btoa(crypto.randomUUID());

  // 將 nonce 注入 request headers，供 Server Component layout 讀取
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // ─── Supabase Session Refresh ────────────────────────────────────────────────
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => requestHeaders.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
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
  // 登入頁、auth API、2FA 驗證頁（需有 admin_pending cookie）不需 session
  if (pathname === "/admin" || pathname.startsWith("/api/admin/auth")) {
    if (!pathname.startsWith("/studio")) {
      response.headers.set("Content-Security-Policy", buildCSP(nonce));
    }
    return response;
  }

  // /admin/verify-2fa：允許持有 admin_pending cookie 的請求通過
  if (pathname === "/admin/verify-2fa") {
    const pending = request.cookies.get("admin_pending")?.value;
    if (pending === "1") {
      response.headers.set("Content-Security-Policy", buildCSP(nonce));
      return response;
    }
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/")) {
    const session = request.cookies.get("admin_session")?.value;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Timing-safe 比對（Edge Runtime 使用 WebCrypto）
    const isValid = await (async () => {
      if (!adminPassword || !session) return false;
      const enc = new TextEncoder();
      const key = await globalThis.crypto.subtle.importKey(
        "raw", enc.encode(adminPassword), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
      );
      const sig = await globalThis.crypto.subtle.sign("HMAC", key, enc.encode("wujue-admin-v1"));
      const expected = Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, "0")).join("");
      if (session.length !== expected.length) return false;
      let diff = 0;
      for (let i = 0; i < session.length; i++) {
        diff |= session.charCodeAt(i) ^ expected.charCodeAt(i);
      }
      return diff === 0;
    })();

    if (!isValid) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // ─── 動態 CSP（含 nonce）───────────────────────────────────────────────────
  // Studio 使用寬鬆 CSP（Sanity Studio 需要 unsafe-eval），其餘路由套用 nonce CSP
  if (!pathname.startsWith("/studio")) {
    response.headers.set("Content-Security-Policy", buildCSP(nonce));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
