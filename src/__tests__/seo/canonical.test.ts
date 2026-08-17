import { describe, it, expect, vi } from "vitest";

// canonical 的語言分支回歸測試。
//
// 背景（2026-08-17）：`/en/*` 由 src/proxy.ts 內部 rewrite 到無前綴路徑，兩個語言
// 共用同一份 metadata。langAlternates 原本寫死 `canonical: path`，等於每個英文頁
// 都宣告「我的正式版本是中文頁」；sitemap 又同時列出那 16 個 /en 網址要求收錄。
// Google Search Console 因此寄信通知「替代頁面（有適當的標準標記）」——
// 英文頁全數被排除在索引外。

const mockLocale = vi.fn<() => Promise<string>>();
vi.mock("next-intl/server", () => ({
  getLocale: () => mockLocale(),
}));

import { langAlternates, pathForLocale } from "@/lib/seo";

function asZh() { mockLocale.mockResolvedValue("zh"); }
function asEn() { mockLocale.mockResolvedValue("en"); }

describe("pathForLocale", () => {
  it("zh 不加前綴", () => {
    expect(pathForLocale("/about", "zh")).toBe("/about");
    expect(pathForLocale("/", "zh")).toBe("/");
  });

  it("en 加上 /en 前綴，首頁是 /en 而非 /en/", () => {
    expect(pathForLocale("/about", "en")).toBe("/en/about");
    expect(pathForLocale("/", "en")).toBe("/en");
    expect(pathForLocale("/experiences/tea-ceremony", "en")).toBe("/en/experiences/tea-ceremony");
  });
});

describe("langAlternates：canonical 必須指向當前語言自己", () => {
  const paths = ["/", "/products", "/about", "/experiences/tea-ceremony", "/web-design/case"];

  for (const path of paths) {
    it(`zh 的 ${path} self-canonical`, async () => {
      asZh();
      const a = await langAlternates(path);
      expect(a.canonical).toBe(path);
    });

    it(`en 的 ${path} canonical 指向 /en 版本，不得指回中文頁`, async () => {
      asEn();
      const a = await langAlternates(path);
      expect(a.canonical).toBe(pathForLocale(path, "en"));
      // 這就是原本的 bug：canonical 等於中文路徑
      if (path !== "/") {
        expect(a.canonical).not.toBe(path);
      }
    });
  }

  it("兩個語言的 hreflang 叢集內容一致（互為 return tag）", async () => {
    asZh();
    const zh = await langAlternates("/products");
    asEn();
    const en = await langAlternates("/products");

    expect(zh.languages).toEqual(en.languages);
    expect(zh.languages).toEqual({
      "zh-TW": "/products",
      "en": "/en/products",
      "x-default": "/products",
    });
  });

  it("x-default 指向 zh-TW 版本", async () => {
    asZh();
    const a = await langAlternates("/faq");
    expect(a.languages["x-default"]).toBe(a.languages["zh-TW"]);
  });

  it("首頁的 hreflang 用 /en 而非 /en/", async () => {
    asZh();
    const a = await langAlternates("/");
    expect(a.languages.en).toBe("/en");
  });
});
