import { describe, it, expect } from "vitest";
import {
  checkAmount, checkIntRange, checkText, checkDate, checkArray, firstError,
  MAX_AMOUNT, MAX_NAME_LEN,
} from "@/lib/validate";

describe("checkAmount", () => {
  it("接受合法金額", () => {
    expect(checkAmount(0, "金額").ok).toBe(true);
    expect(checkAmount(1500, "金額").ok).toBe(true);
    expect(checkAmount(MAX_AMOUNT, "金額").ok).toBe(true);
  });

  it("拒絕超出上限（防誤植成天價折扣）", () => {
    expect(checkAmount(MAX_AMOUNT + 1, "折扣金額").ok).toBe(false);
    expect(checkAmount(99_999_999, "折扣金額").ok).toBe(false);
  });

  it("拒絕負數、小數與非數字", () => {
    expect(checkAmount(-1, "金額").ok).toBe(false);
    expect(checkAmount(10.5, "金額").ok).toBe(false);
    expect(checkAmount("100", "金額").ok).toBe(false);
    expect(checkAmount(NaN, "金額").ok).toBe(false);
    expect(checkAmount(Infinity, "金額").ok).toBe(false);
  });

  it("未提供時預設放行，標為 required 才擋", () => {
    expect(checkAmount(undefined, "金額").ok).toBe(true);
    expect(checkAmount(undefined, "金額", { required: true }).ok).toBe(false);
  });

  it("可指定下限（折扣金額須 >= 1）", () => {
    expect(checkAmount(0, "折扣金額", { min: 1 }).ok).toBe(false);
    expect(checkAmount(1, "折扣金額", { min: 1 }).ok).toBe(true);
  });
});

describe("checkIntRange", () => {
  it("評分只接受 1~5 的整數", () => {
    expect(checkIntRange(3, "評分", 1, 5, true).ok).toBe(true);
    expect(checkIntRange(3.7, "評分", 1, 5, true).ok).toBe(false); // 原本會通過
    expect(checkIntRange(0, "評分", 1, 5, true).ok).toBe(false);
    expect(checkIntRange(6, "評分", 1, 5, true).ok).toBe(false);
  });
});

describe("checkText", () => {
  it("拒絕非字串（原本會讓 .trim() 丟 TypeError 變成 500）", () => {
    expect(checkText(5, "評論").ok).toBe(false);
    expect(checkText({}, "評論").ok).toBe(false);
    expect(checkText([], "評論").ok).toBe(false);
  });

  it("長度上限", () => {
    expect(checkText("a".repeat(MAX_NAME_LEN), "名稱").ok).toBe(true);
    expect(checkText("a".repeat(MAX_NAME_LEN + 1), "名稱").ok).toBe(false);
  });

  it("required 時空白字串不算填寫", () => {
    expect(checkText("   ", "名稱", { required: true }).ok).toBe(false);
    expect(checkText("", "名稱", { required: true }).ok).toBe(false);
    expect(checkText(undefined, "名稱", { required: true }).ok).toBe(false);
  });
});

describe("checkDate", () => {
  it("接受可解析的日期", () => {
    expect(checkDate("2026-12-31", "到期日").ok).toBe(true);
    expect(checkDate("2026-12-31T10:00:00Z", "到期日").ok).toBe(true);
  });

  it("拒絕無法解析的字串", () => {
    expect(checkDate("不是日期", "到期日").ok).toBe(false);
    expect(checkDate("2026-13-45", "到期日").ok).toBe(false);
  });

  it("required 時空值要擋", () => {
    expect(checkDate(undefined, "到期日", true).ok).toBe(false);
    expect(checkDate("", "到期日", true).ok).toBe(false);
  });
});

describe("checkArray", () => {
  it("限制批次大小（防一次發放過多拖垮請求）", () => {
    expect(checkArray(new Array(5_000).fill("u"), "發放對象", 5_000, true).ok).toBe(true);
    expect(checkArray(new Array(5_001).fill("u"), "發放對象", 5_000, true).ok).toBe(false);
  });

  it("required 時空陣列要擋", () => {
    expect(checkArray([], "發放對象", 100, true).ok).toBe(false);
    expect(checkArray("not-array", "發放對象", 100, true).ok).toBe(false);
  });
});

describe("firstError", () => {
  it("回傳第一個失敗的訊息，全過回 null", () => {
    expect(firstError(checkAmount(1, "A"), checkAmount(-1, "B"), checkAmount(-1, "C"))).toContain("B");
    expect(firstError(checkAmount(1, "A"), checkText("x", "B"))).toBeNull();
  });
});
