import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
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
 * 取得目前操作者的稽核識別，供寫入 admin_id 之類的欄位使用。
 *
 * 為什麼不從 request body 取：body 是客端可任意填寫的內容，拿它當「誰做的」
 * 等於讓稽核紀錄可被偽造。（原本前端傳的還是寫死的 "admin"，本來就沒有資訊量。）
 *
 * 目前後台是單一共用密碼，session 未綁定特定自然人，因此這裡能提供的最強識別
 * 是「哪一次登入 session 做的」——回傳 session token 的 SHA-256 前 12 碼。
 * 它不可由客端偽造，且可與 admin_sessions 表（含 created_at、ip）對照追出來源。
 *
 * 日後若改為多管理員帳號，這裡改回傳該管理員的帳號 id 即可，呼叫端不用動。
 */
export async function getAdminActor(): Promise<string> {
  const token = (await cookies()).get("admin_session")?.value;
  if (!token) return "unknown";
  return `session:${createHash("sha256").update(token).digest("hex").slice(0, 12)}`;
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
