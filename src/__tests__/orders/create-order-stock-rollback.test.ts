import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 貨到付款（POST /api/orders）扣庫存失敗時的回補
 *
 * 缺陷：這條路徑在**建立訂單之前**扣庫存（為了防超賣，方向是對的），
 * 但 `Promise.all` 平行扣減時任一項失敗就直接回 400、訂單 insert 失敗就回 500，
 * **兩種情況都沒有把已經扣掉的庫存補回去** → 庫存被扣掉但訂單不存在。
 *
 * 三條線上金流路徑（ecpay/return、stripe/webhook、paypal capture）不在此列：
 * 它們是付款成功後才扣，扣失敗時已無法回滾付款，所以標記 `order_status = "stock_issue"`
 * 交人工處理——那是對的設計，本測試不涵蓋。
 */

const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
/** 依序決定每次 decrement_stock 的回傳；用完後一律成功 */
let DECREMENT_RESULTS: { data: boolean; error: unknown }[] = [];
let ORDER_INSERT_ERROR: unknown = null;

vi.mock("@/lib/coupons", () => ({
  resolveCouponCode: () => Promise.resolve({ valid: false, error: "無此券" }),
  recordCouponUsage: () => Promise.resolve(),
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
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u-1", email: "a@b.com" } } }) },
  }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], setAll: () => {} }) }));

const PRODUCTS = [
  { id: 1, name: "阿里山高山烏龍", price: 400, price_75g: 240, price_tea_bag: 250,
    stock_quantity: 50, stock_75g: 50, stock_tea_bag: 8 },
  { id: 2, name: "蜜香紅茶", price: 400, price_75g: 240, price_tea_bag: 250,
    stock_quantity: 51, stock_75g: 53, stock_tea_bag: 8 },
];

function chain(table: string) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  c.select = self; c.eq = self; c.is = self; c.gt = self;
  c.in = () => Promise.resolve({ data: PRODUCTS, error: null });
  c.update = self;
  c.insert = self;
  c.single = async () =>
    table === "orders" && ORDER_INSERT_ERROR
      ? { data: null, error: ORDER_INSERT_ERROR }
      : { data: { id: "order-1" }, error: null };
  c.then = (r: (v: unknown) => unknown) => r({ data: null, error: null });
  return c;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (t: string) => chain(t),
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      if (fn === "decrement_stock") {
        const next = DECREMENT_RESULTS.shift();
        return Promise.resolve(next ?? { data: true, error: null });
      }
      return Promise.resolve({ data: true, error: null });
    },
  },
}));

/** 兩個品項的訂單：品項 1 是烏龍 150g、品項 2 是蜜香紅茶 150g */
function makeReq() {
  return new NextRequest("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: { name: "測試客戶", phone: "0912345678", email: "a@b.com" },
      paymentMethod: "cod",
      deliveryType: "home",
      shippingAddress: { city: "嘉義縣", address: "梅山鄉太和村1號" },
      items: [
        { productId: 1, quantity: 1, spec: "150g" },
        { productId: 2, quantity: 2, spec: "150g" },
      ],
    }),
  });
}

async function post() {
  const { POST } = await import("@/app/api/orders/route");
  return POST(makeReq());
}

const decrements = () => rpcCalls.filter((c) => c.fn === "decrement_stock");
const increments = () => rpcCalls.filter((c) => c.fn === "increment_stock");

beforeEach(() => {
  rpcCalls.length = 0;
  DECREMENT_RESULTS = [];
  ORDER_INSERT_ERROR = null;
});

describe("POST /api/orders 扣庫存失敗時的回補", () => {
  it("其中一項扣減失敗 → 已扣掉的那項要補回去，且不建立訂單", async () => {
    // 第一項成功、第二項庫存不足
    DECREMENT_RESULTS = [
      { data: true, error: null },
      { data: false, error: null },
    ];

    const res = await post();
    expect(res.status).toBe(400);

    // 兩項都嘗試過扣減
    expect(decrements()).toHaveLength(2);

    // 成功的那一項必須補回來；失敗的那項沒扣成功，不該補
    expect(increments()).toHaveLength(1);
    expect(increments()[0].args).toMatchObject({ p_id: 1, qty: 1, spec: "150g" });
  });

  it("扣減全成功但訂單寫入失敗 → 兩項都要補回去", async () => {
    ORDER_INSERT_ERROR = { message: "insert failed" };

    const res = await post();
    expect(res.status).toBe(500);

    expect(decrements()).toHaveLength(2);
    expect(increments()).toHaveLength(2);
    expect(increments().map((c) => c.args)).toEqual([
      expect.objectContaining({ p_id: 1, qty: 1, spec: "150g" }),
      expect.objectContaining({ p_id: 2, qty: 2, spec: "150g" }),
    ]);
  });

  it("一切正常時不呼叫 increment_stock", async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(decrements()).toHaveLength(2);
    expect(increments()).toHaveLength(0);
  });
});
