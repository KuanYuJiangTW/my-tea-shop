import { describe, it, expect } from "vitest";
import { toggleConfirmText } from "@/app/admin/(protected)/experiences/ordering/OrderingClient";

/**
 * 上下架確認視窗的文字（openspec experience-visibility-toggle D7）。
 *
 * 釘住兩件容易被「簡化」掉的事：
 *   - 下架時一定要說出未來場次與有效預約的數字，以及「不會被取消」——
 *     業主會以為下架＝整款停辦，其實客人仍會來
 *   - 影響範圍查不到（null）時要明說查不到，不能顯示成 0，那會讓人以為沒有影響
 */
const base = { name: "採茶", upcomingOpenSessions: 2, activeBookings: 3 };

describe("toggleConfirmText", () => {
  it("下架：列出場次數與預約數，並說明預約不會被取消", () => {
    const text = toggleConfirmText({ ...base, isActive: true });
    expect(text).toContain("下架「採茶」");
    expect(text).toContain("2 個未來的開放場次");
    expect(text).toContain("3 筆有效預約");
    expect(text).toContain("不會被取消");
  });

  it("下架但影響範圍查不到：說無法取得，不顯示成 0", () => {
    const text = toggleConfirmText({ ...base, isActive: true, upcomingOpenSessions: null });
    expect(text).toContain("無法取得");
    expect(text).not.toMatch(/\b0 個/);
  });

  it("上架：提醒客人會立刻看到並可預約", () => {
    const text = toggleConfirmText({ ...base, isActive: false });
    expect(text).toContain("上架「採茶」");
    expect(text).toContain("立刻");
    expect(text).toContain("可以預約");
  });
});
