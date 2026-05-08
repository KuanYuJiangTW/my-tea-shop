import { vi } from "vitest";

// ─── Supabase mock builder ──────────────────────────────────────────────────

type ChainResult = { data: unknown; error: unknown };

export function mockSupabaseChain(result: ChainResult) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const terminal = vi.fn().mockResolvedValue(result);

  // Every chained method returns the same proxy so order doesn't matter
  const proxy: Record<string, unknown> = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === "then") return undefined; // not a thenable
        if (["single", "maybeSingle"].includes(prop)) return terminal;
        if (!chain[prop]) chain[prop] = vi.fn().mockReturnValue(proxy);
        return chain[prop];
      },
    },
  );

  return { proxy, terminal, chain };
}

// ─── Fake Next.js Request ───────────────────────────────────────────────────

export function createMockRequest(
  body: unknown,
  options: { origin?: string; forwardedFor?: string } = {},
) {
  const headers = new Headers({
    "Content-Type": "application/json",
    ...(options.origin ? { origin: options.origin } : {}),
    ...(options.forwardedFor ? { "x-forwarded-for": options.forwardedFor } : {}),
  });

  return {
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    headers: {
      get: (key: string) => headers.get(key),
    },
  } as unknown;
}

// ─── Common test data ───────────────────────────────────────────────────────

export const TEST_USER = { id: "user-123", email: "test@example.com" };

export const TEST_PRODUCT = {
  id: 1,
  name: "高山烏龍茶",
  name_en: "High Mountain Oolong",
  price: 600,
  price_75g: 350,
  price_tea_bag: 280,
  stock_quantity: 50,
  stock_75g: 30,
  stock_tea_bag: 40,
};

export const BASE_ORDER_BODY = {
  customer: { name: "測試用戶", email: "test@example.com", phone: "0912345678" },
  paymentMethod: "paypal" as const,
  deliveryType: "home" as const,
  shippingAddress: { city: "台北市", address: "信義路一段1號" },
  items: [{ productId: 1, quantity: 2, spec: "150g" as const }],
};

export const DB_ORDER = {
  id: "order-abc",
  customer_name: "測試用戶",
  customer_email: "test@example.com",
  customer_phone: "0912345678",
  payment_method: "paypal",
  payment_status: "pending",
  order_status: "new",
  shipping_address: { type: "home", city: "台北市", address: "信義路一段1號" },
  items: [{ productId: 1, name: "高山烏龍茶", quantity: 2, unitPrice: 600, subtotal: 1200, spec: "150g" }],
  shipping_fee: 0,
  total_amount: 1200,
  user_id: "user-123",
  note: null,
};
