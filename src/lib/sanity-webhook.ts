import { createHmac, timingSafeEqual } from "crypto";

// Sanity webhook 的簽章驗證。
//
// 原本只比對 x-sanity-webhook-secret 這個共用字串。字串密鑰的問題是：它每次
// 請求都原樣送出，任何一次側錄（log、proxy、誤設的中介層）就永久有效，且無法
// 綁定請求內容——拿到密鑰即可偽造任意 payload。
//
// Sanity 原生支援 HMAC 簽章：
//   header: sanity-webhook-signature: t=<unix秒>,v1=<base64url(HMAC-SHA256)>
//   簽章內容: `${t}.${rawBody}`
// 簽章與 body 綁定且含時間戳，可防篡改與重放。

/** 簽章時間戳容許誤差；超過視為重放。 */
const MAX_SKEW_MS = 5 * 60_000;

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * 驗證 Sanity webhook 請求（僅接受 HMAC 簽章）。
 *
 * 切換歷程：2026-07-29 於 Sanity 後台填入 Secret 並實測 POST 200 通過後，
 * 移除了原本的共用密鑰退路。退路存在的期間僅為避免切換過程中快取更新無聲
 * 失效；現在簽章路徑已確認可用，保留它只會多一條較弱的驗證途徑。
 *
 * 若日後 Sanity 後台的 Secret 被清空，webhook 會直接回 401 而非降級——
 * 這是刻意的：寧可快取不更新（看得見），也不要靜默走弱驗證（看不見）。
 */
export function verifySanityWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
  now: number = Date.now(),
): VerifyResult {
  if (!secret) return { ok: false, reason: "SANITY_WEBHOOK_SECRET 未設定" };

  if (signatureHeader) {
    // 解析 t=<ts>,v1=<sig>
    const parts = Object.fromEntries(
      signatureHeader.split(",").map((kv) => {
        const i = kv.indexOf("=");
        return i === -1 ? [kv.trim(), ""] : [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
      }),
    ) as Record<string, string>;

    const ts = parts.t;
    const sig = parts.v1;
    if (!ts || !sig) return { ok: false, reason: "簽章格式不正確" };

    // Sanity 送的時間戳是「毫秒」（Date.now()），與 Stripe 的「秒」不同。
    // 用量級判斷以同時容納兩種：< 1e12 視為秒（約在西元 33658 年以前），否則毫秒。
    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum)) return { ok: false, reason: "簽章時間戳不正確" };
    const tsMs = tsNum < 1e12 ? tsNum * 1000 : tsNum;
    if (Math.abs(now - tsMs) > MAX_SKEW_MS) return { ok: false, reason: "簽章已過期" };

    const expected = base64url(createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest());
    if (!safeEqual(sig, expected)) return { ok: false, reason: "簽章不符" };

    return { ok: true };
  }

  return { ok: false, reason: "缺少簽章標頭" };
}
