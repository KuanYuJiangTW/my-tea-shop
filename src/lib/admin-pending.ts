// 後台 2FA「密碼已通過、待輸入 TOTP」的臨時憑證。
//
// 舊版是內容固定為 "1" 的 cookie：httpOnly / sameSite 只擋瀏覽器內的 JS 與跨站送出，
// 擋不住攻擊者自己帶 `Cookie: admin_pending=1` 直接打 API，等於任何人都能跳過密碼
// 這關進到 2FA 驗證。改為 HMAC 簽章的一次性 token，沒有 ADMIN_PASSWORD 就簽不出來。
//
// 用 Web Crypto 而非 node:crypto，因為 src/proxy.ts 跑在 Edge runtime 也要驗這個 token。

const PENDING_TTL_MS = 10 * 60_000; // 10 分鐘內要完成 2FA

function getSigningKeyMaterial(): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("ADMIN_PASSWORD 未設定，無法簽發 2FA pending token");
  return secret;
}

async function hmac(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSigningKeyMaterial()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 定時比對，避免用回應時間逐字元猜簽章。 */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 簽發 pending token，格式 `<expiresAt>.<nonce>.<hmac>`。 */
export async function issuePendingToken(): Promise<string> {
  const exp = Date.now() + PENDING_TTL_MS;
  const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = Array.from(nonceBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const payload = `${exp}.${nonce}`;
  return `${payload}.${await hmac(payload)}`;
}

/** 驗證 pending token 的簽章與有效期。任一不符即為 false（fail-closed）。 */
export async function verifyPendingToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [expStr, nonce, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;
  if (!/^[0-9a-f]{32}$/.test(nonce)) return false;

  try {
    return timingSafeEqualHex(sig, await hmac(`${expStr}.${nonce}`));
  } catch {
    return false; // 密鑰缺失等例外一律擋下
  }
}

export const PENDING_COOKIE_MAX_AGE = PENDING_TTL_MS / 1000;
