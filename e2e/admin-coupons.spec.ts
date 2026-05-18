import { test, expect } from "@playwright/test";

/**
 * 14.4 後台折價券管理 E2E
 * 新增通用碼 → 前台兌換 → 確認使用率更新
 */

test.describe("後台折價券管理", () => {
  const couponCode = `E2E-${Date.now()}`;

  test("新增通用碼", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[name="email"]', process.env.E2E_ADMIN_EMAIL ?? "admin@example.com");
    await page.fill('input[name="password"]', process.env.E2E_ADMIN_PASSWORD ?? "admin1234");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/**");

    await page.goto("/admin/coupons");
    await page.click('[data-testid="create-coupon-btn"]');

    await page.fill('input[name="code"]', couponCode);
    await page.fill('input[name="discount_amount"]', "50");
    await page.fill('input[name="min_order_amount"]', "300");
    await page.fill('input[name="max_uses"]', "10");
    await page.click('button[type="submit"]');

    await expect(page.locator(`text=${couponCode}`)).toBeVisible();
  });

  test("前台兌換通用碼", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', process.env.E2E_TEST_EMAIL ?? "test@example.com");
    await page.fill('input[name="password"]', process.env.E2E_TEST_PASSWORD ?? "test1234");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/account");

    // 加入商品後前往結帳
    await page.goto("/products");
    await page.click('[data-testid="product-card"]:first-child');
    await page.click('[data-testid="add-to-cart"]');
    await page.goto("/checkout");

    // 輸入通用碼
    await page.fill('input[name="couponCode"]', couponCode);
    await page.click('[data-testid="apply-coupon"]');
    await expect(page.locator('[data-testid="coupon-discount"]')).toContainText("50");
  });
});
