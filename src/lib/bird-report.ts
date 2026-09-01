import { supabase } from "@/lib/supabase";
import type { BirdReport } from "@/lib/bird-report-core";

/**
 * 今日鳥況回報——資料存取。
 *
 * 「該不該顯示」的判斷在 `bird-report-core.ts`，那邊是純函式、直接測得到。
 * 這裡只負責讀寫。
 */

export type { BirdReport } from "@/lib/bird-report-core";

/** Postgres：資料表不存在／欄位不存在。業主還沒跑 SQL 的那段期間會遇到 */
const UNDEFINED_TABLE  = "42P01";
const UNDEFINED_COLUMN = "42703";

export function isNotMigrated(code?: string): boolean {
  return code === UNDEFINED_TABLE || code === UNDEFINED_COLUMN;
}

/** 讀最新一則的結果。`notMigrated` 讓後台能明說要跑哪支 SQL，對外頁面則一律當成沒有回報 */
export interface LatestBirdReport {
  report:      BirdReport | null;
  notMigrated: boolean;
}

export async function getLatestBirdReport(): Promise<LatestBirdReport> {
  const { data, error } = await supabase
    .from("bird_reports")
    .select("note, reported_at")
    .order("reported_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isNotMigrated(error.code)) return { report: null, notMigrated: true };
    // 其他錯誤（連線、權限）不該讓整頁掛掉——鳥況是加分項，不是必要內容
    console.warn("[bird-report] 讀取失敗:", error.message);
    return { report: null, notMigrated: false };
  }
  if (!data) return { report: null, notMigrated: false };

  return {
    report:      { note: data.note as string, reportedAt: data.reported_at as string },
    notMigrated: false,
  };
}

/**
 * 送出一則新回報。**INSERT 不 UPDATE**——保留歷史，而且「送錯了」只要補送
 * 一則就蓋過去，不需要編輯或刪除功能（刪除在對外事實上是更危險的操作）。
 *
 * `reported_at` 交給 DB 的 default now() 填，不接受呼叫端傳入：過期完全依賴
 * 這個時間戳，能被傳入就等於能被繞過。
 */
export async function insertBirdReport(
  note: string,
  createdBy?: string,
): Promise<{ ok: true } | { ok: false; notMigrated: boolean; message: string }> {
  const { error } = await supabase
    .from("bird_reports")
    .insert({ note: note.trim(), created_by: createdBy ?? null });

  if (error) {
    return { ok: false, notMigrated: isNotMigrated(error.code), message: error.message };
  }
  return { ok: true };
}
