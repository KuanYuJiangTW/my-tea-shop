import { randomBytes } from "crypto";
import { supabase } from "@/lib/supabase";

// 後台 session token 管理（僅 Node.js runtime 使用，需 service_role）
// 取代舊的固定 HMAC token：改為隨機 token 存進 admin_sessions，可撤銷、會過期。

const SESSION_TTL_MS = 60 * 60 * 24 * 7 * 1000; // 7 天

/** 產生不可由密碼推算的隨機 session token。 */
export function generateAdminSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/** 將新 session 寫入 admin_sessions（7 天後過期）。 */
export async function createAdminSession(token: string, ip: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const { error } = await supabase
    .from("admin_sessions")
    .insert({ token, expires_at: expiresAt, ip });
  if (error) {
    console.error("[admin-session] 建立失敗:", error.message);
    throw new Error("無法建立後台 session");
  }
}

/** 從 admin_sessions 刪除指定 token（登出 / 撤銷）。 */
export async function deleteAdminSession(token: string): Promise<void> {
  const { error } = await supabase.from("admin_sessions").delete().eq("token", token);
  if (error) console.error("[admin-session] 刪除失敗:", error.message);
}

/**
 * 驗證 token 是否對應未過期的 session（Node.js 端：guard、server component 使用）。
 * Admin 為高風險路徑，DB 失敗時 fail-closed（回 false）。
 */
export async function validateAdminSession(token: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("admin_sessions")
      .select("expires_at")
      .eq("token", token)
      .maybeSingle();
    if (error || !data) return false;
    return new Date(data.expires_at).getTime() > Date.now();
  } catch (e) {
    console.error("[admin-session] 驗證例外，fail-closed:", e);
    return false;
  }
}
