import { randomBytes } from "node:crypto";

import { daysBetween, taipeiToday, type AvailabilityWindow } from "@/lib/experience-ordering";
import type { ExperienceRequestStatus } from "@/types";

/**
 * 客製開課請求的共用邏輯（openspec/changes/experience-open-class-request）。
 *
 * 全部是純函式：日期一律用 YYYY-MM-DD 字串比較、以台灣時間的當日為基準。
 * 前端顯示與後端驗證**必須用同一份計算**——各算各的遲早會出現「頁面說 1,600、
 * 結帳收 1,800」這種客訴。
 */

/** 最遠可申請到幾天後。太遠的申請對排程沒有意義，也讓後台清單失焦 */
export const MAX_LEAD_DAYS = 90;

export const CONTACT_PREFERENCE_WHITELIST = ["phone", "email", "line"] as const;
export type ContactPreference = (typeof CONTACT_PREFERENCE_WHITELIST)[number];

/** 計算用的體驗參數。刻意只要求用得到的欄位，方便測試不必造整個 ExperienceType */
export interface RequestableType {
  price:              number;
  maxParticipants:    number;
  requestMinSlots?:   number | null;
  requestLeadDays?:   number | null;
  requestStartTimes?: string[];
}

/** `request_min_slots` 沒設定時的預設，與 SQL 的語意一致（沒填＝比照最低成團人數 4） */
const DEFAULT_MIN_SLOTS = 4;
/** `request_lead_days` 的預設，與 SQL 的 DEFAULT 7 一致 */
const DEFAULT_LEAD_DAYS = 7;

/**
 * 這一場要收幾個名額。
 *
 * 客人付的是「開一場的最低名額」，換到的是該時段的這些位子——愛帶幾個人由他
 * 決定（design.md D3 的買斷名額制）。申請人數超過最低名額時就照實際人數算。
 */
export function calcRequestSlots(type: RequestableType, headcount: number): number {
  const min = type.requestMinSlots ?? DEFAULT_MIN_SLOTS;
  return Math.min(Math.max(min, headcount), type.maxParticipants);
}

/**
 * 應付金額 = 名額 × 單價。**與日期無關**——不做急件加價，也不做平日折扣。
 *
 * 曾經做過「距今 7–13 天 ×1.2」的急件加價，2026-08-24 拿掉。理由：
 *
 * 1. 加價想解決的事，審核機制已經在做。難排的日期業主直接婉拒或提替代
 *    方案；會答應的就代表不難。既保留拒絕權又多收兩成，客人付了加價還
 *    可能被婉拒，那是很難解釋的客訴
 * 2. 成本不隨前置天數變動——茶藝的老師一場 1,500，10 天後與 30 天後都一樣。
 *    加價不對應任何多出來的支出
 * 3. 這批客人是在排休閒行程，不是趕件。看到 +20% 多半是把日期往後挪
 *    （對他零成本、你沒多賺）或乾脆放棄，而不是照付
 * 4. 最低前置是 7 天、加價到 13 天——**你允許的最早申請日同時是最貴的**。
 *    照最低要求提前 7 天的人反而被罰
 *
 * 要調利潤請動 `request_min_slots`（門檻一目了然、沒有時間懸崖），不要再
 * 加時間維度的價格。真要重做，先看兩週數據決定天數與倍率，不要憑感覺定。
 */
export function calcRequestTotal(type: RequestableType, slots: number): number {
  return slots * type.price;
}

/** 今天是否落在這段可申請期間內（首日與末日都算） */
function withinWindow(w: AvailabilityWindow, date: string): boolean {
  return w.startDate <= date && date <= w.endDate;
}

/**
 * 最近一段還沒開始的可申請期間。
 *
 * 用途是「這段期間茶園沒有新芽可採，最近的可採期是 4/15」——被擋住的人知道
 * 什麼時候該回來，比單純不能選有價值得多。
 */
