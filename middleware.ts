import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 非預設語言前綴清單（只有 "en"；預設 "zh" 沒有前綴）
const NON_DEFAULT_LOCALES = ["en"] as const;
const DEFAULT_LOCALE = "zh";
const LOCALE_HEADER = "X-NEXT-INTL-LOCALE";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 偵測 /en/... 前綴
  let locale = DEFAULT_LOCALE;
  let rewritePath: string | null = null;

  for (const loc of NON_DEFAULT_LOCALES) {
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
      locale = loc;
      rewritePath = pathname.slice(loc.length + 1) || "/";
      break;
    }
  }

  // 設定 X-NEXT-INTL-LOCALE header，讓 getRequestConfig 的 requestLocale 可讀取
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);

  // /en/xxx → rewrite 到 /xxx（內部路由）
  if (rewritePath !== null) {
    const url = request.nextUrl.clone();
    url.pathname = rewritePath;
    return NextResponse.rewrite(url, { request: { headers } });
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!admin|api|_next|.*\\..*).*)"],
};
