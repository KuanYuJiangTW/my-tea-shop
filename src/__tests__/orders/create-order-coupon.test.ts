import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 貨到付款（POST /api/orders）的折價券接線
 *
 * 回歸：這條路徑原本直接查 coupons 表，沒經過 resolveCouponCode，
 * 所以貨到付款的客人輸入通用碼一律被判「折價券無效或已使用」。
 * 這裡測的是「接線」——resolveCouponCode / recordCouponUsage 有沒有被正確呼叫，
 * 券本身的解析規則已由 coupons 的既有測試覆蓋。
 */

const resolveCalls: unknown[] = [];
const usageCalls: unknown[] = [];
const couponUpdates: unknown[] = [];
let RESOLVE_RESULT: unknown;

vi.mock("@/lib/coupons", () => ({
  resolveCouponCode: (userId: string, code: string) => {
    resolveCalls.push({ userId, code });
    return Promise.resolve(RESOLVE_RESULT);
  },
  recordCouponUsage: (p: unknown) => { usageCalls.push(p); return Promise.resolve(); },
}));

vi.mock("@/lib/points", () => ({
  validateRedemption: () => Promise.resolve({ valid: true, pointsUsed: 0, pointsDiscount: 0 }),
  deductPoints: () => Promise.resolve(),
}));

vi.mock("@/lib/email", () => ({ sendOrderEmails: () => Promise.resolve() }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: async () => true,
  getClientIp: () => "127.0.0.1",
}));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u-1", email: "a@b.com" } } }) },
  }),
}));

const PRODUCTS = [{
  id: 1, name: "阿里山高山烏龍", price: 1200,
  price_75g: 700, price_tea_bag: 300,
  stock_quantity: 50, stock_75g: 50, stock_tea_bag: 50,
}];

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u-1", email: "a@b.com" } } }) },
  }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], setAll: () => {} }) }));

function chain(table: string) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  c.select = self; c.eq = self; c.is = self; c.gt = self; c.in = () =>
    Promise.resolve({ data: PRODUCTS, error: null });
  c.update = (patch: unknown) => { if (table === "coupons") couponUpdates.push(patch); return c; };
  c.insert = () => c;
  c.single = async () => ({ data: { id: "order-1" }, error: null });
  c.then = (r: (v: unknown) => unknown) => r({ data: null, error: null });
  return c;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (t: string) => chain(t),
    rpc: () => Promise.resolve({ data: true, error: null }),
  },
}));

function makeReq(couponCode?: string) {
  return new NextRequest("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: { name: "測試客戶", phone: "0912345678", email: "a@b.com" },
      paymentMethod: "cod",
      deliveryType: "home",
      shippingAddress: { city: "嘉義縣", address: "梅山鄉太和村1號" },
      items: [{ productId: 1, quantity: 1, spec: "150g" }],
      couponCode,
    }),
  });
}

async function post(couponCode?: string) {
  const { POST } = await import("@/app/api/orders/route");
  return POST(makeReq(couponCode));
}

beforeEach(() => {
  resolveCalls.length = 0;
  usageCalls.length = 0;
  couponUpdates.length = 0;
  RESOLVE_RESULT = { valid: true, coupon: { type: "universal", id: "tmpl-1", template_id: "tmpl-1", discount_amount: 100, min_order_amount: 0 } };
});

describe("POST /api/orders 折價券（貨到付款）", () => {
  it("通用碼：經 resolveCouponCode 驗證並記入 coupon_usages", async () => {
    const res = await post("SUMMER100");
    expect(res.status).toBe(200);
    // 回歸：原本直接查 coupons 表，通用碼一律被判無效
    expect(resolveCalls).toEqual([{ userId: "u-1", code: "SUMMER100" }]);
    expect(usageCalls).toEqual([{ templateId: "tmpl-1", userId: "u-1", orderId: "order-1" }]);
    expect(couponUpdates).toHaveLength(0);
  });

  it("批次券：寫回 coupons，不記 coupon_usages", async () => {
    RESOLVE_RESULT = { valid: true, coupon: { type: "batch", id: "coupon-1", discount_amount: 100, min_order_amount: 0 } };
    const res = await post("PERSONAL1");
    expect(res.status).toBe(200);
    expect(usageCalls).toHaveLength(0);
    expect(couponUpdates).toHaveLength(1);
    expect(couponUpdates[0]).toMatchObject({ order_id: "order-1" });
  });

  it("無效折價碼：回傳 resolveCouponCode 給的錯誤訊息", async () => {
    RESOLVE_RESULT = { valid: false, error: "折價券無效或已過期" };
    const res = await post("BOGUS");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("折價券無效或已過期");
  });

  it("未達最低消費：擋下並告知金額", async () => {
    RESOLVE_RESULT = { valid: true, coupon: { type: "universal", id: "tmpl-1", discount_amount: 100, min_order_amount: 99999 } };
    const res = await post("BIGSPEND");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("99999");
    expect(usageCalls).toHaveLength(0);
  });

  it("沒帶折價碼時完全不碰折價券邏輯", async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(resolveCalls).toHaveLength(0);
    expect(usageCalls).toHaveLength(0);
  });
});
