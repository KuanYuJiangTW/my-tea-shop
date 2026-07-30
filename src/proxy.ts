import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { verifyPendingToken } from "@/lib/admin-pending";

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

// ─── i18n Locale 偵測 ──────────────────────────────────────────────────────────
const NON_DEFAULT_LOCALES = ["en"] as const;
const DEFAULT_LOCALE = "zh";
const LOCALE_HEADER = "X-NEXT-INTL-LOCALE";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── i18n：偵測 /en/... 前綴，設定 locale header ─────────────────────────────
  let locale = DEFAULT_LOCALE;
  let rewritePath: string | null = null;

  for (const loc of NON_DEFAULT_LOCALES) {
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
      locale = loc;
      rewritePath = pathname.slice(loc.length + 1) || "/";
      break;
    }
  }

  // ─── Nonce 生成（Web Crypto API，相容 Edge Runtime）──────────────────────────
  const nonce = btoa(crypto.randomUUID());

  // 將 nonce 與 locale 注入 request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(LOCALE_HEADER, locale);

  // ─── 初始 Response（含 i18n rewrite）────────────────────────────────────────
  let response: NextResponse;
  if (rewritePath !== null) {
    const url = request.nextUrl.clone();
    url.pathname = rewritePath;
    response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

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
          if (rewritePath !== null) {
            const url = request.nextUrl.clone();
            url.pathname = rewritePath;
            response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
          } else {
            response = NextResponse.next({ request: { headers: requestHeaders } });
          }
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

  // /admin/verify-2fa：允許持有本站簽發之 admin_pending token 的請求通過
  if (pathname === "/admin/verify-2fa") {
    const pending = request.cookies.get("admin_pending")?.value;
    if (await verifyPendingToken(pending)) {
      response.headers.set("Content-Security-Policy", buildCSP(nonce));
      return response;
    }
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/")) {
    const session = request.cookies.get("admin_session")?.value;

    // 以 security definer RPC 查 DB 驗證 session（不需把 service_role key 帶進 Edge Runtime）
    // Admin 為高風險路徑：DB 失敗 fail-closed（回 false）。
    const isValid = await (async () => {
      if (!session) return false;
      try {
        const { data, error } = await supabase.rpc("validate_admin_session", {
          p_token: session,
        });
        if (error) {
          console.error("[admin-session] validate RPC 失敗，fail-closed:", error.message);
          return false;
        }
        return data === true;
      } catch (e) {
        console.error("[admin-session] validate RPC 例外，fail-closed:", e);
        return false;
      }
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
