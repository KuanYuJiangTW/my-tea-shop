import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// 持久化限流（Supabase rate_limits 表）
// 取代記憶體內限流：Vercel serverless 多 instance 下，記憶體限流形同虛設。
// 設計原則：DB 故障時 fail-open（允許通過），避免限流機制壞掉就把所有正常客人擋住。
// ─────────────────────────────────────────────────────────────────────────────

export function getClientIp(req: NextRequest): string {
  // x-real-ip 由 Vercel edge 寫入，客端無法偽造，優先使用
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  // 本地開發備援（生產環境上 x-forwarded-for 仍可被客端偽造）
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

/**
 * 每次請求型限流：原子性遞增並判斷。
 * @returns true = 允許，false = 已超過上限（應回 429）
 */
export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_ms: windowMs,
    });
    if (error) {
      console.error("[rate-limit] check_rate_limit 失敗，fail-open:", error.message);
      return true;
    }
    return data === true;
  } catch (e) {
    console.error("[rate-limit] check_rate_limit 例外，fail-open:", e);
    return true;
  }
}

/**
 * 唯讀檢查目前是否已達上限（不遞增），用於「只計失敗次數」的場景（如後台登入）。
 * @returns true = 已達/超過上限
 */
export async function rateLimitPeek(key: string, max: number): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("rate_limits")
      .select("count, reset_at")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return false;
    if (new Date(data.reset_at).getTime() <= Date.now()) return false; // 視窗已過
    return data.count >= max;
  } catch {
    return false; // fail-open：查詢失敗不擋人
  }
}

/** 只遞增計數（不判斷上限），用於記錄一次失敗。 */
export async function rateLimitBump(key: string, windowMs: number): Promise<void> {
  try {
    const { error } = await supabase.rpc("bump_rate_limit", {
      p_key: key,
      p_window_ms: windowMs,
    });
    if (error) console.error("[rate-limit] bump_rate_limit 失敗:", error.message);
  } catch (e) {
    console.error("[rate-limit] bump_rate_limit 例外:", e);
  }
}

/** 清除計數（如登入成功後重置失敗次數）。 */
export async function rateLimitReset(key: string): Promise<void> {
  const { error } = await supabase.from("rate_limits").delete().eq("key", key);
  if (error) console.error("[rate-limit] reset 失敗:", error.message);
}
