import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChainMock, createCronRequest } from "./helpers/supabase-mock";

// ── Mocks ───────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockGetUserById = vi.fn();
const mockSendEmail = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { admin: { getUserById: (...args: unknown[]) => mockGetUserById(...args) } },
  },
}));

vi.mock("@/lib/email", () => ({
  sendCouponExpiryEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

import { GET } from "@/app/api/cron/coupon-expiry-notify/route";

// ── Helpers ─────────────────────────────────────────────────────────────

const CRON_SECRET = "test-secret";
const DAY = 24 * 60 * 60 * 1000;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

interface CouponRow {
  id: string;
  user_id: string;
  discount_amount: number;
  min_order_amount: number;
  expires_at: string;
}

/** coupons 首次查詢回傳 rows，後續 coupons 呼叫（update）回傳空結果 */
function setupCoupons(rows: CouponRow[], opts: { updateError?: unknown } = {}) {
  const updateChain = createChainMock(null, opts.updateError ?? null);
  let couponCalls = 0;

  mockFrom.mockImplementation((table: string) => {
    if (table === "coupons") {
      couponCalls++;
      return couponCalls === 1 ? createChainMock(rows, null) : updateChain;
    }
    if (table === "profiles") return createChainMock({ name: "小江" }, null);
    return createChainMock(null, null);
  });

  mockGetUserById.mockResolvedValue({ data: { user: { email: "test@example.com" } } });
  mockSendEmail.mockResolvedValue(undefined);

  return { updateChain };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = CRON_SECRET;
});

// ── Tests ───────────────────────────────────────────────────────────────

describe("coupon-expiry-notify cron", () => {
  it("無授權 header → 401，且不查任何資料", async () => {
    const res = await GET(createCronRequest());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("錯誤的 secret → 401", async () => {
    const res = await GET(createCronRequest("wrong-secret"));
    expect(res.status).toBe(401);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("沒有即將到期的券 → 200 且不發信", async () => {
    setupCoupons([]);
    const res = await GET(createCronRequest(CRON_SECRET));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results).toEqual({ sent: 0, errors: 0, coupons: 0 });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("查詢失敗 → 500", async () => {
    mockFrom.mockReturnValue(createChainMock(null, { message: "boom" }));
    const res = await GET(createCronRequest(CRON_SECRET));
    expect(res.status).toBe(500);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("單張券 → 發一封信，帶正確面額與門檻", async () => {
    setupCoupons([
      { id: "c1", user_id: "u1", discount_amount: 50, min_order_amount: 350, expires_at: inDays(5) },
    ]);

    const res = await GET(createCronRequest(CRON_SECRET));
    const json = await res.json();

    expect(json.results.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      customerEmail: "test@example.com",
      customerName: "小江",
      couponCount: 1,
      totalValue: 50,
      minOrderAmount: 350,
      daysLeft: 5,
    }));
  });

  it("同一人多張券彙總成一封信：張數/總額相加、門檻取最低、到期日取最近", async () => {
    setupCoupons([
      { id: "c1", user_id: "u1", discount_amount: 50,  min_order_amount: 350, expires_at: inDays(6) },
      { id: "c2", user_id: "u1", discount_amount: 100, min_order_amount: 800, expires_at: inDays(3) },
    ]);

    const res = await GET(createCronRequest(CRON_SECRET));
    const json = await res.json();

    expect(json.results.sent).toBe(1); // 一人一封
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      couponCount: 2,
      totalValue: 150,
      minOrderAmount: 350, // 最低門檻，不是 800
      daysLeft: 3,         // 最近的到期日
    }));
  });

  it("多人各自收信", async () => {
    setupCoupons([
      { id: "c1", user_id: "u1", discount_amount: 50, min_order_amount: 350, expires_at: inDays(4) },
      { id: "c2", user_id: "u2", discount_amount: 50, min_order_amount: 350, expires_at: inDays(4) },
    ]);

    const json = await (await GET(createCronRequest(CRON_SECRET))).json();
    expect(json.results.sent).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("查不到 email 的用戶跳過，不計入 sent 也不標記", async () => {
    const { updateChain } = setupCoupons([
      { id: "c1", user_id: "u1", discount_amount: 50, min_order_amount: 350, expires_at: inDays(4) },
    ]);
    mockGetUserById.mockResolvedValue({ data: { user: null } });

    const json = await (await GET(createCronRequest(CRON_SECRET))).json();
    expect(json.results.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(updateChain.update).not.toHaveBeenCalled();
  });

  // 這條是本 cron 與 points-expiry-notify 的關鍵差異
  it("寄信失敗的券不得被標記為已通知（否則永久漏發）", async () => {
    const { updateChain } = setupCoupons([
      { id: "c1", user_id: "u1", discount_amount: 50, min_order_amount: 350, expires_at: inDays(4) },
      { id: "c2", user_id: "u2", discount_amount: 50, min_order_amount: 350, expires_at: inDays(4) },
    ]);
    // u1 寄失敗、u2 成功
    mockSendEmail
      .mockRejectedValueOnce(new Error("resend down"))
      .mockResolvedValueOnce(undefined);

    const json = await (await GET(createCronRequest(CRON_SECRET))).json();

    expect(json.results.sent).toBe(1);
    expect(json.results.errors).toBe(1);
    // 只有成功那張進 update
    expect(updateChain.update).toHaveBeenCalledWith({ notification_sent_7d: true });
    expect(updateChain.in).toHaveBeenCalledWith("id", ["c2"]);
  });

  it("全部寄失敗時完全不呼叫 update", async () => {
    const { updateChain } = setupCoupons([
      { id: "c1", user_id: "u1", discount_amount: 50, min_order_amount: 350, expires_at: inDays(4) },
    ]);
    mockSendEmail.mockRejectedValue(new Error("resend down"));

    const json = await (await GET(createCronRequest(CRON_SECRET))).json();
    expect(json.results.sent).toBe(0);
    expect(json.results.errors).toBe(1);
    expect(updateChain.update).not.toHaveBeenCalled();
  });

  it("標記失敗時記為 error，但仍回 200（下次重寄勝過漏寄）", async () => {
    setupCoupons(
      [{ id: "c1", user_id: "u1", discount_amount: 50, min_order_amount: 350, expires_at: inDays(4) }],
      { updateError: { message: "update failed" } },
    );

    const res = await GET(createCronRequest(CRON_SECRET));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.results.sent).toBe(1);
    expect(json.results.errors).toBe(1);
  });

  it("查詢條件：未使用、未通知、且落在 7 天窗內", async () => {
    const chain = createChainMock([], null);
    mockFrom.mockReturnValue(chain);

    await GET(createCronRequest(CRON_SECRET));

    expect(mockFrom).toHaveBeenCalledWith("coupons");
    expect(chain.is).toHaveBeenCalledWith("used_at", null);
    expect(chain.eq).toHaveBeenCalledWith("notification_sent_7d", false);
    // gt(now) 排除已過期的券、lte(now+7d) 限制窗口上緣
    expect(chain.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
    expect(chain.lte).toHaveBeenCalledWith("expires_at", expect.any(String));

    const gtArg = chain.gt.mock.calls[0][1] as string;
    const lteArg = chain.lte.mock.calls[0][1] as string;
    const windowDays = (new Date(lteArg).getTime() - new Date(gtArg).getTime()) / DAY;
    expect(windowDays).toBeCloseTo(7, 3);
  });
});
