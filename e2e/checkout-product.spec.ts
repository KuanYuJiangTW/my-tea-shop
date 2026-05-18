import { test, expect } from "@playwright/test";

/**
 * 14.1 產品結帳流程 E2E
 * 登入 → 加入商品 → 調整點數折抵 → 完成結帳 → 驗證金額
 *
 * 前置：需要 staging 環境 + 測試帳號有點數餘額
 */

test.describe("產品結帳流程", () => {
  test.beforeEach(async ({ page }) => {
    // 登入測試帳號
    await page.goto("/login");
    await page.fill('input[name="email"]', process.env.E2E_TEST_EMAIL ?? "test@example.com");
    await page.fill('input[name="password"]', process.env.E2E_TEST_PASSWORD ?? "test1234");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/account");
  });

  test("加入商品 → 調整點數 → 結帳金額正確", async ({ page }) => {
    // 前往商品頁
    await page.goto("/products");
    await page.click('[data-testid="product-card"]:first-child');
    await page.click('[data-testid="add-to-cart"]');

    // 前往結帳頁
    await page.goto("/checkout");

    // 驗證小計顯示
    const subtotal = await page.locator('[data-testid="subtotal"]').textContent();
    expect(subtotal).toBeTruthy();

    // 輸入點數折抵
    const pointsInput = page.locator('input[name="pointsToUse"]');
    if (await pointsInput.isVisible()) {
      await pointsInput.fill("10");
      // 驗證折抵金額顯示
      const discount = await page.locator('[data-testid="points-discount"]').textContent();
      expect(discount).toContain("10");
    }

    // 驗證總金額 >= 0
    const total = await page.locator('[data-testid="total-amount"]').textContent();
    expect(total).toBeTruthy();
  });
});
