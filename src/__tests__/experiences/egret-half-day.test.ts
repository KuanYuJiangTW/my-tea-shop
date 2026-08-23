import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * 650 元的「萬鷺朝鳳半日・等鳥茶席」**決定不上架**（2026-08-23）。
 *
 * 它沒有多賣任何東西：核心內容在 450 元導覽上用現場加購就拿得到，而且
 * 3 人時反而便宜 150 元。資料庫裡那一筆留著當紀錄，`is_active = FALSE`。
 *
 * 這個檔案守的是**「不要被誤上架」**——這種錯誤不會有錯誤訊息，只會讓
 * 前台多出一個沒有內容、沒有場次、比隔壁貴的商品。原本這裡守的是相反的
 * 事（守住它存在），那份斷言連同上架指南一起撤掉了。
 */

const root = (p: string) => join(process.cwd(), p);
const read = (p: string) => readFileSync(root(p), "utf8");

describe("不得被誤上架", () => {
  it("SQL 裡沒有任何把 is_active 設成 TRUE 的語句", () => {
    const sql = read("supabase/add_egret_half_day.sql");
    // 連註解掉的都不留——註解裡的指令是最容易被複製貼上的那種
    expect(sql).not.toMatch(/is_active\s*=\s*TRUE/i);
  });

  it("SQL 建立時就是關著的", () => {
    expect(read("supabase/add_egret_half_day.sql")).toMatch(/FALSE,\s*FALSE,\s*100\)/);
  });

  it("SQL 開頭講清楚為什麼不上架，而不是只寫「已停用」", () => {
    const sql = read("supabase/add_egret_half_day.sql");
    expect(sql).toContain("決定不上架");
    expect(sql).toContain("1,800");   // 那個算式要留著，不然下次又會有人想做
    expect(sql).toContain("1,950");
  });

  it("上架指南已經移除——那是最可能被照做的東西", () => {
    expect(existsSync(root("openspec/changes/experience-open-class-request/egret-half-day-content.md"))).toBe(false);
  });
});

describe("前台不留殘跡", () => {
  it("FALLBACK_CONTENT 不再有這一款", () => {
    expect(read("src/lib/experiences.ts")).not.toContain("egret-half-day");
  });

  it("450 元的導覽仍在，那才是實際在賣的", () => {
    expect(read("src/lib/experiences.ts")).toContain('"cattle-egret-tour": {');
  });
});
