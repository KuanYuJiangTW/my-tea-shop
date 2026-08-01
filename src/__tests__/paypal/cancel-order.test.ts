import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockAdminFrom, mockAdminRpc, mockGetUser } = vi.hoisted(() => ({
  mockAdminFrom: vi.fn(),
  mockAdminRpc: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: mockAdminFrom, rpc: mockAdminRpc },
}));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

import { POST } from "@/app/api/orders/[id]/cancel/route";

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_USER = { id: "user-123", email: "test@example.com" };

function makeRequest() {
  return new NextRequest("https://taiwantea.store/api/orders/order-abc/cancel", {
    method: "POST",
  });
}

function makeParams(id = "order-abc") {
  return { params: Promise.resolve({ id }) };
}

const BASE_ORDER = {
  id: "order-abc",
  user_id: TEST_USER.id,
  order_status: "new",
  coupon_id: null,
  points_used: 0,
  items: [{ productId: 1, quantity: 2, spec: "150g" }],
  payment_method: "paypal",
  payment_status: "pending",
};

function setupOrderMock(order: unknown, updateError: unknown = null) {
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "orders") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: order, error: order ? null : { message: "not found" } }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: updateError }),
        }),
      };
    }
    if (table === "coupons") {
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    if (table === "coupon_usages") {
      // 通用碼還原：以 order_id 為鍵刪除（券的種類無法從訂單分辨）
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    if (table === "point_transactions") {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    return {};
  });
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockGetUser.mockReset();
  mockAdminFrom.mockReset();
  mockAdminRpc.mockReset();
  mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  mockAdminRpc.mockResolvedValue({ data: true, error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
// Tests — 庫存還原邏輯（PayPal bug 修復）
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/orders/[id]/cancel — 庫存還原邏輯", () => {
  it("PayPal pending 訂單取消：不應還原庫存（尚未扣過）", async () => {
    setupOrderMock({ ...BASE_ORDER, payment_method: "paypal", payment_status: "pending" });

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);

    // increment_stock 不應被呼叫
    expect(mockAdminRpc).not.toHaveBeenCalled();
  });

  it("PayPal paid 訂單取消：應還原庫存（已扣過）", async () => {
    setupOrderMock({ ...BASE_ORDER, payment_method: "paypal", payment_status: "paid" });

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);

    expect(mockAdminRpc).toHaveBeenCalledWith("increment_stock", {
      p_id: 1,
      qty: 2,
      spec: "150g",
    });
  });

  it("COD 訂單取消：應還原庫存（下單即扣）", async () => {
    setupOrderMock({ ...BASE_ORDER, payment_method: "cod", payment_status: "pending" });

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);

    expect(mockAdminRpc).toHaveBeenCalledWith("increment_stock", {
      p_id: 1,
      qty: 2,
      spec: "150g",
    });
  });

  it("ECPay pending 訂單取消：不應還原庫存", async () => {
    setupOrderMock({ ...BASE_ORDER, payment_method: "ecpay", payment_status: "pending" });

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);

    expect(mockAdminRpc).not.toHaveBeenCalled();
  });

  it("Stripe pending 訂單取消：不應還原庫存", async () => {
    setupOrderMock({ ...BASE_ORDER, payment_method: "stripe", payment_status: "pending" });

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);

    expect(mockAdminRpc).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Tests — 優惠券和積分退還
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/orders/[id]/cancel — 優惠券與積分退還", () => {
  it("有優惠券的訂單取消：應退還優惠券", async () => {
    setupOrderMock({ ...BASE_ORDER, coupon_id: "coupon-1" });

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);

    // 確認 coupons table 被呼叫
    expect(mockAdminFrom).toHaveBeenCalledWith("coupons");
  });

  it("有積分的訂單取消：應退還積分", async () => {
    setupOrderMock({ ...BASE_ORDER, points_used: 500 });

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);

    // 確認 point_transactions table 被呼叫
    expect(mockAdminFrom).toHaveBeenCalledWith("point_transactions");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Tests — 基本驗證
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/orders/[id]/cancel — 基本驗證", () => {
  it("未登入回傳 401", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it("訂單不存在回傳 404", async () => {
    setupOrderMock(null);

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(404);
  });

  it("非本人訂單回傳 403", async () => {
    setupOrderMock({ ...BASE_ORDER, user_id: "other-user" });

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(403);
  });

  it("非 new 狀態訂單不可取消", async () => {
    setupOrderMock({ ...BASE_ORDER, order_status: "paid" });

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(400);
  });
});
