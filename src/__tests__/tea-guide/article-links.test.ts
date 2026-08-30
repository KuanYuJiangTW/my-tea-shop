import { describe, it, expect } from "vitest";

import { linkifyParagraph, type LinkableName, type ParagraphSegment } from "@/lib/article-links";

// 攻略文自動連結的界線。
//
// 這支測試釘的不只是「有沒有連到」，更是「不該連的有沒有被連走」——
// 誤判的成本比漏判高：把「08:00 到 22:00」變成電話連結，讀者點下去會撥出一通
// 亂碼電話；把體驗名稱每次出現都連起來，內文就從第一人稱筆記變成置入廣告，
// 而這篇文章的說服力正好來自它不像廣告。
//
// 素材全部取自 `/tea-guide/cattle-egret-viewing-guide` 的實際段落。

const TOUR: LinkableName[] = [
  { name: "萬鷺朝鳳・茶山導覽", href: "/experiences/cattle-egret-tour" },
];

/** 把片段攤回純字串，用來確認「原文一個字都沒少」 */
const flatten = (segs: ParagraphSegment[]) =>
  segs.map(s => (typeof s === "string" ? s : s.text)).join("");

const linksIn = (segs: ParagraphSegment[]) =>
  segs.filter((s): s is Exclude<ParagraphSegment, string> => typeof s !== "string");

describe("linkifyParagraph — 電話", () => {
  it("把 09xx-xxx-xxx 轉成去連字號的 tel:", () => {
    const text = "打 0972-619-391 問我們就好（每日 08:00 到 22:00 都有人回）。";
    const segs = linkifyParagraph(text, [], new Set());
    const links = linksIn(segs);

    expect(links).toHaveLength(1);
    expect(links[0]).toEqual({ text: "0972-619-391", href: "tel:0972619391" });
    expect(flatten(segs)).toBe(text);
  });

  it("同一段出現兩次就連兩次——讀者在哪一段想打都該點得到", () => {
    const text = "打 0972-619-391，或改打 0912-345-678。";
    const links = linksIn(linkifyParagraph(text, [], new Set()));

    expect(links.map(l => l.href)).toEqual(["tel:0972619391", "tel:0912345678"]);
  });

  it("時間與日期不是電話：08:00 到 22:00、8 月 22 日到 10 月 11 日都不動", () => {
    const text = "8 月 22 日到 10 月 11 日限定，每日 08:00 到 22:00 都有人接。";
    const segs = linkifyParagraph(text, [], new Set());

    expect(linksIn(segs)).toHaveLength(0);
    expect(segs).toEqual([text]);
  });

  it("市話與沒有連字號的寫法不認——寧可漏判，不要撥錯號碼", () => {
    const text = "05-2571234 或 0972619391 都不該被當成連結。";
    expect(linksIn(linkifyParagraph(text, [], new Set()))).toHaveLength(0);
  });
});

describe("linkifyParagraph — 體驗名稱", () => {
  it("第一次出現連到體驗頁", () => {
    const text = "「萬鷺朝鳳・茶山導覽」每人 450 元，90 分鐘。";
    const links = linksIn(linkifyParagraph(text, TOUR, new Set()));

    expect(links).toEqual([
      { text: "萬鷺朝鳳・茶山導覽", href: "/experiences/cattle-egret-tour" },
    ]);
  });

  it("跨段落只連第一次——共用同一個 linked Set", () => {
    const linked = new Set<string>();
    const first  = linkifyParagraph("「萬鷺朝鳳・茶山導覽」每人 450 元。", TOUR, linked);
    const second = linkifyParagraph("只有「萬鷺朝鳳・茶山導覽」需要線上預約。", TOUR, linked);

    expect(linksIn(first)).toHaveLength(1);
    expect(linksIn(second)).toHaveLength(0);
    expect(second).toEqual(["只有「萬鷺朝鳳・茶山導覽」需要線上預約。"]);
  });

  it("同一段裡出現兩次也只連第一次", () => {
    const text = "萬鷺朝鳳・茶山導覽 就是 萬鷺朝鳳・茶山導覽。";
    expect(linksIn(linkifyParagraph(text, TOUR, new Set()))).toHaveLength(1);
  });

  it("沒有 relatedExperiences 時整段原封不動", () => {
    const text = "「萬鷺朝鳳・茶山導覽」每人 450 元。";
    expect(linkifyParagraph(text, [], new Set())).toEqual([text]);
  });

  it("空字串名稱不會把每個字元都切開", () => {
    const text = "每年 8 月到 10 月。";
    const segs = linkifyParagraph(text, [{ name: "", href: "/x" }], new Set());

    expect(segs).toEqual([text]);
  });
});

describe("linkifyParagraph — 混合與不變量", () => {
  it("電話與體驗名稱同段共存，順序不亂、原文不缺字", () => {
    const text =
      "「萬鷺朝鳳・茶山導覽」2 個人就成行，可以在網站上直接預約，或打 0972-619-391 問我們。";
    const segs  = linkifyParagraph(text, TOUR, new Set());
    const links = linksIn(segs);

    expect(links.map(l => l.href)).toEqual([
      "/experiences/cattle-egret-tour",
      "tel:0972619391",
    ]);
    expect(flatten(segs)).toBe(text);
  });

  it("任何輸入下攤平後都等於原文——切壞內容比沒連結嚴重得多", () => {
    const samples = [
      "每年 8 月到 10 月，成群的黃頭鷺會在午後飛越嘉義縣梅山鄉太興村的茶山。",
      "打 0972-619-391。",
      "「萬鷺朝鳳・茶山導覽」每人 450 元，90 分鐘，8 月 22 日到 10 月 11 日限定。",
      "0972-619-391",
      "",
    ];

    for (const text of samples) {
      expect(flatten(linkifyParagraph(text, TOUR, new Set()))).toBe(text);
    }
  });

  it("名稱重疊到電話上時，先出現的贏且不會產生重複文字", () => {
    const text = "0972-619-391 是我們的號碼";
    const segs = linkifyParagraph(
      text,
      [{ name: "0972-619-391 是我們的號碼", href: "/x" }],
      new Set(),
    );

    // 電話起點較前（同為 0），長者優先 → 整句被名稱吃掉，但原文不能變
    expect(flatten(segs)).toBe(text);
    expect(linksIn(segs)).toHaveLength(1);
  });
});
