/**
 * 點數相關的「顯示層」i18n 對照。
 *
 * 兩件事放在一起，因為病因相同：**資料庫存的是中文，但畫面要跟著語系走**。
 *
 * 1. `point_transactions.description`
 *    寫入當下就是中文字面值（`points.ts` 的預設值與各支 API），而且歷史資料早已落地。
 *    所以翻譯只能發生在顯示層：把已知字串對回 i18n key，**認不出來的原樣顯示**
 *    （不猜、不吞——猜錯等於竄改客人的點數明細）。
 *    金額型的字串（`折抵 NT$10`）把數字抽出來當參數，這樣 12 種來源只需要 12 個 key。
 *
 *    ⚠️ **新增點數寫入點時，要一併把新字串加進這裡的 EXACT／PATTERNS**，
 *    否則英文版會漏一條。`src/__tests__/points/points-i18n.test.ts` 會掃描原始碼裡
 *    所有寫入 `description` 的字面值，漏掉的會讓測試變紅。
 *
 * 2. `member_tiers.name`
 *    該表**沒有** `name_en` 欄位（見 `supabase/points_system.sql`），所以等級名稱一律
 *    不讀 DB 的 `name`，改由 tier id 對到 `common.memberTier.*`。DB 若新增了這裡不認識
 *    的等級，呼叫端要 fallback 回 `name`（顯示中文總比顯示 id 好）。
 */

/** 一次性 SQL 補資料留下的後綴（`supabase/audit-experience-booking-points.sql`），只存在於歷史資料 */
const SYSTEM_BACKFILL_SUFFIX = "（系統補發）";

/** 完全比對：description → `account.pointsLedger.<key>` */
const EXACT: Readonly<Record<string, string>> = {
  "消費回饋":                   "earn",
  "取消退還點數":               "cancelRefund",
  "訂單取消退還點數":           "orderCancelRefund",
  "體驗預約取消退還點數":       "bookingCancelRefund",
  "訂單完成回饋":               "orderCompleteEarn",
  "體驗完成回饋":               "bookingCompleteEarn",
  "場次取消退還點數":           "sessionCancelRefund",
  "逾期未付款取消退還點數":     "paymentExpiredRefund",
  "PayPal 建立失敗退還點數":    "paypalFailedRefund",
};

/**
 * 金額型：`NT$` 後面的數字抽成 `{amount}` 參數。
 * **順序有意義**——「訂單折抵」也包含「折抵」，長的必須先比對。
 * 這裡用 `^…$` 錨定，所以其實不會誤判，但順序留著當文件。
 */
const AMOUNT_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^訂單折抵 NT\$([\d,]+)$/,      "orderRedeem"],
  [/^體驗預約折抵 NT\$([\d,]+)$/,  "bookingRedeem"],
  [/^折抵 NT\$([\d,]+)$/,          "redeem"],
];

/** 管理員調整的備註是自由文字，翻不了；只翻前綴，備註原樣帶過去 */
const ADMIN_ADJUST = /^管理員調整：(.*)$/;

export type PointsLedgerLabel = {
  /** `account.pointsLedger.<key>` */
  key: string;
  values?: Record<string, string | number>;
  /** 追加在後面的 key（目前只有系統補發），同樣位於 `account.pointsLedger` 之下 */
  suffixKey?: string;
};

/**
 * 把帳本描述對到 i18n key。回傳 `null` 代表**認不出來**，呼叫端應原樣顯示原字串。
 */
export function translatePointsDescription(description: string | null | undefined): PointsLedgerLabel | null {
  if (!description) return null;

  let body = description.trim();
  let suffixKey: string | undefined;
  if (body.endsWith(SYSTEM_BACKFILL_SUFFIX)) {
    body = body.slice(0, -SYSTEM_BACKFILL_SUFFIX.length).trim();
    suffixKey = "systemBackfill";
  }

  const exact = EXACT[body];
  if (exact) return { key: exact, suffixKey };

  for (const [re, key] of AMOUNT_PATTERNS) {
    const m = re.exec(body);
    if (m) return { key, values: { amount: m[1] }, suffixKey };
  }

  const admin = ADMIN_ADJUST.exec(body);
  if (admin) return { key: "adminAdjust", values: { note: admin[1] }, suffixKey };

  return null;
}

/** `member_tiers` 有哪些等級是本檔認得、可翻譯的 */
const KNOWN_TIER_IDS = new Set(["standard", "silver", "gold"]);

/**
 * 等級 id 是否可對到 `common.memberTier.*`。
 * 回 false 時呼叫端請 fallback 回 DB 的 `name`（中文，但至少是人看得懂的字）。
 */
export function isKnownMemberTier(tierId: string | null | undefined): boolean {
  return !!tierId && KNOWN_TIER_IDS.has(tierId);
}
