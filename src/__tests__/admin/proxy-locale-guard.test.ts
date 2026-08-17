import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// 後台守衛的 locale 繞過回歸測試。
//
// 背景（2026-08-17）：`/en/*` 由 src/proxy.ts 內部 rewrite 到無前綴路徑，但守衛
// 原本用「原始 pathname」判斷，`"/en/admin/dashboard".startsWith("/admin/")` 為
// false → 未登入 GET /en/admin/dashboard 在 production 回 200 並渲染營收資料。
// API 層因為有 withAdminAuth 而倖免（見 route-auth-coverage.test.ts），
// 但後台頁面是 server component 直查 Supabase，middleware 是唯一那道門。
//
// 這裡把 zh 與 en 兩條路徑成對驗證：任何一邊漏掉就是同一個 bug 復發。

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

// session 一律無效（等同未登入 / fail-closed），守衛應該擋下
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    rpc: async () => ({ data: false, error: null }),
  }),
}));

vi.mock("@/lib/admin-pending", () => ({
  verifyPendingToken: async () => false,
}));

import { proxy } from "@/proxy";

const BASE = "https://taiwantea.store";

function get(path: string) {
  return proxy(new NextRequest(`${BASE}${path}`));
}

describe("proxy 後台守衛：/en 前綴不得繞過", () => {
  const protectedPages: Array<[string, string]> = [
    ["/admin/dashboard", "/admin"],
    ["/en/admin/dashboard", "/en/admin"],
    ["/admin/orders", "/admin"],
    ["/en/admin/orders", "/en/admin"],
    ["/admin/settings", "/admin"],
    ["/en/admin/settings", "/en/admin"],
  ];

  for (const [path, expectedRedirect] of protectedPages) {
    it(`未登入存取 ${path} 應導回 ${expectedRedirect}`, async () => {
      const res = await get(path);
      expect(res.status, `${path} 應為 307 轉址，實際 ${res.status}`).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe(expectedRedirect);
    });
  }

  const protectedApis = [
    "/api/admin/orders",
    "/en/api/admin/orders",
    "/api/admin/products",
    "/en/api/admin/products",
  ];

  for (const path of protectedApis) {
    it(`未登入呼叫 ${path} 應回 401`, async () => {
      const res = await get(path);
      expect(res.status).toBe(401);
    });
  }

  it("verify-2fa 沒有有效 pending token 時，zh 與 en 都導回各自的登入頁", async () => {
    const zh = await get("/admin/verify-2fa");
    expect(zh.status).toBe(307);
    expect(new URL(zh.headers.get("location")!).pathname).toBe("/admin");

    const en = await get("/en/admin/verify-2fa");
    expect(en.status).toBe(307);
    expect(new URL(en.headers.get("location")!).pathname).toBe("/en/admin");
  });
});

describe("proxy 後台守衛：該放行的仍要放行", () => {
  // 登入頁本身不能被守衛擋住，否則沒人進得去（zh／en 皆然）
  for (const path of ["/admin", "/en/admin"]) {
    it(`${path}（登入頁）不應被轉址`, async () => {
      const res = await get(path);
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(401);
    });
  }

  for (const path of ["/api/admin/auth", "/en/api/admin/auth"]) {
    it(`${path}（登入端點）不應被 middleware 擋下`, async () => {
      const res = await get(path);
      expect(res.status).not.toBe(401);
    });
  }

  it("一般頁面不受影響", async () => {
    for (const path of ["/", "/en", "/products", "/en/products"]) {
      const res = await get(path);
      expect(res.status, `${path} 不該被擋`).not.toBe(307);
      expect(res.status, `${path} 不該被擋`).not.toBe(401);
    }
  });
});

describe("proxy：Studio 的寬鬆 CSP 判斷也要看 rewrite 後的路徑", () => {
  // Sanity Studio 需要 unsafe-eval，middleware 的 nonce CSP 會讓它跑不起來。
  // 判斷若用原始 pathname，/en/studio 會被誤套 nonce CSP。
  it("/studio 與 /en/studio 都不套 nonce CSP", async () => {
    for (const path of ["/studio", "/en/studio"]) {
      const res = await get(path);
      expect(res.headers.get("content-security-policy"), `${path} 不應有 middleware CSP`).toBeNull();
    }
  });

  it("非 Studio 頁面仍套上 nonce CSP", async () => {
    const res = await get("/en/products");
    expect(res.headers.get("content-security-policy")).toContain("nonce-");
  });
});
