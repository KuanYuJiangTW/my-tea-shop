import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { TEST_USER, TEST_PRODUCT, BASE_ORDER_BODY } from "./helpers";
import * as fs from "fs";
import * as path from "path";

// ═════════════════════════════════════════════════════════════════════════════
// 7.3  驗證綠界和貨到付款流程不受影響
// 7.13 驗證 create-order 失敗回滾點數
// 8.7  宅配與超商取貨皆可搭配 PayPal
// 8.8  中英文 PayPal 按鈕文字正確顯示
// 8.9  英文版隱藏貨到付款選項
// 8.10 管理後台顯示 PayPal 訂單
// ═════════════════════════════════════════════════════════════════════════════

// ─── 8.8：翻譯鍵驗證 ────────────────────────────────────────────────────────

describe("PayPal translation keys (8.8)", () => {
  const zhPath = path.resolve(process.cwd(), "messages/zh.json");
  const enPath = path.resolve(process.cwd(), "messages/en.json");

  let zh: Record<string, unknown>;
  let en: Record<string, unknown>;

  beforeEach(() => {
    zh = JSON.parse(fs.readFileSync(zhPath, "utf-8"));
    en = JSON.parse(fs.readFileSync(enPath, "utf-8"));
  });

  const requiredCheckoutKeys = [
    "paypalPayment",
    "paypalPaymentDesc",
    "paypalShort",
    "submitPaypal",
    "paypalMinAmount",
  ];

  const requiredResultKeys = [
    "paypalProcessing",
    "paypalCancelTitle",
    "paypalCancelDesc",
    "paypalRetry",
    "paypalCancelOrder",
    "paypalCaptureFailed",
    "paypalCaptureFailedDesc",
    "paypalContactSupport",
  ];

  it("zh.json should have all PayPal checkout keys", () => {
    const checkout = (zh as { checkout: Record<string, unknown> }).checkout;
    for (const key of requiredCheckoutKeys) {
      expect(checkout[key], `missing zh checkout.${key}`).toBeTruthy();
    }
  });

  it("en.json should have all PayPal checkout keys", () => {
    const checkout = (en as { checkout: Record<string, unknown> }).checkout;
    for (const key of requiredCheckoutKeys) {
      expect(checkout[key], `missing en checkout.${key}`).toBeTruthy();
    }
  });

  it("zh.json should have all PayPal order result keys", () => {
    const result = (zh as { orderResult: Record<string, unknown> }).orderResult;
    for (const key of requiredResultKeys) {
      expect(result[key], `missing zh orderResult.${key}`).toBeTruthy();
    }
  });

  it("en.json should have all PayPal order result keys", () => {
    const result = (en as { orderResult: Record<string, unknown> }).orderResult;
    for (const key of requiredResultKeys) {
      expect(result[key], `missing en orderResult.${key}`).toBeTruthy();
    }
  });

  it("zh.json should have COD payment option keys", () => {
    const checkout = (zh as { checkout: Record<string, unknown> }).checkout;
    expect(checkout["cashOnDelivery"]).toBeTruthy();
  });

  it("en.json should have COD payment option keys (hidden but translated)", () => {
    const checkout = (en as { checkout: Record<string, unknown> }).checkout;
    expect(checkout["cashOnDelivery"]).toBeTruthy();
  });
});

// ─── 7.3：綠界 / 貨到付款路由檔案存在且不受影響 ─────────────────────────────

