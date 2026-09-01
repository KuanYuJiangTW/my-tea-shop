import { isInSeason, taipeiToday, type AvailabilityWindow } from "@/lib/experience-ordering";

/**
 * 今日鳥況回報——判斷「該不該顯示」的純邏輯。
 *
 * 與 `bird-report.ts`（讀資料庫）分開，是因為這裡決定的是**對外的事實宣稱**：
 * 顯示一則過期的「鳥況良好」，客人白跑一趟會算在店家頭上。這種邏輯要能被
 * 直接測到，不該因為 import 了 Supabase client 而在單元測試裡爆掉
 * （本 repo 已有 `bundle-core`／`product-review-core` 同樣的切法）。
 */

/** 過期門檻。48 小時的推導見 openspec/changes/bird-report/design.md 決策 3 */
export const FRESH_WINDOW_HOURS = 48;

export interface BirdReport {
  note:       string;
  reportedAt: string;   // ISO 8601
}

/**
 * 這則回報還新鮮嗎。
 *
 * 用絕對時間戳相減而不是比對日曆日：伺服器跑 UTC、業主在台北，
 * 用「今天／昨天」判斷會在跨日的時候差一天——而那正好是傍晚回報的時段。
 */
export function isFresh(reportedAt: string, now: Date = new Date()): boolean {
  const t = new Date(reportedAt).getTime();
  if (Number.isNaN(t)) return false;
  const ageMs = now.getTime() - t;
  // 未來時間視為不新鮮：那是資料有問題，不該拿來對客人宣稱
  if (ageMs < 0) return false;
  return ageMs <= FRESH_WINDOW_HOURS * 60 * 60 * 1000;
}

/**
 * 這則回報現在該不該顯示。三個條件全部成立才回傳它，否則回 `null`。
 *
 * 1. 有內容——空白的回報等於沒有回報
 * 2. 未過期——業主沒更新時它自己消失，不需要業主記得撤下
 * 3. 在季節內——季節外的鳥況沒有意義，且不必業主手動關
 *
 * 季節用 `experience_availability_windows`（透過 `isInSeason`），不自己算日期：
 * 體驗頁的季節徽章、排序、Event 結構化資料都吃同一份區間，鳥況再存一份
 * 就是兩份會不同步的日期——而不同步的那天正好是季節交界，最多人在看的時候。
 */
export function visibleBirdReport(
  report:  BirdReport | null,
  windows: AvailabilityWindow[] | undefined,
  now:     Date = new Date(),
): BirdReport | null {
  if (!report) return null;
  if (!report.note?.trim()) return null;
  if (!report.reportedAt) return null;
  if (!isFresh(report.reportedAt, now)) return null;
  if (!isInSeason(windows, taipeiToday(now))) return null;
  return report;
}
