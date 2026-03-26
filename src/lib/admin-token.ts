import { createHmac } from "crypto";

/**
 * Admin session token = HMAC-SHA256(password, "wujue-admin-v1")
 * 不可逆：就算 cookie 被竊，無法反推密碼
 * 僅在 Node.js runtime 使用（API route）
 */
export function computeAdminToken(password: string): string {
  return createHmac("sha256", password).update("wujue-admin-v1").digest("hex");
}
