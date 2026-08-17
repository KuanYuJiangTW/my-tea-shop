import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, sep } from "path";

// 公開頁面的圖片 alt 不得寫死中文。
//
// 背景（2026-08-17）：英文頁的 metadata 雙語化之後，掃線上 HTML 才發現圖片 alt
// 還是中文——`alt="阿里山高山烏龍茶 第二張"`、`aria-label="放大查看 阿里山高山烏龍茶"`。
// 卡片標題本來就刻意雙語（英文標題＋中文斜體副標），但 alt 是單一字串，是 Google
// 圖片搜尋與螢幕閱讀器唯一的文字來源，英文頁塞中文等於兩者都拿到錯的語言。
//
// 這裡掃的是**字面值**（`alt="中文"`、`alt={`中文`}`），不是變數——變數是否正確
// 交給人看，但寫死中文一定是錯的，而且是最容易復發的形式。

const CJK = /[㐀-䶿一-鿿]/;

// 後台與 Studio 是 noindex 的內部工具，不對外，沿用中文 alt 沒問題
const EXCLUDED_DIRS = ["admin", "studio"];

function collectTsx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (EXCLUDED_DIRS.includes(entry)) continue;
      out.push(...collectTsx(full));
    } else if (entry.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

const SRC = join(process.cwd(), "src");
const files = [
  ...collectTsx(join(SRC, "app")),
  ...collectTsx(join(SRC, "components")),
];

// alt="…" / alt='…' / alt={`…`}
const ALT_LITERAL = /\balt=(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;

describe("公開頁面的圖片 alt 不得寫死中文", () => {
  it("掃到的檔案數量合理（防呆：路徑寫錯會掃到 0 個而假性通過）", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("沒有任何 alt 字面值含中文", () => {
    const offenders: string[] = [];

    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(ALT_LITERAL)) {
        const value = m[1] ?? m[2] ?? m[3] ?? "";
        if (CJK.test(value)) {
          const line = src.slice(0, m.index).split("\n").length;
          offenders.push(`${relative(SRC, file).split(sep).join("/")}:${line}  alt=${JSON.stringify(value)}`);
        }
      }
    }

    expect(
      offenders,
      `以下 alt 寫死中文，英文頁會拿到錯的語言：\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("已知該用翻譯鍵的三處確實改掉了（防止測試被繞過）", () => {
    const home = readFileSync(join(SRC, "app", "page.tsx"), "utf8");
    expect(home).toContain('alt={t("heroImageAlt")}');
    expect(home).toContain('alt={t("craftImageAlt")}');

    const card = readFileSync(join(SRC, "components", "ProductCard.tsx"), "utf8");
    expect(card).toContain('t("imageAltSecond"');
    expect(card).toContain('t("zoomLabel"');
  });
});

describe("alt 用的翻譯鍵 zh／en 都存在", () => {
  // next-intl 缺鍵不會讓 build 失敗，只會在 runtime 噴錯訊息當成字串顯示
  const zh = JSON.parse(readFileSync(join(process.cwd(), "messages", "zh.json"), "utf8"));
  const en = JSON.parse(readFileSync(join(process.cwd(), "messages", "en.json"), "utf8"));

  const required: Array<[string, string]> = [
    ["products", "imageAltSecond"],
    ["products", "zoomLabel"],
    ["home", "heroImageAlt"],
    ["home", "craftImageAlt"],
  ];

  for (const [ns, key] of required) {
    it(`${ns}.${key} 兩種語言都有，且 en 不含中文`, () => {
      expect(zh[ns]?.[key], `zh 缺 ${ns}.${key}`).toBeTruthy();
      expect(en[ns]?.[key], `en 缺 ${ns}.${key}`).toBeTruthy();
      expect(CJK.test(en[ns][key]), `en 的 ${ns}.${key} 含中文`).toBe(false);
    });
  }

  it("帶 {name} 佔位符的鍵，兩種語言都要保留佔位符", () => {
    for (const key of ["imageAltSecond", "zoomLabel"]) {
      expect(zh.products[key]).toContain("{name}");
      expect(en.products[key]).toContain("{name}");
    }
  });
});
