import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { TEST_USER } from "./helpers";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockFrom, mockGetUser, mockCreatePayPalOrder } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUser: vi.fn(),
  mockCreatePayPalOrder: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ supabase: { from: mockFrom } }));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));
vi.mock("@/lib/paypal", () => ({
  createPayPalOrder: (...args: unknown[]) => mockCreatePayPalOrder(...args),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: async () => true,
  getClientIp: () => "127.0.0.1",
}));

import { POST } from "@/app/api/paypal/retry/route";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new NextRequest("https://taiwantea.store/api/paypal/retry", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "https://taiwantea.store",
    },
    body: JSON.stringify(body),
  });
}

const BASE_ORDER = {
  id: "order-abc",
  user_id: TEST_USER.id,
  payment_status: "pending",
  order_status: "new",
  total_amount: 1200,
  payment_method: "paypal",
};

function setupOrderLookup(order: unknown, error: unknown = null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "orders") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: order, error }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    return {};
  });
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://taiwantea.store");
  mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  mockCreatePayPalOrder.mockResolvedValue({
    paypalOrderId: "PAYPAL-NEW",
    approveUrl: "https://paypal.com/approve/PAYPAL-NEW",
  });
  mockFrom.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ═════════════════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/paypal/retry", () => {
  it("should create new PayPal order for retry", async () => {
    setupOrderLookup(BASE_ORDER);

    const res = await POST(makeRequest({ orderId: "order-abc" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe("https://paypal.com/approve/PAYPAL-NEW");
    expect(mockCreatePayPalOrder).toHaveBeenCalledWith(
      1200, "order-abc",
      expect.stringContaining("/order/result"),
      expect.stringContaining("/order/result"),
      undefined, // 國內單不帶地址
    );
  });

  it("should return 401 if not logged in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest({ orderId: "order-abc" }));
    expect(res.status).toBe(401);
  });

  it("should return 400 if orderId is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("should return 404 if order not found", async () => {
    setupOrderLookup(null, { message: "not found" });

    const res = await POST(makeRequest({ orderId: "nonexistent" }));
    expect(res.status).toBe(404);
  });

  it("should return 403 if order belongs to another user", async () => {
    setupOrderLookup({ ...BASE_ORDER, user_id: "someone-else" });

    const res = await POST(makeRequest({ orderId: "order-abc" }));
    expect(res.status).toBe(403);
  });

  it("should return 400 if order already paid", async () => {
    setupOrderLookup({ ...BASE_ORDER, payment_status: "paid" });

    const res = await POST(makeRequest({ orderId: "order-abc" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("已完成付款");
  });

  it("should return 400 if order is cancelled", async () => {
    setupOrderLookup({ ...BASE_ORDER, order_status: "cancelled" });

    const res = await POST(makeRequest({ orderId: "order-abc" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("無法重新付款");
  });

  it("should return 400 if order is failed", async () => {
    setupOrderLookup({ ...BASE_ORDER, order_status: "failed" });

    const res = await POST(makeRequest({ orderId: "order-abc" }));
    expect(res.status).toBe(400);
  });

  it("should return 400 if order is not a PayPal order", async () => {
    setupOrderLookup({ ...BASE_ORDER, payment_method: "online" });

    const res = await POST(makeRequest({ orderId: "order-abc" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("not a PayPal order");
  });

  it("should return 500 on PayPal API failure", async () => {
    setupOrderLookup(BASE_ORDER);
    mockCreatePayPalOrder.mockRejectedValue(new Error("PayPal is down"));

    const res = await POST(makeRequest({ orderId: "order-abc" }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toContain("PayPal is down");
  });

  it("should include /en prefix for English locale", async () => {
    setupOrderLookup(BASE_ORDER);

    const res = await POST(makeRequest({ orderId: "order-abc", locale: "en" }));
    expect(res.status).toBe(200);

    expect(mockCreatePayPalOrder).toHaveBeenCalledWith(
      1200, "order-abc",
      expect.stringContaining("/en/order/result"),
      expect.stringContaining("/en/order/result"),
      undefined,
    );
  });

  // ── 國際脈絡：重新付款必須與首次結帳等價 ────────────────────────────────
  //
  // 漏掉時的後果不是「少一個參數」，而是國際客人走重新付款會：
  // (a) 在 PayPal 被要求自己挑地址，可能挑到與我們出貨依據不同的那個
  // (b) 成功頁不顯示關稅與不可退貨須知——違反 order-result 既有規格
  const INTL_ORDER = {
    ...BASE_ORDER,
    total_amount: 2550,
    customer_name: "Mr Tai Ma",
    shipping_address: {
      type: "international",
      country: "AU",
      countryName: "Australia",
      state: "QLD",
      city: "Sunnybank",
      addressLine1: "341 Mains Road",
      addressLine2: "Centre Management Office",
      postalCode: "4109",
    },
  };

  it("國際訂單重新付款要帶入原地址並標記 intl=1", async () => {
    setupOrderLookup(INTL_ORDER);

    const res = await POST(makeRequest({ orderId: "order-abc", locale: "en" }));
    expect(res.status).toBe(200);

    expect(mockCreatePayPalOrder).toHaveBeenCalledWith(
      2550, "order-abc",
      expect.stringContaining("paypal=success&intl=1"),
      expect.any(String),
      {
        fullName: "Mr Tai Ma",
        addressLine1: "341 Mains Road",
        addressLine2: "Centre Management Office",
        city: "Sunnybank",
        state: "QLD",
        postalCode: "4109",
        countryCode: "AU",
      },
    );
  });

  it("國內訂單重新付款不得帶 intl=1", async () => {
    setupOrderLookup({
      ...BASE_ORDER,
      customer_name: "測試用戶",
      shipping_address: { type: "home", city: "台北市", address: "信義路一段1號" },
    });

    const res = await POST(makeRequest({ orderId: "order-abc" }));
    expect(res.status).toBe(200);

    const [, , returnUrl, , shipping] = mockCreatePayPalOrder.mock.calls.at(-1)!;
    expect(returnUrl).not.toContain("intl=1");
    expect(shipping).toBeUndefined();
  });
});