describe("ECPay and COD routes exist (7.3)", () => {
  it("ECPay return route should exist", () => {
    const routePath = path.resolve(process.cwd(), "src/app/api/ecpay/return/route.ts");
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it("ECPay result route should exist", () => {
    const routePath = path.resolve(process.cwd(), "src/app/api/ecpay/result/route.ts");
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it("Orders cancel route should exist (used by COD)", () => {
    const routePath = path.resolve(process.cwd(), "src/app/api/orders/[id]/cancel/route.ts");
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it("ECPay routes should not import PayPal module", () => {
    const returnRoute = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/api/ecpay/return/route.ts"),
      "utf-8",
    );
    const resultRoute = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/api/ecpay/result/route.ts"),
      "utf-8",
    );

    expect(returnRoute).not.toContain("@/lib/paypal");
    expect(resultRoute).not.toContain("@/lib/paypal");
  });
});

// ─── 8.10：管理後台 PayPal 訂單支援 ─────────────────────────────────────────

describe("Admin panel PayPal support (8.10)", () => {
  it("admin orders page should exist", () => {
    const adminPath = path.resolve(
      process.cwd(),
      "src/app/admin/(protected)/orders/page.tsx",
    );
    expect(fs.existsSync(adminPath)).toBe(true);
  });

  it("admin orders client should handle paypal payment method", () => {
    const clientPath = path.resolve(
      process.cwd(),
      "src/app/admin/(protected)/orders/OrdersClient.tsx",
    );
    const content = fs.readFileSync(clientPath, "utf-8");
    expect(content).toContain("paypal");
  });

  it("admin order detail page should exist", () => {
    const detailPath = path.resolve(
      process.cwd(),
      "src/app/admin/(protected)/orders/[id]/page.tsx",
    );
    expect(fs.existsSync(detailPath)).toBe(true);
  });

  it("admin order detail should reference paypal_order_id", () => {
    const detailPath = path.resolve(
      process.cwd(),
      "src/app/admin/(protected)/orders/[id]/page.tsx",
    );
    const content = fs.readFileSync(detailPath, "utf-8");
    expect(content).toContain("paypal_order_id");
  });
});

// ─── 8.9：英文版結帳頁隱藏貨到付款 ─────────────────────────────────────────

describe("Checkout PayPal / COD rendering logic (8.9)", () => {
  it("should conditionally hide COD for English locale", () => {
    const checkoutPath = path.resolve(
      process.cwd(),
      "src/app/checkout/CheckoutClient.tsx",
    );
    const content = fs.readFileSync(checkoutPath, "utf-8");

    expect(content).toContain('locale !== "en"');
    expect(content).toContain("cod");
  });

  it("should have PayPal payment option with NT$32 minimum", () => {
    const checkoutPath = path.resolve(
      process.cwd(),
      "src/app/checkout/CheckoutClient.tsx",
    );
    const content = fs.readFileSync(checkoutPath, "utf-8");

    expect(content).toContain("paypal");
    expect(content).toContain("32");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 以下需要 mock 的 API 路由測試
// ═════════════════════════════════════════════════════════════════════════════

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

// ─── 8.7：宅配與超商取貨皆可搭配 PayPal ─────────────────────────────────────

describe("PayPal + delivery types (8.7)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://taiwantea.store");
    vi.stubEnv("PAYPAL_CLIENT_ID", "test-id");
    vi.stubEnv("PAYPAL_CLIENT_SECRET", "test-secret");

    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockCreatePayPalOrder.mockResolvedValue({
      paypalOrderId: "PP-1",
      approveUrl: "https://paypal.com/approve/PP-1",
    });
    mockFrom.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should work with home delivery", async () => {
    setupSupabaseMocks();
    const res = await POST(makeRequest(BASE_ORDER_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toContain("paypal.com");
  });

  it("should work with CVS 7-11", async () => {
    setupSupabaseMocks();
    const body = {
      ...BASE_ORDER_BODY,
      deliveryType: "cvs",
      shippingAddress: undefined,
      cvsInfo: { company: "seven", storeId: "S001", storeName: "7-11 信義店" },
      items: [{ productId: 1, quantity: 1 }],
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
  });

  it("should work with CVS Family Mart", async () => {
    setupSupabaseMocks();
    const body = {
      ...BASE_ORDER_BODY,
      deliveryType: "cvs",
      shippingAddress: undefined,
      cvsInfo: { company: "family", storeId: "F001", storeName: "全家信義店" },
      items: [{ productId: 1, quantity: 1 }],
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
  });

  it("should work with CVS Hi-Life", async () => {
    setupSupabaseMocks();
    const body = {
      ...BASE_ORDER_BODY,
      deliveryType: "cvs",
      shippingAddress: undefined,
      cvsInfo: { company: "hilife", storeId: "H001", storeName: "萊爾富信義店" },
      items: [{ productId: 1, quantity: 1 }],
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
  });
});

// ─── 7.13：驗證 create-order 失敗回滾點數 ──────────────────────────────────

describe("create-order rollback points on PayPal failure (7.13)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://taiwantea.store");
    vi.stubEnv("PAYPAL_CLIENT_ID", "test-id");
    vi.stubEnv("PAYPAL_CLIENT_SECRET", "test-secret");

    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockFrom.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should rollback points when PayPal create order fails", async () => {
    const mockPointInsert = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "products") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [TEST_PRODUCT], error: null }),
          }),
        };
      }
      if (table === "orders") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: "order-rollback" }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "coupons") {
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
            eq: vi.fn().mockResolvedValue({ data: [{ points: 500 }], error: null }),
          }),
          insert: mockPointInsert,
        };
      }
      return {};
    });

    mockCreatePayPalOrder.mockRejectedValue(new Error("PayPal timeout"));

    const body = { ...BASE_ORDER_BODY, pointsToUse: 200 };
    const res = await POST(makeRequest(body));

    expect(res.status).toBe(500);

    // point_transactions.insert 被呼叫兩次：
    // 第一次：扣除 (-200, type: "redeem")
    // 第二次：退還 (+200, type: "earn")
    const insertCalls = mockPointInsert.mock.calls;
    expect(insertCalls.length).toBe(2);

    expect(insertCalls[0][0]).toMatchObject({
      points: -200,
      type: "redeem",
    });

    expect(insertCalls[1][0]).toMatchObject({
      points: 200,
      type: "earn",
    });
  });

  it("should rollback coupon when PayPal create order fails", async () => {
    const mockCouponUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "products") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [TEST_PRODUCT], error: null }),
          }),
        };
      }
      if (table === "orders") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: "order-rollback" }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "coupons") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  gt: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: "coupon-1", discount_amount: 100, min_order_amount: 500 },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
          update: mockCouponUpdate,
        };
      }
      if (table === "point_transactions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    mockCreatePayPalOrder.mockRejectedValue(new Error("PayPal network error"));

    const body = { ...BASE_ORDER_BODY, couponCode: "SAVE100" };
    const res = await POST(makeRequest(body));

    expect(res.status).toBe(500);

    // coupons.update 被呼叫兩次：
    // 第一次：標記使用
    // 第二次：回滾 (used_at = null, order_id = null)
    expect(mockCouponUpdate).toHaveBeenCalledTimes(2);
  });

  it("should mark order as failed on PayPal failure", async () => {
    const mockOrderUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "products") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [TEST_PRODUCT], error: null }),
          }),
        };
      }
      if (table === "orders") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: "order-fail" }, error: null }),
            }),
          }),
          update: mockOrderUpdate,
        };
      }
      if (table === "coupons") {
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
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    mockCreatePayPalOrder.mockRejectedValue(new Error("PayPal 503"));

    const res = await POST(makeRequest(BASE_ORDER_BODY));
    expect(res.status).toBe(500);

    expect(mockOrderUpdate).toHaveBeenCalled();
    const updateCall = mockOrderUpdate.mock.calls[0];
    expect(updateCall[0]).toMatchObject({ order_status: "failed" });
  });
});
