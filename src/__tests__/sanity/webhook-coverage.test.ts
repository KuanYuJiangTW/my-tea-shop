import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";

/**
 * 釘住「Sanity 發布 → 前台換新」這條路上兩個會無聲斷掉的地方。
 *
 * 2026-09-05 的實況：Sanity 那支 hook 的 filter 是 `_type == "experience"`，
 * 文章發布從來沒觸發過任何一次投遞；同時 webhook 只清 path，而動態渲染的頁面
 * 沒有 route cache，真正卡住的 fetch data cache 是靠 tag 清的。兩個問題都不會
 * 讓任何東西變紅，只是內容舊了最多一小時。
 */

const captured = vi.hoisted(() => ({
  fetchOptions: [] as Record<string, unknown>[],
  tags:  [] as { tag: string; profile: unknown }[],
  paths: [] as { path: string; type?: string }[],
}));

vi.mock("next-sanity", () => ({
  createClient: () => ({
    fetch: (_q: string, _p: unknown, opts: Record<string, unknown>) => {
      captured.fetchOptions.push(opts);
      return Promise.resolve(null);
    },
  }),
}));

vi.mock("next/cache", () => ({
  revalidateTag:  (tag: string, profile: unknown) => captured.tags.push({ tag, profile }),
  revalidatePath: (path: string, type?: string)   => captured.paths.push({ path, type }),
}));

const verify = vi.hoisted(() => ({ result: { ok: true } as { ok: boolean; reason?: string } }));
vi.mock("@/lib/sanity-webhook", () => ({ verifySanityWebhook: () => verify.result }));

function post(body = JSON.stringify({ _type: "article" })) {
  return new NextRequest("https://taiwantea.store/api/sanity-webhook", {
    method: "POST",
    body,
  });
}

beforeEach(() => {
  captured.fetchOptions = [];
  captured.tags  = [];
  captured.paths = [];
  verify.result = { ok: true };
});

describe("查詢型別與 hook filter 的覆蓋範圍", () => {
  it("SANITY_QUERIED_TYPES 與 queries.ts 裡實際查的 _type 完全一致", async () => {
    // 直接讀原始碼而不是靠查詢常數字串比對：新增一句 GROQ 時，只要忘了同步
    // 這個常數，npm run check:sanity-hook 就會拿舊清單去比對正式設定而放行。
    const src = readFileSync(join(process.cwd(), "src/sanity/queries.ts"), "utf8");
    const queried = new Set(
      [...src.matchAll(/_type\s*==\s*"([^"]+)"/g)].map(m => m[1]),
    );

    const { SANITY_QUERIED_TYPES } = await import("@/sanity/queries");

    expect([...queried].sort()).toEqual([...SANITY_QUERIED_TYPES].sort());
  });
});

describe("sanityFetch 的快取標籤", () => {
  it("每一次查詢都掛上 SANITY_CACHE_TAG", async () => {
    const { sanityFetch, SANITY_CACHE_TAG } = await import("@/sanity/client");

    await sanityFetch("*[_type == 'article']");
    await sanityFetch("*[_type == 'faq']", { slug: "x" });

    expect(captured.fetchOptions).toHaveLength(2);
    for (const opts of captured.fetchOptions) {
      const next = opts.next as { tags?: string[]; revalidate?: number };
      expect(next.tags).toContain(SANITY_CACHE_TAG);
      // revalidate 是 webhook 沒送到時的兜底上限，不是主要路徑
      expect(next.revalidate).toBe(3600);
    }
  });
});

describe("webhook 清快取", () => {
  it("清 SANITY_CACHE_TAG，且用立即過期而非棄用的單參數寫法", async () => {
    const { POST } = await import("@/app/api/sanity-webhook/route");
    const { SANITY_CACHE_TAG } = await import("@/sanity/client");

    const res = await POST(post());
    expect(res.status).toBe(200);

    // Next 16 的 revalidateTag 第二個參數是必填：省略會走進棄用警告，
    // 傳 { expire: 0 } 才是「立刻過期」的正式寫法（見 next 的 revalidation-utils）。
    expect(captured.tags).toEqual([{ tag: SANITY_CACHE_TAG, profile: { expire: 0 } }]);
  });

  it("列表頁 /tea-guide 也在清除名單裡", async () => {
    // 回歸：ALL_ARTICLES_QUERY 常常是由列表頁或 sitemap 先寫進 data cache 的，
    // 只清 /tea-guide/[slug] 清不到那筆。
    const { POST } = await import("@/app/api/sanity-webhook/route");
    await POST(post());

    const paths = captured.paths.map(p => p.path);
    expect(paths).toContain("/tea-guide");
    expect(paths).toContain("/sitemap.xml");
    expect(captured.paths).toContainEqual({ path: "/tea-guide/[slug]", type: "page" });
  });

  it("驗證失敗時回 401，且一個快取都不清（fail-closed）", async () => {
    verify.result = { ok: false, reason: "簽章不符" };
    const { POST } = await import("@/app/api/sanity-webhook/route");

    const res = await POST(post());
    expect(res.status).toBe(401);
    expect(captured.tags).toHaveLength(0);
    expect(captured.paths).toHaveLength(0);
  });
});
