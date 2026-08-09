import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  BOOKING_STATUS,
  statusBadge,
} from "@/lib/admin-status";

/**
 * 這支測試存在的理由：
 * dashboard 與訂單頁原本各自複製一份狀態對照表，且都少了鍵——
 * `stock_issue` / `failed` 的訂單會 fallback 成「新訂單」，
 * 已完課的預約會 fallback 成「待付款」。錯誤狀態偽裝成正常狀態，且毫無痕跡。
 *
 * 所以這裡不只檢查「現在對不對」，還會**掃描原始碼**找出所有實際會寫入的狀態值，
 * 未來有人新增狀態卻忘了補對照表時，這支測試會紅。
 */

// ── 掃描原始碼，找出實際會寫入／查詢的狀態字面值 ──────────────────────────
const SRC = "src";
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (p.includes("__tests__")) return [];
    if (statSync(p).isDirectory()) return walk(p);
    return /\.tsx?$/.test(p) ? [p] : [];
  });
}
const ALL_SOURCE = walk(SRC).map((f) => readFileSync(f, "utf8")).join("\n");

/** 抓 `欄位: "值"` 與 `.eq("欄位", "值")` 兩種形式 */
function scanValues(field: string): Set<string> {
  const found = new Set<string>();
  const patterns = [
    new RegExp(`${field}\\s*:\\s*"([a-z_]+)"`, "g"),
    new RegExp(`"${field}"\\s*,\\s*"([a-z_]+)"`, "g"),
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(ALL_SOURCE)) !== null) found.add(m[1]);
  }
  return found;
}

describe("後台狀態對照表的鍵覆蓋率", () => {
  it("orders.order_status 的每個實際值都有對照鍵", () => {
    const used = scanValues("order_status");
    expect(used.size).toBeGreaterThan(0); // 掃不到就是掃描壞了，不是通過
    const missing = [...used].filter((v) => !ORDER_STATUS[v]);
    expect(missing, `ORDER_STATUS 缺少鍵：${missing.join(", ")}`).toEqual([]);
  });

  it("orders.payment_status 的每個實際值都有對照鍵", () => {
    const used = scanValues("payment_status");
    expect(used.size).toBeGreaterThan(0);
    const missing = [...used].filter((v) => !PAYMENT_STATUS[v]);
    expect(missing, `PAYMENT_STATUS 缺少鍵：${missing.join(", ")}`).toEqual([]);
  });

  it("experience_bookings 的四個狀態都有對照鍵", () => {
    // 型別 BookingStatus 的定義（src/types/index.ts）
    for (const v of ["pending_payment", "confirmed", "cancelled", "completed"]) {
      expect(BOOKING_STATUS[v], `BOOKING_STATUS 缺少鍵：${v}`).toBeDefined();
    }
  });

  it("不存在只當 fallback 用、永遠不會被直接命中的死鍵", () => {
    // 舊表有 `pending` 鍵，但預約狀態實際是 `pending_payment`，
    // 該鍵從未被直接命中過，只是剛好被 `?? EXP_STATUS.pending` 當成預設值
    expect(BOOKING_STATUS.pending).toBeUndefined();
  });
});

describe("statusBadge 的 fallback", () => {
  it("查得到就回傳對應徽章", () => {
    expect(statusBadge(ORDER_STATUS, "shipped").label).toBe("已出貨");
    expect(statusBadge(BOOKING_STATUS, "completed").label).toBe("已完成");
  });

  it("查不到時顯示原始值，不偽裝成其他狀態", () => {
    const b = statusBadge(ORDER_STATUS, "some_new_status");
    expect(b.label).toContain("some_new_status");
    // 關鍵：不可以變成任何一個既有狀態的標籤
    const realLabels = Object.values(ORDER_STATUS).map((s) => s.label);
    expect(realLabels).not.toContain(b.label);
  });

  it("null / undefined 不會被當成第一個鍵", () => {
    expect(statusBadge(ORDER_STATUS, null).label).toBe("未知狀態");
    expect(statusBadge(ORDER_STATUS, undefined).label).toBe("未知狀態");
  });

  it("修好的兩個具體個案：stock_issue 與 failed 不再顯示成新訂單", () => {
    expect(statusBadge(ORDER_STATUS, "stock_issue").label).toBe("庫存不足");
    expect(statusBadge(ORDER_STATUS, "failed").label).toBe("付款失敗");
  });

  it("修好的具體個案：已完課的預約不再顯示成待付款", () => {
    expect(statusBadge(BOOKING_STATUS, "completed").label).toBe("已完成");
    expect(statusBadge(BOOKING_STATUS, "pending_payment").label).toBe("待付款");
  });
});
