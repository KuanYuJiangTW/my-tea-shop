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

describe("HMAC 簽章驗證", () => {
  it("正確簽章通過", () => {
    expect(verifySanityWebhook(BODY, sign(BODY, TS), SECRET, NOW)).toEqual({ ok: true });
  });

  it("body 被竄改則簽章不符（簽章與內容綁定）", () => {
    const header = sign(BODY, TS);
    const tampered = JSON.stringify({ _type: "experience", _id: "evil" });
    expect(verifySanityWebhook(tampered, header, SECRET, NOW).ok).toBe(false);
  });

  it("用錯誤密鑰簽的不通過", () => {
    expect(verifySanityWebhook(BODY, sign(BODY, TS, "wrong-secret"), SECRET, NOW).ok).toBe(false);
  });

  it("剛送出的毫秒時間戳（Sanity 實際格式）通過，不誤判過期", () => {
    // 回歸：production 就是因為把毫秒當秒再乘 1000，導致這種正常請求被判過期
    expect(verifySanityWebhook(BODY, sign(BODY, NOW), SECRET, NOW + 2000)).toEqual({ ok: true });
  });

  it("秒格式的時間戳也能容忍（相容 Stripe 風格）", () => {
    const secs = Math.floor(NOW / 1000);
    expect(verifySanityWebhook(BODY, sign(BODY, secs), SECRET, NOW).ok).toBe(true);
  });

  it("時間戳過舊視為重放", () => {
    const r = verifySanityWebhook(BODY, sign(BODY, TS - 10 * MIN), SECRET, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("過期");
  });

  it("時間戳來自未來過多也拒絕", () => {
    expect(verifySanityWebhook(BODY, sign(BODY, TS + 10 * MIN), SECRET, NOW).ok).toBe(false);
  });

  it("格式殘缺的簽章標頭拒絕", () => {
    for (const h of ["", "v1=abc", "t=123", "garbage", "t=,v1="]) {
      expect(verifySanityWebhook(BODY, h || null, SECRET, NOW).ok).toBe(false);
    }
  });
});

describe("只接受簽章（舊版共用密鑰退路已移除）", () => {
  it("完全沒有簽章標頭時拒絕", () => {
    const r = verifySanityWebhook(BODY, null, SECRET, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("缺少簽章");
  });

  it("不因缺簽章而降級成任何較弱的驗證方式", () => {
    // 2026-07-29 前的版本會在此情況下檢查 x-sanity-webhook-secret 標頭並放行。
    // 現在無論客端送什麼，沒有有效簽章一律 false。
    for (const h of [null, "", "  "]) {
      expect(verifySanityWebhook(BODY, h, SECRET, NOW).ok).toBe(false);
    }
  });
});

describe("設定缺失", () => {
  it("未設定 SANITY_WEBHOOK_SECRET 時一律拒絕（fail-closed）", () => {
    expect(verifySanityWebhook(BODY, sign(BODY, TS), undefined, NOW).ok).toBe(false);
  });
});
