import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, it, expect } from "vitest";

// teaGuide 命名空間的中英文對照。
//
// next-intl 在鍵值缺漏時是**執行期**才丟錯，型別檢查、lint 與 build 全都不會抓到。
// 這一頁的英文版是給 AI 搜尋與海外訪客看的，缺一個鍵就是整頁 500——
// 而我們不會在中文站的日常操作中踩到它。
//
// 這裡也釘住「有帶參數的字串兩邊參數要一致」：把 {phone} 打成 {tel}，
// 畫面上會直接印出大括號原文。

type Msgs = Record<string, unknown>;

const load = (locale: string): Msgs =>
  JSON.parse(readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8"));

const zh = load("zh").teaGuide as Record<string, unknown>;
const en = load("en").teaGuide as Record<string, unknown>;

/** 把巢狀物件攤平成 "meta.title" 這種點路徑，才比對得到 meta 底下的鍵 */
function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v as Record<string, unknown>, key));
    else out[key] = String(v);
  }
  return out;
}

const flatZh = flatten(zh);
const flatEn = flatten(en);

/** 取出 {name} 這類佔位符 */
const params = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort();

describe("teaGuide 中英文鍵值", () => {
  it("中文有的鍵，英文都要有", () => {
    expect(Object.keys(flatZh).filter(k => !(k in flatEn))).toEqual([]);
  });

  it("英文有的鍵，中文都要有", () => {
    expect(Object.keys(flatEn).filter(k => !(k in flatZh))).toEqual([]);
  });

  it("沒有空字串——空的翻譯在畫面上看起來像壞掉", () => {
    const empty = Object.entries({ ...flatZh, ...flatEn }).filter(([, v]) => v.trim() === "");
    expect(empty.map(([k]) => k)).toEqual([]);
  });

  it("同一個鍵的參數兩邊一致", () => {
    const mismatched = Object.keys(flatZh)
      .filter(k => k in flatEn)
      .filter(k => JSON.stringify(params(flatZh[k])) !== JSON.stringify(params(flatEn[k])));
    expect(mismatched).toEqual([]);
  });

  it("這一輪新增的鍵都在（改名或誤刪會讓頁面在執行期才爆）", () => {
    const added = [
      "ctaCall", "ctaCallNote",          // 文末雙鍵 CTA
      "videoPlay", "videoPause",         // 首屏影片控制
      "toc",                             // 目錄
      "floatingCall", "floatingBook", "floatingDismiss",  // 浮動 CTA
      "sameDayTitle", "sameDayIntro", "sameDayItem", "sameDayNote",  // 同日交叉銷售
    ];
    expect(added.filter(k => !(k in flatZh))).toEqual([]);
    expect(added.filter(k => !(k in flatEn))).toEqual([]);
  });

  it("ctaCall 與 sameDayItem 的參數名稱正確——打錯會直接把大括號印在畫面上", () => {
    expect(params(flatZh.ctaCall)).toEqual(["{phone}"]);
    expect(params(flatZh.sameDayItem).sort()).toEqual(["{hours}", "{name}", "{price}"]);
  });
});
