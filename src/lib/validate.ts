// 共用的輸入驗證小工具。
//
// 背景：orders 路由的驗證相當嚴謹，但後台的 coupons / campaigns 與使用者
// 評價的數值與文字欄位幾乎沒有範圍或長度檢查。缺的不只是「擋惡意輸入」——
// 沒有型別檢查時，送 `comment: 5` 會讓 `comment.trim()` 直接丟 TypeError 變成
// 500；沒有上限時，一筆折價券可以被設成一億元或存進數 MB 的字串。

/** 金額類欄位的上限（新台幣）。超過此值必為誤植或惡意輸入。 */
export const MAX_AMOUNT = 1_000_000;

/** 一般文字欄位長度上限（名稱、代碼等）。 */
export const MAX_NAME_LEN = 100;

/** 長文字欄位長度上限（評論、說明等）。 */
export const MAX_TEXT_LEN = 1_000;

export type Check = { ok: true } | { ok: false; error: string };

export const OK: Check = { ok: true };
const fail = (error: string): Check => ({ ok: false, error });

/** 非負整數金額，且不超過 MAX_AMOUNT。允許 undefined（代表未提供）。 */
export function checkAmount(v: unknown, label: string, opts: { required?: boolean; min?: number } = {}): Check {
  if (v === undefined || v === null) {
    return opts.required ? fail(`${label}為必填`) : OK;
  }
  if (typeof v !== "number" || !Number.isFinite(v)) return fail(`${label}必須是數字`);
  if (!Number.isInteger(v)) return fail(`${label}必須是整數`);
  const min = opts.min ?? 0;
  if (v < min) return fail(`${label}不可小於 ${min}`);
  if (v > MAX_AMOUNT) return fail(`${label}超出合理範圍`);
  return OK;
}

/** 整數且落在 [min, max]。允許 undefined。 */
export function checkIntRange(v: unknown, label: string, min: number, max: number, required = false): Check {
  if (v === undefined || v === null) return required ? fail(`${label}為必填`) : OK;
  if (typeof v !== "number" || !Number.isInteger(v)) return fail(`${label}必須是整數`);
  if (v < min || v > max) return fail(`${label}須在 ${min}~${max} 之間`);
  return OK;
}

/** 字串長度檢查（會先 trim）。允許 undefined。 */
export function checkText(
  v: unknown,
  label: string,
  { max = MAX_NAME_LEN, required = false, min = 1 }: { max?: number; required?: boolean; min?: number } = {},
): Check {
  if (v === undefined || v === null) return required ? fail(`${label}為必填`) : OK;
  if (typeof v !== "string") return fail(`${label}格式不正確`);
  const t = v.trim();
  if (required && t.length < min) return fail(`${label}為必填`);
  if (t.length > max) return fail(`${label}長度不可超過 ${max} 字`);
  return OK;
}

/** 可被解析的日期字串。允許 undefined。 */
export function checkDate(v: unknown, label: string, required = false): Check {
  if (v === undefined || v === null || v === "") return required ? fail(`${label}為必填`) : OK;
  if (typeof v !== "string" && typeof v !== "number") return fail(`${label}格式不正確`);
  if (Number.isNaN(new Date(v).getTime())) return fail(`${label}格式不正確`);
  return OK;
}

/** 陣列長度上限。允許 undefined。 */
export function checkArray(v: unknown, label: string, max: number, required = false): Check {
  if (v === undefined || v === null) return required ? fail(`${label}為必填`) : OK;
  if (!Array.isArray(v)) return fail(`${label}格式不正確`);
  if (required && v.length === 0) return fail(`${label}不可為空`);
  if (v.length > max) return fail(`${label}數量不可超過 ${max}`);
  return OK;
}

/** 依序執行多個檢查，回傳第一個失敗者；全通過回傳 null。 */
export function firstError(...checks: Check[]): string | null {
  for (const c of checks) if (!c.ok) return c.error;
  return null;
}
