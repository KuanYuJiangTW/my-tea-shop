import { describe, it, expect, vi } from "vitest";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";

// robots.txt 與 noindex 的「不得互相矛盾」不變量。
//
// 背景（2026-08-17）：Google Search Console 同時寄來「遭到 robots.txt 封鎖」與
// 「遭到 noindex 標記排除」兩種通知。查下去發現 /cart、/checkout、/order/result
// 三頁**同時**被 robots.txt 封鎖又帶 noindex meta——被封鎖的頁面 Google 抓不到，
// 也就永遠讀不到那個 noindex，真正生效的只有封鎖。可靠的排除方式是
// 「允許抓取 + noindex」。這裡把三條不變量釘住，避免有人日後又往 DISALLOW 加東西。

vi.mock("@/lib/experiences", () => ({
  getExperienceTypes: async () => [
    { slug: "tea-ceremony" },
    { slug: "tea-picking" },
  ],
}));

// sitemap 也吃文章。不 mock 的話 @/lib/articles 會在模組載入時建 Sanity
// client，而測試環境沒有 NEXT_PUBLIC_SANITY_PROJECT_ID，整個檔案直接掛掉
vi.mock("@/lib/articles", () => ({
  getArticles: async () => [
    { slug: "cattle-egret-viewing-guide", publishedAt: "2026-08-21T09:00:00.000Z" },
  ],
}));

import { GET } from "@/app/robots.txt/route";
import sitemap from "@/app/sitemap";

const APP_DIR = join(process.cwd(), "src", "app");

async function robotsText(): Promise<string> {
  return await GET().text();
}

function disallowedPaths(text: string): string[] {
  return text
    .split("\n")
    .filter((l) => l.startsWith("Disallow:"))
    .map((l) => l.slice("Disallow:".length).trim());
}

// 沿著路由目錄往上找，看這條路由有沒有任何一層宣告 noindex
// （page.tsx 自己宣告，或某層 layout.tsx 宣告後由 metadata 繼承下來）
function declaresNoindex(routeDir: string): boolean {
  let dir = join(APP_DIR, routeDir);
  const stop = dirname(APP_DIR);
  while (dir.startsWith(APP_DIR) && dir !== stop) {
    for (const file of ["page.tsx", "layout.tsx"]) {
      const full = join(dir, file);
      if (existsSync(full) && /index:\s*false/.test(readFileSync(full, "utf8"))) return true;
    }
    dir = dirname(dir);
  }
  return false;
}

describe("robots.txt 只封鎖沒有 HTML 的路徑", () => {
  it("仍然封鎖 /api/", async () => {
    expect(disallowedPaths(await robotsText())).toContain("/api/");
  });

  it("不再封鎖任何靠 noindex 排除的頁面", async () => {
    const disallowed = disallowedPaths(await robotsText());
    for (const p of ["/cart", "/checkout", "/order/", "/admin", "/auth/", "/account"]) {
      expect(disallowed, `${p} 被 robots.txt 封鎖，頁面上的 noindex 將永遠讀不到`).not.toContain(p);
    }
  });

  it("被封鎖的路徑底下不存在「靠 noindex 排除」的頁面（矛盾偵測）", async () => {
    const disallowed = disallowedPaths(await robotsText());
    for (const p of disallowed) {
      // /api/ 底下是 route handler，沒有 metadata 可言，本來就不在此列
      if (p === "/api/") continue;
      const routeDir = p.replace(/^\/|\/$/g, "");
      expect(
        declaresNoindex(routeDir),
        `${p} 同時被 robots.txt 封鎖又宣告 noindex——兩者只能選一個`,
      ).toBe(false);
    }
  });

  it("仍然宣告 Content-Signal 與 sitemap 位置（AI 搜尋的正面宣告不能被弄掉）", async () => {
    const text = await robotsText();
    expect(text).toContain("Content-Signal: search=yes, ai-input=yes, ai-train=yes");
    expect(text).toContain("Sitemap: ");
    expect(text).toContain("User-Agent: GPTBot");
  });
});

describe("交易與個人頁面必須宣告 noindex", () => {
  // 這些路徑都沒有搜尋價值：購物流程、後台、登入、個人資料、單次連結。
  // 原本有幾條是靠 robots.txt 擋的（且沒有 /en 版本），現在一律走 noindex。
  //
  // 路由一律用正斜線寫。`join()` 會自己正規化成各平台的分隔符，
  // **不要改回反斜線**——那在 Windows 上會過、在 Linux 上會全紅：
  // `\` 在 Linux 是合法的檔名字元，`join(APP_DIR, "order\\result")` 得到的是
  // 一個名叫 `order\result` 的檔案，`existsSync` 當然回 false，
  // 於是這個測試會用「路由不存在，測試已腐爛」的訊息騙你去改路由清單。
  // 2026-08-31 由 CI（ubuntu-latest）首次跑到才發現，本機 Windows 一直是綠的。
  const mustBeNoindex = [
    "cart",
    "checkout",
    "order/result",
    "admin",
    "studio",
    "auth/login",
    "auth/register",
    "account",
    "account/bookings/[id]/participants",
    "waitlist/[id]/confirm",
    "experiences/booking/[sessionId]",
  ];

  for (const routeDir of mustBeNoindex) {
    it(`/${routeDir} 宣告了 noindex`, () => {
      expect(existsSync(join(APP_DIR, routeDir)), `路由不存在，測試已腐爛：${routeDir}`).toBe(true);
      expect(declaresNoindex(routeDir)).toBe(true);
    });
  }
});

describe("sitemap 與 robots.txt 不得互相矛盾", () => {
  it("sitemap 列出的網址沒有任何一條被 robots.txt 封鎖", async () => {
    const disallowed = disallowedPaths(await robotsText());
    const entries = await sitemap();

    expect(entries.length).toBeGreaterThan(20);

    for (const entry of entries) {
      const path = new URL(entry.url).pathname || "/";
      for (const rule of disallowed) {
        expect(
          path.startsWith(rule),
          `sitemap 要求收錄 ${path}，但 robots.txt 用 ${rule} 封鎖了它`,
        ).toBe(false);
      }
    }
  });

  it("sitemap 同時列出 zh 與 en 兩個版本", async () => {
    const paths = (await sitemap()).map((e) => new URL(e.url).pathname);
    expect(paths).toContain("/products");
    expect(paths).toContain("/en/products");
    expect(paths).toContain("/en/experiences/tea-ceremony");
  });

  it("sitemap 的 hreflang 叢集含 x-default，與 HTML head 一致", async () => {
    // 兩邊給不同的叢集會讓 Google 收到互相矛盾的語言對應（見 src/lib/seo.ts）
    for (const entry of await sitemap()) {
      const langs = entry.alternates?.languages ?? {};
      expect(Object.keys(langs).sort(), `${entry.url} 的 hreflang 不完整`)
        .toEqual(["en", "x-default", "zh-TW"]);
      expect(langs["x-default"]).toBe(langs["zh-TW"]);
    }
  });
});
