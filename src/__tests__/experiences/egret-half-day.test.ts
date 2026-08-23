import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * 萬鷺朝鳳半日（等鳥茶席）是**新增一款**，不是取代 250 元的單純導覽。
 *
 * 這裡守的是「兩款並存」與「備援內容存在」兩件事。備援不是可有可無的：
 * `getExperienceContent()` 查不到內容就回 null，詳細頁直接 notFound()——
 * Sanity 沒建內容或掛掉時，這一款會是 404 而不是降級顯示。
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("備援內容", () => {
  const src = read("src/lib/experiences.ts");

  it("新款有備援，Sanity 沒內容時不會 404", () => {
    expect(src).toContain('"egret-half-day": {');
  });

  it("250 元的單純導覽仍在，兩款並存", () => {
    expect(src).toContain('"cattle-egret-tour": {');
  });

  it("備援有 tagline、includes、notes 三項——缺一項頁面就開天窗", () => {
    const block = src.slice(src.indexOf('"egret-half-day": {'));
    const body  = block.slice(0, block.indexOf("\n  },"));
    for (const k of ["tagline:", "coverImage:", "includes:", "notes:"]) {
      expect(body).toContain(k);
    }
  });
});

describe("上架 SQL", () => {
  const sql = read("supabase/add_egret_half_day.sql");

  it("以 is_active = FALSE 建立——內容沒進 Sanity 之前不該出現在前台", () => {
    expect(sql).toMatch(/FALSE,\s*FALSE,\s*100\)/);
    // 開啟的那一行必須是註解狀態
    expect(sql).toMatch(/--\s*UPDATE experience_types SET is_active = TRUE/);
  });

  it("時段只有 14:00——上午開這一款等於賣一個看不到鳥的下午", () => {
    expect(sql).toContain("ARRAY['14:00']");
  });

  it("開課參數包在欄位存在檢查裡，先跑本檔也不會爆", () => {
    expect(sql).toContain("information_schema.columns");
    expect(sql).toContain("column_name = 'accepts_requests'");
  });

  it("不動既有的 cattle-egret-tour（那是還在賣的商品）", () => {
    expect(sql).not.toMatch(/UPDATE experience_types[\s\S]{0,200}slug = 'cattle-egret-tour'/);
    expect(sql).not.toMatch(/DELETE FROM experience_types/);
  });
});
