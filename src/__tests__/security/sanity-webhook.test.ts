import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifySanityWebhook } from "@/lib/sanity-webhook";

const SECRET = "test-webhook-secret";
const BODY = JSON.stringify({ _type: "experience", _id: "abc" });

function sign(body: string, ts: number, secret = SECRET): string {
  const sig = createHmac("sha256", secret)
    .update(`${ts}.${body}`)
    .digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `t=${ts},v1=${sig}`;
}

const NOW = 1_800_000_000_000;
// Sanity 的時間戳是毫秒（Date.now()），不是秒。先前測試用秒，等於用錯誤假設
// 驗證錯誤程式碼，所以沒抓到 production 的「簽章已過期」。
const TS = NOW;
const MIN = 60_000;

describe("HMAC 簽章路徑", () => {
  it("正確簽章通過", () => {
    const r = verifySanityWebhook(BODY, sign(BODY, TS), null, SECRET, NOW);
    expect(r).toEqual({ ok: true, method: "hmac" });
  });

  it("body 被竄改則簽章不符（簽章與內容綁定）", () => {
    const header = sign(BODY, TS);
    const tampered = JSON.stringify({ _type: "experience", _id: "evil" });
    const r = verifySanityWebhook(tampered, header, null, SECRET, NOW);
    expect(r.ok).toBe(false);
  });

  it("用錯誤密鑰簽的不通過", () => {
    const r = verifySanityWebhook(BODY, sign(BODY, TS, "wrong-secret"), null, SECRET, NOW);
    expect(r.ok).toBe(false);
  });

  it("剛送出的毫秒時間戳（Sanity 實際格式）通過，不誤判過期", () => {
    // 回歸：production 就是因為把毫秒當秒再乘 1000，導致這種正常請求被判過期
    const r = verifySanityWebhook(BODY, sign(BODY, NOW), null, SECRET, NOW + 2000);
    expect(r).toEqual({ ok: true, method: "hmac" });
  });

  it("時間戳過舊視為重放", () => {
    const old = TS - 10 * MIN; // 10 分鐘前（毫秒）
    const r = verifySanityWebhook(BODY, sign(BODY, old), null, SECRET, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("過期");
  });

  it("時間戳來自未來過多也拒絕", () => {
    const future = TS + 10 * MIN;
    const r = verifySanityWebhook(BODY, sign(BODY, future), null, SECRET, NOW);
    expect(r.ok).toBe(false);
  });

  it("秒格式的時間戳也能容忍（相容 Stripe 風格）", () => {
    const secs = Math.floor(NOW / 1000);
    const r = verifySanityWebhook(BODY, sign(BODY, secs), null, SECRET, NOW);
    expect(r.ok).toBe(true);
  });

  it("格式殘缺的簽章標頭拒絕", () => {
    for (const h of ["", "v1=abc", "t=123", "garbage", "t=,v1="]) {
      const r = verifySanityWebhook(BODY, h || null, null, SECRET, NOW);
      expect(r.ok).toBe(false);
    }
  });
});

describe("舊版共用密鑰退路", () => {
  it("無簽章但密鑰正確時放行，並標示為 legacy", () => {
    const r = verifySanityWebhook(BODY, null, SECRET, SECRET, NOW);
    expect(r).toEqual({ ok: true, method: "legacy-secret" });
  });

  it("密鑰錯誤不放行", () => {
    const r = verifySanityWebhook(BODY, null, "wrong", SECRET, NOW);
    expect(r.ok).toBe(false);
  });

  it("有簽章標頭時不會退回密鑰路徑（避免降級繞過）", () => {
    // 帶著正確的舊密鑰、但簽章是壞的 → 必須拒絕
    const r = verifySanityWebhook(BODY, "t=1,v1=bogus", SECRET, SECRET, NOW);
    expect(r.ok).toBe(false);
  });
});

describe("設定缺失", () => {
  it("未設定 SANITY_WEBHOOK_SECRET 時一律拒絕（fail-closed）", () => {
    const r = verifySanityWebhook(BODY, sign(BODY, TS), SECRET, undefined, NOW);
    expect(r.ok).toBe(false);
  });
});
