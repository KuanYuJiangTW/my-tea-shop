import { describe, it, expect, vi } from "vitest";
import { existsSync } from "fs";
import { dirname, join } from "path";

// sitemap 收錄的靜態路徑必須真的有對應的頁面。
//
// 背景（2026-08-25）：把 `/tea-guide` 加進 sitemap 時假設列表頁存在——
// 因為 `tea-guide/[slug]/page.tsx` 在，而且**每篇文章的 BreadcrumbList JSON-LD
// 第二層早就指向 `/tea-guide`**。實際上那個路由從來沒建過，回的是 404。
//
// 這種錯誤不會有任何徵兆：麵包屑指向 404 不報錯，sitemap 收錄 404 也不報錯，
// 一路到 Search Console 送出建立索引被擋下來（「系統偵測到該網址存在編制索引問題」）
// 才知道。單元測試與 build 都抓不到，因為兩者都不會去問「這個路徑有頁面嗎」。

vi.mock("@/lib/experiences", () => ({
  getExperienceTypes: async () => [{ slug: "tea-ceremony" }],
}));

vi.mock("@/lib/articles", () => ({
  getArticles: async () => [
    { slug: "cattle-egret-viewing-guide", publishedAt: "2026-08-21T09:00:00.000Z" },
  ],
}));

const APP_DIR = join(dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "..", "..", "app");

/** 這個路徑在 App Router 底下有沒有 page.tsx */
function hasPage(path: string): boolean {
  const dir = path === "" ? APP_DIR : join(APP_DIR, path);
  return existsSync(join(dir, "page.tsx"));
}

describe("sitemap 的每個靜態路徑都要有對應頁面", () => {
  it("不收錄任何沒有 page.tsx 的路徑", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();

    // 只驗中文版（無 /en 前綴）的靜態頁：/en 是 proxy rewrite 過去的同一批路由，
    // 動態頁（體驗、文章）的 slug 來自 CMS，不對應檔案系統上的固定目錄
    const dynamicPrefixes = ["/experiences/", "/tea-guide/"];
    const staticPaths = entries
      .map(e => e.url.replace("https://taiwantea.store", ""))
      .filter(p => !p.startsWith("/en"))
      .filter(p => !dynamicPrefixes.some(prefix => p.startsWith(prefix)));

    const missing = staticPaths.filter(p => !hasPage(p.replace(/^\//, "")));

    expect(missing, `sitemap 收錄了沒有頁面的路徑：${missing.join(", ")}`).toEqual([]);
  });

  it("文章詳細頁的麵包屑指向 /tea-guide，所以那個列表頁必須存在", () => {
    // 這條單獨釘住，因為它就是 2026-08-25 那次的真正肇因——
    // 就算日後有人把 /tea-guide 從 sitemap 拿掉，麵包屑仍然指著它
    expect(hasPage("tea-guide")).toBe(true);
  });
});
