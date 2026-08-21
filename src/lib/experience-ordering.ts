/**
 * 體驗與商品的排序，以及體驗的季節判定。
 *
 * 這裡刻意全部是純函式、不碰資料庫——季節判定要用台灣時間，寫在 SQL view
 * 裡只能靠實際連線驗證，寫在這裡才測得到「台灣時間已經是首日、UTC 還在前
 * 一天」這種邊界。決策理由見
 * openspec/changes/experience-seasonal-ordering/design.md D3。
 *
 * **排序只有這一個入口**：`getExperienceTypes()` 呼叫 `sortExperiences()`，
 * 首頁、列表頁、後台一律走 `getExperienceTypes()`。任何直接查
 * `experience_types` 再自己排的地方都是缺陷。
 */

/** 季節區間。日期一律是 YYYY-MM-DD 字串，不用 Date——避免時區把日期挪掉一天 */
export interface AvailabilityWindow {
  startDate: string;
  endDate:   string;   // 含當天
  note?:     string;
}

/** 排序需要的最小形狀。實際型別（ExperienceType）欄位更多，這裡只要求用得到的 */
export interface Sortable {
  id:           number;
  sortOrder?:   number | null;
  pinnedUntil?: string | null;   // YYYY-MM-DD，含當天
  windows?:     AvailabilityWindow[];
}

/** `sort_order` 沒填（或欄位還沒建好）時的預設值，與 SQL 的 DEFAULT 一致 */
const DEFAULT_SORT_ORDER = 100;

/**
 * 台灣時間的今天（YYYY-MM-DD）。
 *
 * Supabase 預設 UTC，而台灣是 UTC+8——直接用 `new Date().toISOString()` 會讓
 * 台灣時間每天的 00:00–08:00 被算成前一天，季節首日與末日各會差一天。
 * `en-CA` 的 locale 格式剛好就是 YYYY-MM-DD，不必自己補零。
 */
export function taipeiToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

/**
 * 兩個 YYYY-MM-DD 之間差幾天（b − a）。
 *
 * 用 `Date.UTC` 而非 `new Date(str)`：兩邊都當成 UTC 午夜就只是在比日曆日，
 * 不會被本機時區或日光節約時間影響。
 */
export function daysBetween(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** 今天是否落在這段區間內（首日與末日都算） */
function withinWindow(w: AvailabilityWindow, today: string): boolean {
  return w.startDate <= today && today <= w.endDate;
}

/**
 * 今天所在的季節區間；不在任何區間內回 null。
 *
 * **沒有設定任何區間 ＝ 不受季節限制**，回 null 但不代表「季節外」——
 * 兩者的差別由 `hasSeason()` 分辨，卡片的呈現完全不同（一個什麼都不顯示，
 * 一個要顯示「本季已結束」）。
 */
export function currentWindow(
  windows: AvailabilityWindow[] | undefined,
  today: string,
): AvailabilityWindow | null {
  return windows?.find(w => withinWindow(w, today)) ?? null;
}

/** 該體驗有沒有季節設定 */
export function hasSeason(windows: AvailabilityWindow[] | undefined): boolean {
  return (windows?.length ?? 0) > 0;
}

/** 是否正在季節中。沒設定季節的體驗一律回 false（它不是「季節中」，是「不分季節」） */
export function isInSeason(
  windows: AvailabilityWindow[] | undefined,
  today: string,
): boolean {
  return currentWindow(windows, today) !== null;
}

/** 下一段還沒開始的區間（供「明年 8 月見」用）；沒有則回 null */
export function nextWindow(
  windows: AvailabilityWindow[] | undefined,
  today: string,
): AvailabilityWindow | null {
  const upcoming = (windows ?? [])
    .filter(w => w.startDate > today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return upcoming[0] ?? null;
}

/**
 * 這一季還剩幾天（末日當天 ＝ 0，不會是負數）。不在季節中回 null。
 *
 * 徽章寫「剩 0 天」讀起來很怪，所以 UI 在 0 的時候要改顯示「最後一天」——
 * 那是文案的事，這裡只保證數字不會變成負的。
 */
export function daysLeftInSeason(
  windows: AvailabilityWindow[] | undefined,
  today: string,
): number | null {
  const w = currentWindow(windows, today);
  if (!w) return null;
  return Math.max(0, daysBetween(today, w.endDate));
}

/** 是否在釘選期間內（到期日當天仍算釘選） */
export function isPinned(pinnedUntil: string | null | undefined, today: string): boolean {
  return !!pinnedUntil && pinnedUntil >= today;
}

/**
 * 排序：釘選中 → 季節中 → sort_order → id。
 *
 * 為什麼釘選壓過季節：釘選是業主針對當下狀況（媒體報導、鳥況特別好、連假）
 * 的明確意圖，該壓過通則。為什麼 id 墊底：其他鍵都相同時要有穩定的最終
 * 順序，否則同一份資料在不同查詢間的順序會跳動。
 *
 * 不改動傳入的陣列。
 */
export function sortExperiences<T extends Sortable>(list: T[], today: string): T[] {
  return [...list].sort((a, b) => {
    const pin = Number(isPinned(b.pinnedUntil, today)) - Number(isPinned(a.pinnedUntil, today));
    if (pin !== 0) return pin;

    const season = Number(isInSeason(b.windows, today)) - Number(isInSeason(a.windows, today));
    if (season !== 0) return season;

    const order = (a.sortOrder ?? DEFAULT_SORT_ORDER) - (b.sortOrder ?? DEFAULT_SORT_ORDER);
    if (order !== 0) return order;

    return a.id - b.id;
  });
}

/** 卡片要呈現哪一種狀態。UI 只認這四種，不要在元件裡再判斷日期 */
export type SeasonState =
  | { kind: "none" }                                              // 不分季節，維持現狀
  | { kind: "in-season";  endsOn: string; daysLeft: number }      // 季節中，顯示倒數
  | { kind: "upcoming";   startsOn: string }                      // 還沒開始
  | { kind: "ended" };                                            // 今年結束了，明年見

export function seasonState(
  windows: AvailabilityWindow[] | undefined,
  today: string,
): SeasonState {
  if (!hasSeason(windows)) return { kind: "none" };

  const current = currentWindow(windows, today);
  if (current) {
    return { kind: "in-season", endsOn: current.endDate, daysLeft: daysLeftInSeason(windows, today)! };
  }

  const next = nextWindow(windows, today);
  return next ? { kind: "upcoming", startsOn: next.startDate } : { kind: "ended" };
}
