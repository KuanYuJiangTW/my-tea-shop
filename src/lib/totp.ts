import { verify } from "otplib";

// 後台 TOTP 驗證的共用設定。
//
// otplib v13 的 epochTolerance 預設為 0 —— 只接受「當下這個 30 秒窗口」產生的碼，
// 完全不容許時鐘誤差。實務上這會造成：使用者手機與伺服器時間差幾秒、或在窗口
// 交界處按下送出，驗證就失敗；手機若未自動校時而偏移超過 30 秒，則是每次都失敗。
//
// RFC 6238 §5.2 建議驗證端至少接受一個時間步的偏移。這裡採前後各 30 秒
// （＝前後各一個時間步），與 Google Authenticator 等主流實作一致。
//
// 安全性代價：可接受的碼從 1 組變成 3 組，暴力破解空間由 10^6 降為約 3.3×10^5。
// 已由 /api/admin/auth/2fa 的持久化限流（15 分鐘 5 次）覆蓋，實際不可行。
const EPOCH_TOLERANCE: [number, number] = [30, 30];

/**
 * 驗證 6 位 TOTP 碼。
 *
 * 注意：otplib v13 的 verify() 回傳 `{ valid: boolean }` 物件而非 boolean，
 * 直接判斷回傳值會因物件恆為 truthy 而讓任何碼都通過。本函式收斂成回傳
 * boolean，避免呼叫端再踩一次同樣的坑。
 */
export async function verifyTotp(token: string, secret: string): Promise<boolean> {
  const { valid } = await verify({
    token,
    secret,
    epochTolerance: EPOCH_TOLERANCE,
  });
  return valid;
}
