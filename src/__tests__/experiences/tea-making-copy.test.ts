import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * 紅茶製作（3 小時場）的文案必須符合實際流程。
 *
 * 業主 2026-08-25 說明的實際流程（記於 `.claude/WORKLOG.md` 同日一節）：
 * **客人只做揉捻與靜置發酵**；採摘與日光萎凋在他抵達前由業主完成，烘乾也是
 * 業主做，成品**事後寄送**而不是當天帶走。
 *
 * 原本三處與事實不符：「從萎凋、揉捻到乾燥」「完整體驗每個步驟」「成品帶回」。
 * 這類「客人實際會做什麼、拿到什麼」的宣稱與製茶過程頁的農藥宣稱同類
 * （lessons.md 2026-07-30）——它不會讓任何測試變紅，只會讓客人到了現場
 * 才發現不是那樣。
 *
 * 依 lessons.md 對禁止類斷言的要求，每一組都寫成雙向：該講的有講、
 * 不該講的沒講。
 */

const root = (p: string) => join(__dirname, "../../../", p);
const read = (p: string) => readFileSync(root(p), "utf8");

/** `FALLBACK_CONTENT` 裡 tea-making 那一段（只驗這一款，別款有「帶回」是對的） */
function teaMakingBlock(): string {
  const src = read("src/lib/experiences.ts");
  const from = src.indexOf('"tea-making": {');
  expect(from, "FALLBACK_CONTENT 找不到 tea-making").toBeGreaterThan(-1);
  const to = src.indexOf("\r\n  },", from);
  return src.slice(from, to);
}

describe("FALLBACK_CONTENT 的紅茶製作（Sanity 掛掉時頂上來的那一份）", () => {
  it("講出客人實際做的那兩件事", () => {
    const block = teaMakingBlock();
    expect(block).toContain("揉捻");
    expect(block).toContain("發酵");
  });

  it("講出採摘與萎凋是業主先做的，不是客人做的", () => {
    expect(teaMakingBlock()).toContain("萎凋");
  });

  it("講出成品是寄的，而且不宣稱當天帶回", () => {
    const block = teaMakingBlock();
    expect(block).toContain("寄");
    expect(block).not.toContain("成品帶回");
  });

  it("不得再宣稱「完整」製程——客人做的是四道工序裡的兩道", () => {
    expect(teaMakingBlock()).not.toContain("完整體驗");
  });
});

describe("llms.txt 的紅茶製作（AI 搜尋讀的就是這一行）", () => {
  const line = () =>
    read("public/llms.txt").split(/\r?\n/).find(l => l.includes("experiences/tea-making")) ?? "";

  it("這一行存在", () => {
    expect(line()).not.toBe("");
  });

  it("講揉捻與寄送，不講完整製程與帶回", () => {
    expect(line()).toContain("揉捻");
    expect(line()).toContain("寄");
    expect(line()).not.toContain("完整製程");
    expect(line()).not.toContain("成品帶回");
  });
});

describe("adjust_experience_pricing.sql 的第 2 段（1,000 元／6 人）", () => {
  /**
   * 業主 2026-08-25 決定不採用，維持 800／4。
   *
   * 這個檔案的檔頭寫著「整檔貼上跑。可重複執行（冪等）」——留著可執行的
   * UPDATE，哪天有人照著說明整檔跑一次，紅茶就會在沒人決定的情況下被改價。
   * 它已經害我把 1,000／6 當成線上現況跟業主報過一次（lessons.md 2026-08-25）。
   */
  const sql = () => read("supabase/adjust_experience_pricing.sql");

  /** 去掉註解行之後、真正會被執行到的 SQL */
  const executable = () =>
    sql().split(/\r?\n/).filter(l => !l.trim().startsWith("--")).join("\n");

  it("那段 UPDATE 不會被執行到", () => {
    expect(executable()).not.toContain("price = 1000");
    expect(executable()).not.toContain("min_participants = 6");
  });

  it("標明未採用，而且理由留著——刪掉理由下次會有人重新提一次", () => {
    expect(sql()).toContain("未採用");
    expect(sql()).toContain("390／人時");
  });

  it("檔末的驗證表跟著改成 800，不然跑完會對不上", () => {
    expect(sql()).toContain("紅茶製作            800");
  });
});
