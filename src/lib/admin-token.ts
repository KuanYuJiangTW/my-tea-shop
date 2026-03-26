import { createHmac } from "crypto";

// 僅在 Node.js runtime 使用（API route）
export function computeAdminToken(password: string): string {
  return createHmac("sha256", password).update("wujue-admin-v1").digest("hex");
}
