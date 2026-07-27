import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainMock } from "../points/helpers/supabase-mock";

// 測試用固定 TOTP secret（Base32，≥16 bytes）
const TEST_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

process.env.ADMIN_PASSWORD = "test-admin-password";

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

// 限流層獨立測試，這裡預設放行，只在需要時覆寫
const mockPeek = vi.fn().mockResolvedValue(false);
const mockBump = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/rate-limit", () => ({
  getClientIp: () => "1.2.3.4",
  rateLimitPeek: (...a: unknown[]) => mockPeek(...a),
  rateLimitBump: (...a: unknown[]) => mockBump(...a),
  rateLimitReset: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/admin-token", () => ({
  generateAdminSessionToken: () => "generated-session-token",
  createAdminSession: vi.fn().mockResolvedValue(undefined),
}));

import { generate } from "otplib";
import { POST } from "@/app/api/admin/auth/2fa/route";
import { issuePendingToken, verifyPendingToken } from "@/lib/admin-pending";

function makeReq(code: string, pendingCookie?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (pendingCookie !== undefined) headers["cookie"] = `admin_pending=${pendingCookie}`;
  return new NextRequest("http://localhost/api/admin/auth/2fa", {
    method: "POST",
    headers,
    body: JSON.stringify({ code }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPeek.mockResolvedValue(false);
  mockFrom.mockImplementation(() => createChainMock({ value: TEST_SECRET }, null));
});

describe("admin_pending token", () => {
  it("本站簽發的 token 可通過驗證", async () => {
    expect(await verifyPendingToken(await issuePendingToken())).toBe(true);
  });

  it("舊版固定值 '1' 不再被接受（原繞過手法）", async () => {
    expect(await verifyPendingToken("1")).toBe(false);
  });

  it("簽章被竄改時拒絕", async () => {
    const token = await issuePendingToken();
    const [exp, nonce] = token.split(".");
    expect(await verifyPendingToken(`${exp}.${nonce}.${"0".repeat(64)}`)).toBe(false);
  });

  it("延長有效期但沿用原簽章時拒絕", async () => {
    const token = await issuePendingToken();
    const [, nonce, sig] = token.split(".");
    const future = Date.now() + 86_400_000;
    expect(await verifyPendingToken(`${future}.${nonce}.${sig}`)).toBe(false);
  });

  it("已過期的 token 拒絕", async () => {
    const past = Date.now() - 1000;
    // 用合法簽章流程無法造出過期 token，直接組一個結構正確但過期的
    expect(await verifyPendingToken(`${past}.${"a".repeat(32)}.${"b".repeat(64)}`)).toBe(false);
  });

  it("格式不符（缺欄位、非 hex nonce）時拒絕", async () => {
    expect(await verifyPendingToken(undefined)).toBe(false);
    expect(await verifyPendingToken("")).toBe(false);
    expect(await verifyPendingToken("a.b")).toBe(false);
    expect(await verifyPendingToken(`${Date.now() + 1000}.NOTHEX.${"b".repeat(64)}`)).toBe(false);
  });
});

describe("POST /api/admin/auth/2fa", () => {
  it("錯誤的 TOTP 碼必須回 401（回歸：otplib v13 verify() 回傳物件，曾導致任何碼都通過）", async () => {
    const good = await generate({ secret: TEST_SECRET });
    // 取一個保證不同於正確碼的 6 位數
    const bad = String((Number(good) + 1) % 1_000_000).padStart(6, "0");

    const res = await POST(makeReq(bad, await issuePendingToken()));

    expect(res.status).toBe(401);
    expect(res.cookies.get("admin_session")).toBeUndefined();
    expect(mockBump).toHaveBeenCalled();
  });

  it("正確的 TOTP 碼通過並發放 admin_session", async () => {
    const good = await generate({ secret: TEST_SECRET });

    const res = await POST(makeReq(good, await issuePendingToken()));

    expect(res.status).toBe(200);
    expect(res.cookies.get("admin_session")?.value).toBe("generated-session-token");
    expect(res.cookies.get("admin_pending")?.value).toBe("");
  });

  it("偽造 admin_pending=1 時擋在密碼關卡（原完整繞過路徑）", async () => {
    const good = await generate({ secret: TEST_SECRET });

    const res = await POST(makeReq(good, "1"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "請先完成密碼驗證" });
    expect(res.cookies.get("admin_session")).toBeUndefined();
  });

  it("完全沒有 admin_pending cookie 時回 401", async () => {
    const good = await generate({ secret: TEST_SECRET });

    const res = await POST(makeReq(good));

    expect(res.status).toBe(401);
    expect(res.cookies.get("admin_session")).toBeUndefined();
  });

  it("超過失敗上限時回 429，且不進行驗證", async () => {
    mockPeek.mockResolvedValue(true);
    const good = await generate({ secret: TEST_SECRET });

    const res = await POST(makeReq(good, await issuePendingToken()));

    expect(res.status).toBe(429);
    expect(res.cookies.get("admin_session")).toBeUndefined();
  });

  it("非 6 位數格式回 400", async () => {
    const res = await POST(makeReq("12345", await issuePendingToken()));
    expect(res.status).toBe(400);
  });

  it("2FA 尚未設定時回 400", async () => {
    mockFrom.mockImplementation(() => createChainMock(null, null));
    const res = await POST(makeReq("123456", await issuePendingToken()));
    expect(res.status).toBe(400);
  });
});
