import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { TEST_USER, TEST_PRODUCT, BASE_ORDER_BODY } from "./helpers";

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
  createRateLimiter: () => ({ isLimited: () => false, record: () => {} }),
  getClientIp: () => "127.0.0.1",
}));

import { POST } from "@/app/api/paypal/create-order/route";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, origin = "https://taiwantea.store") {
  return new NextRequest("https://taiwantea.store/api/paypal/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

function setupSupabaseMocks(overrides: {
  products?: unknown[];
  insertOrder?: { data: unknown; error: unknown };
  coupon?: unknown;
  points?: unknown[];
} = {}) {
  const products = overrides.products ?? [TEST_PRODUCT];
  const insertResult = overrides.insertOrder ?? { data: { id: "order-abc" }, error: null };

  mockFrom.mockImplementation((table: string) => {
    if (table === "products") {
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: products, error: null }),
        }),
      };
    }
    if (table === "orders") {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(insertResult),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    if (table === "coupons") {
      if (overrides.coupon) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  gt: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: overrides.coupon, error: null }),
                  }),
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                gt: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
                }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === "point_transactions") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: overrides.points ?? [], error: null }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    return {};
  });
}

// ─── Setup / Teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://taiwantea.store");
  vi.stubEnv("PAYPAL_CLIENT_ID", "test-id");
  vi.stubEnv("PAYPAL_CLIENT_SECRET", "test-secret");

  mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  mockCreatePayPalOrder.mockResolvedValue({
    paypalOrderId: "PAYPAL-ORDER-1",
    approveUrl: "https://paypal.com/approve/PAYPAL-ORDER-1",
  });

  mockFrom.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ═════════════════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/paypal/create-order", () => {
  it("should create order and return PayPal approve URL", async () => {
    setupSupabaseMocks();
    const res = await POST(makeRequest(BASE_ORDER_BODY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe("https://paypal.com/approve/PAYPAL-ORDER-1");
    expect(json.orderId).toBe("order-abc");
  });

  it("should return 401 if user not logged in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    setupSupabaseMocks();

    const res = await POST(makeRequest(BASE_ORDER_BODY));
    expect(res.status).toBe(401);
  });

  it("should return 400 if cart is empty", async () => {
    setupSupabaseMocks();
    const res = await POST(makeRequest({ ...BASE_ORDER_BODY, items: [] }));
    expect(res.status).toBe(400);
  });

  it("should return 400 if customer name is missing", async () => {
    setupSupabaseMocks();
    const body = {
      ...BASE_ORDER_BODY,
      customer: { ...BASE_ORDER_BODY.customer, name: "" },
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid delivery type", async () => {
    setupSupabaseMocks();
    const body = { ...BASE_ORDER_BODY, deliveryType: "drone" };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid spec", async () => {
    setupSupabaseMocks();
    const body = {
      ...BASE_ORDER_BODY,
      items: [{ productId: 1, quantity: 1, spec: "500g" }],
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("should return 400 when stock is insufficient", async () => {
    setupSupabaseMocks({
      products: [{ ...TEST_PRODUCT, stock_quantity: 1 }],
    });
    const body = {
      ...BASE_ORDER_BODY,
      items: [{ productId: 1, quantity: 5 }],
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Insufficient stock");
  });

  it("should calculate free shipping when subtotal >= 1000", async () => {
    setupSupabaseMocks();
    const res = await POST(makeRequest(BASE_ORDER_BODY));
    expect(res.status).toBe(200);

    expect(mockCreatePayPalOrder).toHaveBeenCalledWith(
      1200, "order-abc", expect.any(String), expect.any(String), undefined,
    );
  });

  it("should add shipping fee when subtotal < 1000 (home delivery)", async () => {
    setupSupabaseMocks();
    const body = {
      ...BASE_ORDER_BODY,
      items: [{ productId: 1, quantity: 1 }],
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);

    expect(mockCreatePayPalOrder).toHaveBeenCalledWith(
      850, "order-abc", expect.any(String), expect.any(String), undefined,
    );
  });

  it("should add CVS shipping fee when subtotal < 1000", async () => {
    setupSupabaseMocks();
    const body = {
      ...BASE_ORDER_BODY,
      deliveryType: "cvs",
      cvsInfo: { company: "seven", storeId: "123", storeName: "7-11 信義店" },
      items: [{ productId: 1, quantity: 1 }],
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);

    expect(mockCreatePayPalOrder).toHaveBeenCalledWith(
      660, "order-abc", expect.any(String), expect.any(String), undefined,
    );
  });

  it("should return 400 for invalid coupon", async () => {
    setupSupabaseMocks();
    const body = { ...BASE_ORDER_BODY, couponCode: "INVALID_CODE" };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Coupon");
  });

  it("should apply valid coupon discount", async () => {
    setupSupabaseMocks({
      coupon: { id: "coupon-1", discount_amount: 100, min_order_amount: 500 },
    });
    const body = { ...BASE_ORDER_BODY, couponCode: "SAVE100" };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);

    expect(mockCreatePayPalOrder).toHaveBeenCalledWith(
      1100, "order-abc", expect.any(String), expect.any(String), undefined,
    );
  });

  it("should return 400 for insufficient points", async () => {
    setupSupabaseMocks({ points: [{ points: 100 }] });
    const body = { ...BASE_ORDER_BODY, pointsToUse: 200 };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Insufficient points");
  });

  it("should return 400 for invalid points amount", async () => {
    setupSupabaseMocks({ points: [{ points: 500 }] });
    const body = { ...BASE_ORDER_BODY, pointsToUse: 150 };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("should rollback on PayPal API failure", async () => {
    setupSupabaseMocks({
      coupon: { id: "coupon-1", discount_amount: 100, min_order_amount: 500 },
    });
    mockCreatePayPalOrder.mockRejectedValue(new Error("PayPal API down"));

    const body = { ...BASE_ORDER_BODY, couponCode: "SAVE100" };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toContain("PayPal API down");
  });

  it("should return 503 if PayPal is not configured", async () => {
    vi.stubEnv("PAYPAL_CLIENT_ID", "");
    vi.stubEnv("PAYPAL_CLIENT_SECRET", "");
    setupSupabaseMocks();

    const res = await POST(makeRequest(BASE_ORDER_BODY));
    expect(res.status).toBe(503);
  });

  it("should include locale prefix in return URL for English", async () => {
    setupSupabaseMocks();
    const body = { ...BASE_ORDER_BODY, locale: "en" };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);

    expect(mockCreatePayPalOrder).toHaveBeenCalledWith(
      1200, "order-abc",
      expect.stringContaining("/en/order/result"),
      expect.stringContaining("/en/order/result"),
      undefined,
    );
  });

  it("should support 75g spec with correct pricing", async () => {
    setupSupabaseMocks();
    const body = {
      ...BASE_ORDER_BODY,
      items: [{ productId: 1, quantity: 2, spec: "75g" }],
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);

    expect(mockCreatePayPalOrder).toHaveBeenCalledWith(
      950, "order-abc", expect.any(String), expect.any(String), undefined,
    );
  });

  it("should support teabag spec with correct pricing", async () => {
    setupSupabaseMocks();
    const body = {
      ...BASE_ORDER_BODY,
      items: [{ productId: 1, quantity: 4, spec: "teabag" }],
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);

    expect(mockCreatePayPalOrder).toHaveBeenCalledWith(
      1120, "order-abc", expect.any(String), expect.any(String), undefined,
    );
  });
});
