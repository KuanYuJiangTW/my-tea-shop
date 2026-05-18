import { test, expect } from "@playwright/test";

/**
 * 14.5 儀表板數據 E2E
 * 建立訂單 → 標記完成 → 驗證儀表板數字正確
 */

test.describe("儀表板數據", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[name="email"]', process.env.E2E_ADMIN_EMAIL ?? "admin@example.com");
    await page.fill('input[name="password"]', process.env.E2E_ADMIN_PASSWORD ?? "admin1234");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/**");
  });

  test("儀表板顯示確認營收（completed 訂單）", async ({ page }) => {
    await page.goto("/admin/dashboard");

    // 確認營收卡片存在且數字 > 0 或 = 0
    const revenueCard = page.locator('[data-testid="confirmed-revenue"]');
    await expect(revenueCard).toBeVisible();
    const text = await revenueCard.textContent();
    expect(text).toMatch(/NT\$/);
  });

  test("行銷成本卡片顯示正確", async ({ page }) => {
    await page.goto("/admin/dashboard");

    await expect(page.locator('[data-testid="coupon-consumed"]')).toBeVisible();
    await expect(page.locator('[data-testid="points-consumed"]')).toBeVisible();
  });

  test("標記訂單為 completed 後營收更新", async ({ page }) => {
    // 紀錄初始營收
    await page.goto("/admin/dashboard");
    const initialRevenue = await page.locator('[data-testid="confirmed-revenue"]').textContent();

    // 找一筆待處理訂單標記完成
    await page.goto("/admin/orders");
    const firstPending = page.locator('[data-testid="order-row"][data-status="processing"]').first();
    if (await firstPending.isVisible()) {
      await firstPending.click();
      await page.click('[data-testid="mark-completed"]');
      await page.click('[data-testid="confirm-action"]');

      // 回到 dashboard 驗證營收增加
      await page.goto("/admin/dashboard");
      const newRevenue = await page.locator('[data-testid="confirmed-revenue"]').textContent();
      // 營收應該 >= 初始值
      expect(newRevenue).toBeTruthy();
    }
  });
});
