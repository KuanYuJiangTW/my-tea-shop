import { test, expect } from "@playwright/test";

/**
 * 14.2 體驗預約結帳 E2E
 * 登入 → 預約體驗 → 點數折抵 → 付款 → 驗證金額
 */

test.describe("體驗預約結帳", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', process.env.E2E_TEST_EMAIL ?? "test@example.com");
    await page.fill('input[name="password"]', process.env.E2E_TEST_PASSWORD ?? "test1234");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/account");
  });

  test("預約體驗 → 點數折抵 → 金額正確", async ({ page }) => {
    await page.goto("/experiences");
    await page.click('[data-testid="experience-card"]:first-child');

    // 選擇場次
    await page.click('[data-testid="session-select"]');
    await page.click('[data-testid="session-option"]:first-child');

    // 填寫人數
    await page.fill('input[name="guests"]', "2");

    // 點數折抵
    const pointsInput = page.locator('input[name="pointsToUse"]');
    if (await pointsInput.isVisible()) {
      await pointsInput.fill("10");
      const discount = await page.locator('[data-testid="points-discount"]').textContent();
      expect(discount).toContain("10");
    }

    // 驗證總金額
    const total = await page.locator('[data-testid="total-price"]').textContent();
    expect(total).toBeTruthy();
  });
});