export function nextAvailableWindow(
  windows: AvailabilityWindow[] | undefined,
  today: string = taipeiToday(),
): AvailabilityWindow | null {
  return (windows ?? [])
    .filter(w => w.startDate > today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null;
}

export type RequestableReason =
  | "ok"
  | "too-soon"        // 未達最短前置天數
  | "too-far"         // 超過 90 天
  | "blackout"        // 公休日
  | "out-of-season";  // 有設定可申請期間，但這天不在任何一段內

export interface RequestableOptions {
  leadDays?:       number | null;
  blackoutDates?:  string[];
  windows?:        AvailabilityWindow[];
  today?:          string;
}

/**
 * 這個日期能不能申請。
 *
 * **有設定 window 即白名單制，沒設定則不限期間**（design.md D11）。這個方向
 * 是刻意的：漏填會讓該款安全地關掉申請，而不是安全地開著。
 */
export function isRequestableDate(
  date: string,
  opts: RequestableOptions = {},
): { ok: boolean; reason: RequestableReason } {
  const today    = opts.today ?? taipeiToday();
  const leadDays = opts.leadDays ?? DEFAULT_LEAD_DAYS;
  const lead     = daysBetween(today, date);

  if (lead < leadDays)     return { ok: false, reason: "too-soon" };
  if (lead > MAX_LEAD_DAYS) return { ok: false, reason: "too-far" };
  if ((opts.blackoutDates ?? []).includes(date)) return { ok: false, reason: "blackout" };

  const windows = opts.windows ?? [];
  if (windows.length > 0 && !windows.some(w => withinWindow(w, date))) {
    return { ok: false, reason: "out-of-season" };
  }
  return { ok: true, reason: "ok" };
}

/**
 * 該體驗可申請的時段。
 *
 * **取自該體驗自己的設定，不是全站常數**（design.md D12）——萬鷺朝鳳走黃昏
 * 鳥況，時段跟其他五款完全不同。
 */
export function allowedStartTimes(type: RequestableType): string[] {
  const times = type.requestStartTimes ?? [];
  return times.length > 0 ? times : ["10:00", "14:00"];
}

export function isAllowedStartTime(type: RequestableType, time: string): boolean {
  return allowedStartTimes(type).includes(time);
}

/** 自助查詢／撤回／選替代方案／預約共用的 token。32 bytes crypto random */
export function generateRequestToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * 人可讀的查詢編號，如 `R2608-7K3Q`。
 *
 * **刻意不是流水號**：流水號要一個計數器，而併發送出時會搶號、要重試。這裡
 * 用年月＋4 碼隨機，配上 DB 的 unique 約束就夠了——編號的用途是讓客人在電話
 * 裡念得出來，不是統計。字母表去掉 0/O/1/I，避免念錯。
 */
const NO_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateRequestNo(now: Date = new Date()): string {
  const ym = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei", year: "2-digit", month: "2-digit",
  }).format(now).replace("-", "");           // "26-08" → "2608"

  const bytes = randomBytes(4);
  const suffix = [...bytes].map(b => NO_ALPHABET[b % NO_ALPHABET.length]).join("");
  return `R${ym}-${suffix}`;
}

/**
 * 狀態機（design.md D5）。
 *
 * ```
 * pending ──approve──────────► approved ──客人付款──► converted
 *    │                            └──48h 未使用連結──► expired
 *    ├──offer-alternative──► alternative_offered ──客人選了──► approved
 *    │                            └──7 天未回應──► expired
 *    ├──decline───────────► declined
 *    └──客人撤回──────────► withdrawn
 * ```
 *
 * `converted`、`declined` 是終局，不能再轉出去。`approved` 可以回到 `pending`
 * ——那是業主撤銷核准（申請人還沒付款時）。
 */
const TRANSITIONS: Record<ExperienceRequestStatus, ExperienceRequestStatus[]> = {
  pending:             ["approved", "alternative_offered", "declined", "withdrawn"],
  alternative_offered: ["approved", "declined", "expired", "withdrawn"],
  approved:            ["converted", "expired", "pending"],
  converted:           [],
  declined:            [],
  expired:             [],
  withdrawn:           [],
};

export function canTransition(
  from: ExperienceRequestStatus,
  to: ExperienceRequestStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** 某狀態還能不能再變動。終局狀態在後台應該只能看，不能操作 */
export function isTerminal(status: ExperienceRequestStatus): boolean {
  return (TRANSITIONS[status] ?? []).length === 0;
}
