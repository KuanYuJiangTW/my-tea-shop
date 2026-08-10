// ─── 新會員歡迎券參數（前後端共用）───────────────────────────────────────
//
// 這組值原本只寫死在 `src/app/auth/callback/route.ts` 裡。抽出來的理由是
// **公告條與註冊頁要對外宣傳這張券**——文案講 NT$50、實際發 NT$30 是會被
// 客訴的那種不同步。改金額只改這裡，發券與所有文案會一起跟著動。

/** 註冊時自動發放的歡迎券 */
export const WELCOME_COUPON = {
  /** 折抵金額（NT$） */
  discountAmount: 50,
  /** 最低消費門檻（NT$） */
  minOrderAmount: 350,
  /** 有效天數 */
  expiryDays: 30,
} as const;
