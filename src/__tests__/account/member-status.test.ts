import { describe, it, expect } from "vitest";
import { getMemberStatusCls } from "@/app/account/AccountClient";

/**
 * 會員中心的訂單狀態顯示。
 *
 * 這支測試釘住的核心規則：**在不確定的情況下，不可以告訴客人「你還欠錢」**。
 * 修正前 `stock_issue`（已付款但庫存不足）會 fallback 成「待付款」，
 * 客人可能以為付款沒成功而再付一次。
 */

const key = (o: string, p = "pending") => getMemberStatusCls(o, p).labelKey;

describe("會員端訂單狀態顯示", () => {
  it("新訂單依付款狀態分流", () => {
    expect(key("new", "paid")).toBe("orderStatus.paid2");
    expect(key("new", "pending")).toBe("orderStatus.pending2");
  });

  it("一般流程狀態各自對應", () => {
    expect(key("preparing")).toBe("orderStatus.preparing");
    expect(key("shipped")).toBe("orderStatus.shipped");
    expect(key("completed")).toBe("orderStatus.completed");
    expect(key("cancelled")).toBe("orderStatus.cancelled");
  });

  it("stock_issue 顯示「處理中」而不是「待付款」——客人已經付過錢了", () => {
    expect(key("stock_issue")).toBe("orderStatus.processing");
    expect(key("stock_issue")).not.toBe("orderStatus.pending2");
  });

  it("failed 顯示「待付款」——確實還沒收到錢（小江 2026-08-06 拍板）", () => {
    expect(key("failed")).toBe("orderStatus.pending2");
  });

  it("未知狀態顯示「處理中」，絕不顯示「待付款」", () => {
    for (const unknown of ["some_future_status", "refunding", ""]) {
      expect(key(unknown)).toBe("orderStatus.processing");
      expect(key(unknown)).not.toBe("orderStatus.pending2");
    }
  });

  it("每個狀態都有底色與文字色成對的 class", () => {
    for (const s of ["new", "preparing", "shipped", "completed", "cancelled", "stock_issue", "failed", "unknown"]) {
      const { cls } = getMemberStatusCls(s, "pending");
      expect(cls, `${s} 缺少底色`).toMatch(/\bbg-/);
      expect(cls, `${s} 缺少文字色`).toMatch(/\btext-/);
    }
  });
});
