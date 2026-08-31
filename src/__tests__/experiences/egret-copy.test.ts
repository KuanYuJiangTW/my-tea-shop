import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * 賞鳥文案的事實不變量。
 *
 * 起因（2026-08-31）：`llms.txt` 把導覽價格寫成 **250 元**，實際是 450。
 * 那個檔案是專門餵給 AI 檢索器的，錯的價格會被原樣引用出去，而型別檢查、
 * lint、build 一個都抓不到——它只是一個純文字檔。專案已經有替 llms.txt
 * 釘內容的慣例（見 `tea-making-copy.test.ts`），這裡照辦。
 *
 * 第二件事是「兩個賞鳥地點的條件不能混在一起講」。實際狀況是：
 *   賞黃頭鷺景觀平台停車場 —— 免費、有車位、**沒有座位也沒有洗手間**
 *   信淳茶居               —— 150 元／人、含停車、**有洗手間與遮蔭座位**
 * 兩者寫在一起，客人會停到免費那邊才發現沒廁所沒椅子。這是客訴等級的誤導，
 * 而且同時弱化了 150 元的價值——先講免費那邊沒有什麼，付費的價值才立得起來。
 *
 * 第三件是歸屬：萬鷺朝鳳是景觀平台停車場與附近幾戶鄰居的觀景平台**一起**
 * 推起來的，不是哪一家的功勞（業主 2026-08-31 更正）。這類「客人到現場才會
 * 發現不一樣」與「把別人的功勞寫成自己的」的宣稱都不會讓任何測試變紅，
 * 所以要手動釘住。
 *
 * 依 lessons.md 對禁止類斷言的要求，每一組都寫成雙向：該講的有講、
 * 不該講的沒講。
 */

const root = (p: string) => join(__dirname, "../../../", p);
const read = (p: string) => readFileSync(root(p), "utf8");

const egretLine = () =>
  read("public/llms.txt").split(/\r?\n/).find(l => l.includes("experiences/cattle-egret-tour")) ?? "";

/** `FALLBACK_CONTENT` 裡 cattle-egret-tour 那一段（Sanity 掛掉時頂上來的那一份） */
function egretBlock(): string {
  const src = read("src/lib/experiences.ts");
  const from = src.indexOf('"cattle-egret-tour": {');
  expect(from, "FALLBACK_CONTENT 找不到 cattle-egret-tour").toBeGreaterThan(-1);
  const to = src.indexOf("coverImage:", from);
  return src.slice(from, to);
}

describe("llms.txt 的萬鷺朝鳳（AI 搜尋讀的就是這一行）", () => {
  it("這一行存在", () => {
    expect(egretLine()).not.toBe("");
  });

  it("導覽是 450 元，不是 250", () => {
    expect(egretLine()).toContain("450 元");
    expect(egretLine()).not.toContain("250 元");
  });

  it("看鳥茶位維持 150 元", () => {
    expect(egretLine()).toContain("150 元");
  });

  it("免費平台要講明沒有座位與洗手間——不講的話 AI 會答成兩邊條件一樣", () => {
    const line = egretLine();
    expect(line).toContain("沒有座位");
    expect(line).toContain("沒有洗手間");
  });

  it("茶居這邊要講明有洗手間與遮蔭座位", () => {
    const line = egretLine();
    expect(line).toContain("洗手間");
    expect(line).toContain("遮蔭座位");
  });
});

describe("FALLBACK_CONTENT 的賞鳥導覽 tagline", () => {
  it("不得宣稱推廣是自家開始的——是與鄰居的平台一起推起來的", () => {
    const block = egretBlock();
    expect(block).not.toContain("從我家門口");
    expect(block).not.toContain("推廣就是從");
  });

  it("仍要講得出賣點：停車、洗手間、茶席、賞鳥在同一個地方", () => {
    const block = egretBlock();
    for (const word of ["停車", "洗手間", "茶席", "賞鳥"]) {
      expect(block).toContain(word);
    }
  });
});

describe("llms.txt 不得再出現「推廣是自家開始的」說法", () => {
  it("整份檔案都沒有這個宣稱", () => {
    const txt = read("public/llms.txt");
    expect(txt).not.toContain("從我家門口");
    expect(txt).not.toContain("推廣就是從我家");
  });
});
