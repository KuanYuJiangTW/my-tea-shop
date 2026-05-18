import { test, expect } from "@playwright/test";

/**
 * 14.3 後台活動管理 E2E
 * 登入後台 → 新增活動 → 編輯 → 停用
 */

test.describe("後台活動管理", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[name="email"]', process.env.E2E_ADMIN_EMAIL ?? "admin@example.com");
    await page.fill('input[name="password"]', process.env.E2E_ADMIN_PASSWORD ?? "admin1234");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/**");
  });

  test("新增活動 → 出現在列表", async ({ page }) => {
    await page.goto("/admin/campaigns");
    await page.click('[data-testid="create-campaign-btn"]');

    await page.fill('input[name="name"]', "E2E 測試活動");
    await page.fill('input[name="multiplier"]', "2");
    await page.click('button[type="submit"]');

    // 驗證新活動出現在列表
    await expect(page.locator("text=E2E 測試活動")).toBeVisible();
  });

  test("編輯活動倍率", async ({ page }) => {
    await page.goto("/admin/campaigns");
    await page.click('[data-testid="edit-campaign"]:first-child');
    await page.fill('input[name="multiplier"]', "3");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=3x")).toBeVisible();
  });

  test("停用活動", async ({ page }) => {
    await page.goto("/admin/campaigns");
    await page.click('[data-testid="deactivate-campaign"]:first-child');
    await page.click('[data-testid="confirm-deactivate"]');
    await expect(page.locator('[data-testid="status-badge"]').first()).toContainText("已停用");
  });
});
