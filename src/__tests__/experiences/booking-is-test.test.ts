import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * 測試預約不得混進營收數字。
 *
 * 綠界測試模式只能在 Preview 跑，而 Preview 連的是同一個正式資料庫——每測
 * 一次就多一筆「看起來已付款、實際沒收到錢」的預約。靠「記得刪」是不行的：
 * 忘記一次數字就永遠對不回來，而且不會有任何徵兆。
 *
 * 這裡守兩件靜態掃描得出來的事：
 *   1. 正式站的結帳路徑**永遠不提** is_test —— 欄位沒建立也不能弄壞真實付款
 *   2. 營收查詢有 42703 退路 —— 程式先部署、SQL 後跑時儀表板不能整塊消失
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("寫入端：正式站不碰這個欄位", () => {
  const src = read("src/app/api/bookings/route.ts");

  it("is_test 是條件式帶入，不是無條件寫死", () => {
    expect(src).toContain("...(ECPAY_STAGE ? { is_test: true } : {})");
    // 無條件寫 is_test 的話，欄位還沒建立時真實結帳會 42703 失敗
    expect(src).not.toMatch(/^\s+is_test:\s/m);
  });

  it("條件綁在 ECPAY_STAGE 上——那個常數在 production 恆為 false", () => {
    expect(src).toContain('from "@/lib/ecpay-env"');
    expect(read("src/lib/ecpay-env.ts")).toContain("!isVercelProduction");
  });
});

describe("讀取端：欄位還沒建立也要活著", () => {
  const src = read("src/app/admin/(protected)/dashboard/page.tsx");

  it("營收查詢走 excludingTestBookings，不是直接 .eq", () => {
    // 只數呼叫點：宣告是 "async function excludingTestBookings<"，
    // 呼叫點是縮排在 Promise.all 陣列裡的。用 /g 全抓會把宣告也算進去
    const calls = src.match(/^ +excludingTestBookings</gm) ?? [];
    expect(calls.length).toBe(2);          // 本月收款 ＋ 六個月圖表
    expect(src).toContain("async function excludingTestBookings<");
  });

  it("撞到 42703 要退回不過濾，而不是讓查詢失敗", () => {
    expect(src).toContain('UNDEFINED_COLUMN = "42703"');
    expect(src).toMatch(/error\?\.code !== UNDEFINED_COLUMN/);
    expect(src).toContain("add_experience_bookings_is_test.sql");
  });
});

describe("SQL", () => {
  const sql = read("supabase/add_experience_bookings_is_test.sql");

  it("是加欄位、有預設值，既有寫入不受影響", () => {
    expect(sql).toMatch(/add column if not exists is_test boolean not null default false/i);
  });

  it("回填用 session 反查，不寫死 id", () => {
    expect(sql).toContain("created_from_request_id is not null");
    expect(sql).not.toMatch(/where b\.id = '[0-9a-f-]{36}'/i);
  });
});
