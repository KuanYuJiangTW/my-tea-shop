/**
 * 客製開課請求的計價——**刻意單獨成檔，因為前台的 client component 也要用**。
 *
 * `experience-requests.ts` 匯入了 `node:crypto`（產編號與 token），整包搬進
 * 瀏覽器 bundle 並不合理；但計價又必須前後端同一份，否則會出現「頁面說
 * 1,350、信裡收 2,700」這種客訴。折衷是把純計價抽到這裡：沒有任何 node 依賴，
 * server / client 都能直接 import，`experience-requests.ts` 再 re-export
 * 維持既有呼叫端不變。
 */

/** 計算用的體驗參數。刻意只要求用得到的欄位，方便測試不必造整個 ExperienceType */
export interface RequestableType {
  price:              number;
  maxParticipants:    number;
  requestMinSlots?:   number | null;
  requestLeadDays?:   number | null;
  requestStartTimes?: string[];
}

/** `request_min_slots` 沒設定時的預設，與 SQL 的語意一致（沒填＝比照最低成團人數 4） */
export const DEFAULT_MIN_SLOTS = 4;

/**
 * 這一場要收幾個名額。
 *
 * 最低名額是**開一場的門檻**：1 個人申請也照最低名額收，他買的是位子不是
 * 比較貴的票（design.md D3）。但**超過門檻之後是照人頭往上加的**——
 * 名額數 = max(最低名額, 實際人數)，上限是場次人數上限。
 *
 * 這兩句要一起講。只講前半（「你買的是名額，不是每人票」）會被讀成
 * 「付最低金額可以帶無限多人」，那不是這個函式在做的事。
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
