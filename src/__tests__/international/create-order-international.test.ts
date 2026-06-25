import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { TEST_USER, TEST_PRODUCT, INTL_ORDER_BODY, INTL_ADDRESS_JP } from "./helpers";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockFrom, mockGetUser, mockCreatePayPalOrder, mockCalcShippingFee } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUser: vi.fn(),
  mockCreatePayPalOrder: vi.fn(),
  mockCalcShippingFee: vi.fn(),
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
vi.mock("@/lib/shipping", () => ({
  calculateShippingFee: (...args: unknown[]) => mockCalcShippingFee(...args),
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
} = {}) {
  const products = overrides.products ?? [TEST_PRODUCT];
  const insertResult = overrides.insertOrder ?? { data: { id: "order-intl" }, error: null };

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
}

// ─── Setup / Teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://taiwantea.store");
  vi.stubEnv("PAYPAL_CLIENT_ID", "test-id");
  vi.stubEnv("PAYPAL_CLIENT_SECRET", "test-secret");

  mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  mockCreatePayPalOrder.mockResolvedValue({
    paypalOrderId: "PAYPAL-INTL-123",
    approveUrl: "https://paypal.com/approve/intl",
  });
  mockCalcShippingFee.mockResolvedValue({ fee: 170, zoneName: "Asia Zone 1", estimatedDays: "7-14", totalWeightG: 400 });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/paypal/create-order — International", () => {
  it("creates international order successfully", async () => {
    setupSupabaseMocks();
    const res = await POST(makeRequest(INTL_ORDER_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://paypal.com/approve/intl");
    expect(json.orderId).toBe("order-intl");
  });

  it("passes shipping address to createPayPalOrder for international", async () => {
    setupSupabaseMocks();
    await POST(makeRequest(INTL_ORDER_BODY));
    expect(mockCreatePayPalOrder).toHaveBeenCalledWith(
      expect.any(Number),
      "order-intl",
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        fullName: "Tanaka Taro",
        addressLine1: "1-2-3 Shibuya",
        city: "Shibuya",
        state: "Tokyo",
        postalCode: "150-0002",
        countryCode: "JP",
      }),
    );
  });

  it("rejects missing country in international address", async () => {
    setupSupabaseMocks();
    const body = {
      ...INTL_ORDER_BODY,
      internationalAddress: { ...INTL_ADDRESS_JP, country: "" },
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("incomplete");
  });

  it("rejects missing addressLine1", async () => {
    setupSupabaseMocks();
    const body = {
      ...INTL_ORDER_BODY,
      internationalAddress: { ...INTL_ADDRESS_JP, addressLine1: "" },
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("rejects missing city in international address", async () => {
    setupSupabaseMocks();
    const body = {
      ...INTL_ORDER_BODY,
      internationalAddress: { ...INTL_ADDRESS_JP, city: "" },
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("rejects missing state in international address", async () => {
    setupSupabaseMocks();
    const body = {
      ...INTL_ORDER_BODY,
      internationalAddress: { ...INTL_ADDRESS_JP, state: "" },
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("rejects missing postalCode in international address", async () => {
    setupSupabaseMocks();
    const body = {
      ...INTL_ORDER_BODY,
      internationalAddress: { ...INTL_ADDRESS_JP, postalCode: "" },
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("rejects overweight international orders", async () => {
    setupSupabaseMocks();
    mockCalcShippingFee.mockRejectedValue(new Error("Exceeds ePacket weight limit"));
    const body = {
      ...INTL_ORDER_BODY,
      items: [{ productId: 1, quantity: 11, spec: "150g" as const }],
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("weight");
  });

  it("calls calculateShippingFee with international params", async () => {
    setupSupabaseMocks();
    await POST(makeRequest(INTL_ORDER_BODY));
    expect(mockCalcShippingFee).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryType: "international",
        countryCode: "JP",
        items: expect.arrayContaining([
          expect.objectContaining({ spec: "150g", quantity: 2 }),
        ]),
      }),
    );
  });

  it("rollback on PayPal creation failure", async () => {
    setupSupabaseMocks();
    mockCreatePayPalOrder.mockRejectedValue(new Error("PayPal API down"));
    const res = await POST(makeRequest(INTL_ORDER_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("PayPal");
  });

  it("accepts deliveryType international", async () => {
    setupSupabaseMocks();
    const res = await POST(makeRequest(INTL_ORDER_BODY));
    expect(res.status).toBe(200);
  });

  it("international order with longer phone number accepted", async () => {
    setupSupabaseMocks();
    const body = {
      ...INTL_ORDER_BODY,
      customer: { ...INTL_ORDER_BODY.customer, phone: "+61-2-9876-5432" },
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
  });

  it("returns intl param in return URL for international deliveryType", async () => {
    setupSupabaseMocks();
    await POST(makeRequest(INTL_ORDER_BODY));
    const callArgs = mockCreatePayPalOrder.mock.calls[0];
    const returnUrl = callArgs[2] as string;
    expect(returnUrl).toContain("intl=1");
  });

  it("does not include intl param for domestic orders", async () => {
    setupSupabaseMocks();
    const domesticBody = {
      customer: { name: "測試", email: "test@example.com", phone: "0912345678" },
      paymentMethod: "paypal" as const,
      deliveryType: "home" as const,
      shippingAddress: { city: "台北市", address: "信義路一段1號" },
      items: [{ productId: 1, quantity: 2, spec: "150g" as const }],
    };
    await POST(makeRequest(domesticBody));
    const callArgs = mockCreatePayPalOrder.mock.calls[0];
    const returnUrl = callArgs[2] as string;
    expect(returnUrl).not.toContain("intl=1");
  });

  it("rejects unauthenticated user", async () => {
    setupSupabaseMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest(INTL_ORDER_BODY));
    expect(res.status).toBe(401);
  });
});
