import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 後台不得推進未付款線上金流訂單的狀態。
 *
 * 這條防護的由來是一次真實誤操作（2026-09-01，訂單 #886085260B）：業主在一筆
 * PayPal 待付款的澳洲訂單上按了「開始備貨」。當時後台完全沒擋——`getActions()`
 * 只看 `order_status`，這支 PATCH 也只驗白名單。
 *
 * 為什麼不能只擋 `shipped`：
 * - `shipped` 的後果最重（寄出貨通知信、貨真的出去，但線上金流是 capture 成功
 *   才扣庫存，所以錢沒收到、庫存也從沒扣過——帳面與實體同時錯）
 * - `preparing` 雖然不出貨，卻讓客人失去自助取消能力（cancel 路由的
 *   `CANCELLABLE_STATUSES` 只含 `new`），把沒付完款的人鎖在訂單裡
 *
 * COD 必須維持放行，否則等於停掉整條貨到付款業務。
 */

const {
  mockFrom, mockSendShippingEmail, mockIssuePoints, mockRefundOrderPoints,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSendShippingEmail: vi.fn().mockResolvedValue(undefined),
  mockIssuePoints: vi.fn().mockResolvedValue(undefined),
  mockRefundOrderPoints: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase", () => ({ supabase: { from: mockFrom, rpc: vi.fn() } }));
vi.mock("@/lib/email", () => ({ sendShippingEmail: mockSendShippingEmail }));
vi.mock("@/lib/points", () => ({
  issuePoints: mockIssuePoints,
  refundOrderPoints: mockRefundOrderPoints,
}));
vi.mock("@/lib/order-bundles", () => ({
  isBundleOrderItem: () => false,
  restoreBundleStock: vi.fn().mockResolvedValue(undefined),
}));
// 授權本身由 route-auth-coverage 統一掃描，這裡只驗業務規則
vi.mock("@/lib/admin-auth-guard", () => ({
  withAdminAuth: (handler: unknown) => handler,
}));

import { PATCH } from "@/app/api/admin/orders/[id]/route";

// ─── Helpers ────────────────────────────────────────────────────────────────

const ORDER_ID = "88608526-0be9-41e8-966b-13ea44134066";

function setupOrder(prevOrder: Record<string, unknown>) {
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });

  mockFrom.mockImplementation((table: string) => {
    if (table === "orders") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: prevOrder, error: null }),
          }),
        }),
        update,
      };
    }
    // point_transactions 的 count 查詢、coupon_usages 的 delete 等旁支
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 0 }),
        }),
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
  });

  return { update };
}

function makeRequest(body: unknown) {
  return new NextRequest(`https://taiwantea.store/api/admin/orders/${ORDER_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ctx = { params: Promise.resolve({ id: ORDER_ID }) };

const call = (body: unknown) =>
  (PATCH as (req: NextRequest, ctx: unknown) => Promise<Response>)(makeRequest(body), ctx);

const UNPAID_PAYPAL = {
  order_status: "new",
  payment_status: "pending",
  payment_method: "paypal",
  user_id: "user-123",
  items: [],
  coupon_id: null,
};

beforeEach(() => {
  mockFrom.mockReset();
  mockSendShippingEmail.mockClear();
  mockIssuePoints.mockClear();
  mockRefundOrderPoints.mockClear();
});

// ═════════════════════════════════════════════════════════════════════════════

describe("PATCH /api/admin/orders/[id] — 未付款不得推進狀態", () => {
  it("未付款的 PayPal 訂單不得出貨，且不得寄出貨通知信", async () => {
    const { update } = setupOrder(UNPAID_PAYPAL);

    const res = await call({
      orderStatus: "shipped",
      sendShippingEmail: true,
      customerEmail: "tai.ma.mailbox@gmail.com",
      customerName: "Mr Tai Ma",
      shippingAddress: { type: "home" },
      items: [],
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("尚未收到付款") });
    // 最重要的兩件事：狀態沒動、信沒寄出去
    expect(update).not.toHaveBeenCalled();
    expect(mockSendShippingEmail).not.toHaveBeenCalled();
  });

  it("未付款的線上訂單也不得備貨（備貨後客人就無法自助取消了）", async () => {
    const { update } = setupOrder(UNPAID_PAYPAL);

    const res = await call({ orderStatus: "preparing" });

    expect(res.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });

  it("未付款不得直接標記完成（否則會發出回饋點數）", async () => {
    setupOrder(UNPAID_PAYPAL);

    const res = await call({ orderStatus: "completed" });

    expect(res.status).toBe(409);
    expect(mockIssuePoints).not.toHaveBeenCalled();
  });

  it("已付款的 PayPal 訂單正常出貨", async () => {
    const { update } = setupOrder({
      ...UNPAID_PAYPAL, order_status: "preparing", payment_status: "paid",
    });

    const res = await call({ orderStatus: "shipped" });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ order_status: "shipped" });
  });

  it("貨到付款未收款仍可出貨——COD 本來就是先出貨後收款", async () => {
    const { update } = setupOrder({
      ...UNPAID_PAYPAL, order_status: "preparing", payment_method: "cod",
    });

    const res = await call({ orderStatus: "shipped" });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ order_status: "shipped" });
  });

  it("同一請求標記已付款＋推進狀態要放行（COD 的「確認收款」就是這樣）", async () => {
    const { update } = setupOrder({
      ...UNPAID_PAYPAL, order_status: "shipped", payment_method: "cod",
    });

    const res = await call({ orderStatus: "completed", paymentStatus: "paid" });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      order_status: "completed", payment_status: "paid",
    });
  });

  it("取消未付款訂單不受限制——那正是這種訂單該有的出口", async () => {
    const { update } = setupOrder(UNPAID_PAYPAL);

    const res = await call({ orderStatus: "cancelled" });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ order_status: "cancelled" });
  });

  it("只更新付款狀態（不動訂單狀態）不受限制", async () => {
    const { update } = setupOrder(UNPAID_PAYPAL);

    const res = await call({ paymentStatus: "paid" });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ payment_status: "paid" });
  });
});
