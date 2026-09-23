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

// ── 三階方案區塊的引言（messages 的 experiences.admission.intro）──────────────
//
// 2026-08-31 業主抓到：引言寫「停車場那邊…有車位、有洗手間、視野沒有電線橫過」，
// 但**正下方的免費卡片**寫「平台那邊也沒有洗手間跟座位」。同一個畫面上自相矛盾，
// 而且錯的那半邊會讓人停到免費平台才發現沒廁所。
//
// 這種矛盾不會有任何測試變紅——兩段文字分屬 messages 與 Sanity，沒有人比對過。
// 這裡就是那個比對。

const messages = (locale: string) =>
  JSON.parse(read(`messages/${locale}.json`)) as Record<string, unknown>;

/** experiences.admission 那一段（巢狀位置可能改，用遞迴找） */
function admission(locale: string): Record<string, string> {
  const found: Record<string, string>[] = [];
  const walk = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    const o = n as Record<string, unknown>;
    if (typeof o.intro === "string" && typeof o.perPerson === "string") found.push(o as Record<string, string>);
    Object.values(o).forEach(walk);
  };
  walk(messages(locale));
  expect(found.length, `messages/${locale}.json 找不到 admission 區塊`).toBe(1);
  return found[0];
}

describe("三階方案的引言不得與免費卡片打架", () => {
  it("中文：講明免費平台沒有座位、沒有洗手間", () => {
    const intro = admission("zh").intro;
    expect(intro).toContain("沒有座位");
    expect(intro).toContain("沒有洗手間");
  });

  it("中文：不得把「有洗手間」掛在停車場那一句上", () => {
    const intro = admission("zh").intro;
    expect(intro).not.toContain("有車位、有洗手間");
  });

  it("英文：講明免費停車場沒有座位、沒有洗手間", () => {
    const intro = admission("en").intro.toLowerCase();
    expect(intro).toContain("no seating");
    expect(intro).toContain("no toilets");
  });

  it("英文：不得把 toilets 直接列成停車場的設施", () => {
    const intro = admission("en").intro;
    expect(intro).not.toContain("which is also ours: parking, toilets");
  });

  it("兩種語言都要指出洗手間與座位在茶居那邊", () => {
    expect(admission("zh").intro).toContain("信淳茶居");
    expect(admission("en").intro.toLowerCase()).toContain("tea house");
  });
});

// ── 電線（業主 2026-09-24 更正，owner-source-quotes §2.13）────────────────────
//
// 攻略文、體驗頁、llms.txt、照片說明曾寫「視野沒有電線橫過」。實際上視野右側與下方有電線，
// 只是拍鳥群時基本上擋不到。客人帶長焦來一看就知道——這是 JUDG-11 (b) 那一類：
// 到了現場會發現跟寫的不一樣。Sanity 的文案測試碰不到，這裡釘住 repo 裡的每一個來源。

/** 去掉整行註解：改動紀錄的註解會引用舊說法，那不是對外文案 */
const withoutComments = (src: string) =>
  src.split(/\r?\n/).filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");

describe("不得宣稱視野沒有電線", () => {
  const sources = [
    "public/llms.txt",
    "messages/zh.json",
    "messages/en.json",
    "src/lib/experiences.ts",
    "src/lib/tea-guide-media.ts",
    "src/lib/venue.ts",
  ];

  it.each(sources)("%s 沒有「沒有電線」這類宣稱", file => {
    expect(withoutComments(read(file))).not.toMatch(/沒有電線|無電線|no power lines|nothing to dodge/i);
  });

  it("體驗頁備援的注意事項照業主原話講：電線在右側與下方，拍鳥群基本上擋不到", () => {
    // egretBlock() 只切到 coverImage 之前（tagline），注意事項在後面，所以讀整檔（去註解）
    const src = withoutComments(read("src/lib/experiences.ts"));
    expect(src).toMatch(/電線在[^，；]*右側(與|和)下方/);
    expect(src).toContain("基本上擋不到");
  });

  it("講視野的地方都同時交代電線——只寫「視野絕佳」不提電線，就又回到 09-24 以前的說法", () => {
    // 業主 09-25 要把視野寫成賣點，但要跟電線放在同一句（§2.13）
    for (const file of ["public/llms.txt", "src/lib/experiences.ts", "src/lib/tea-guide-media.ts"]) {
      const text = withoutComments(read(file));
      for (const line of text.split(/\r?\n/).filter(l => /視野絕佳|superb view/.test(l))) {
        expect(line, `${file}：${line.slice(0, 40)}…`).toMatch(/電線|power lines/);
      }
    }
  });
});
