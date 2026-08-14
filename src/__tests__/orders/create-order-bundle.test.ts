import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { splitOrderItems, isBundleOrderItem } from "@/lib/order-bundles";

/**
 * 貨到付款（POST /api/orders）的組合品項。
 *
 * 重點在三件事：
 *   1. 單價取 `product_bundles.price`，**不由成分售價加總推導**（650 vs 單買 700）
 *   2. 扣減走 `decrement_bundle_stock`（單一交易），不是對成分各扣一次
 *   3. 組合扣減失敗時，**已扣掉的單品要回補**——否則就是換一種方式製造
 *      「庫存被扣但訂單不存在」
 */

const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
let BUNDLE_RPC_ERROR: { message: string } | null = null;
let insertedItems: unknown = null;

vi.mock("@/lib/coupons", () => ({
  resolveCouponCode: () => Promise.resolve({ valid: false, error: "無此券" }),
  recordCouponUsage: () => Promise.resolve(),
}));
vi.mock("@/lib/points", () => ({
  validateRedemption: () => Promise.resolve({ valid: true, pointsUsed: 0, pointsDiscount: 0 }),
  deductPoints: () => Promise.resolve(),
}));
vi.mock("@/lib/email", () => ({ sendOrderEmails: () => Promise.resolve() }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true, getClientIp: () => "127.0.0.1" }));
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
  { id: 1, name: "阿里山高山烏龍茶", price: 400, price_75g: 240, price_tea_bag: 250,
    stock_quantity: 50, stock_75g: 50, stock_tea_bag: 8 },
];

/** 正式站的品飲組：三款各 75g × 1，定價 650（單買合計 700） */
const BUNDLE_ROW = {
  id: 1, slug: "tasting-set", name: "品飲組", name_en: "Tasting Set",
  description: "", description_en: "", price: 650,
  product_bundle_items: [
    { product_id: 1, spec: "75g", quantity: 1,
      products: { name: "阿里山高山烏龍茶", name_en: "Oolong", stock_quantity: 50, stock_75g: 50, stock_tea_bag: 8 } },
    { product_id: 2, spec: "75g", quantity: 1,
      products: { name: "蜜香紅茶", name_en: "Honey Black", stock_quantity: 51, stock_75g: 53, stock_tea_bag: 8 } },
    { product_id: 3, spec: "75g", quantity: 1,
      products: { name: "阿里山金萱茶", name_en: "Jin Xuan", stock_quantity: 50, stock_75g: 48, stock_tea_bag: 7 } },
  ],
};

function chain(table: string) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  c.select = self; c.eq = self; c.is = self; c.gt = self; c.in = self; c.update = self; c.insert = self;
  c.single = async () => {
    if (table === "orders") return { data: { id: "order-1" }, error: null };
    return { data: null, error: null };
  };
  // 走到 await 時依表別回資料
  c.then = (r: (v: unknown) => unknown) => {
    if (table === "products") return r({ data: PRODUCTS, error: null });
    if (table === "product_bundles") return r({ data: [BUNDLE_ROW], error: null });
    return r({ data: null, error: null });
  };
  return c;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (t: string) => {
      const c = chain(t);
      if (t === "orders") {
        const orig = c.insert as () => unknown;
        c.insert = (payload: { items: unknown }) => { insertedItems = payload.items; return orig(); };
      }
      return c;
    },
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      if (fn === "decrement_bundle_stock") {
        return Promise.resolve({ data: BUNDLE_RPC_ERROR ? null : true, error: BUNDLE_RPC_ERROR });
      }
      return Promise.resolve({ data: true, error: null });
    },
  },
}));

function makeReq(items: unknown[]) {
  return new NextRequest("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: { name: "測試客戶", phone: "0912345678", email: "a@b.com" },
      paymentMethod: "cod",
      deliveryType: "home",
      shippingAddress: { city: "嘉義縣", address: "梅山鄉太和村1號" },
      items,
    }),
  });
}

async function post(items: unknown[]) {
  const { POST } = await import("@/app/api/orders/route");
  return POST(makeReq(items));
}

const call = (fn: string) => rpcCalls.filter((c) => c.fn === fn);

beforeEach(() => {
  rpcCalls.length = 0;
  BUNDLE_RPC_ERROR = null;
  insertedItems = null;
});

describe("POST /api/orders 組合品項", () => {
  it("只含組合：走 decrement_bundle_stock，不對成分逐一扣", async () => {
    const res = await post([{ bundleId: 1, quantity: 1 }]);
    expect(res.status).toBe(200);

    expect(call("decrement_bundle_stock")).toHaveLength(1);
    expect(call("decrement_bundle_stock")[0].args).toEqual({ p_bundle_id: 1, p_qty: 1 });
    // 成分不該被逐一扣——那樣就沒有原子性了
    expect(call("decrement_stock")).toHaveLength(0);
  });

  it("單價取組合定價 650，不是成分加總的 700", async () => {
    await post([{ bundleId: 1, quantity: 2 }]);
    const items = insertedItems as { unitPrice: number; subtotal: number }[];
    const bundle = items.find((i) => isBundleOrderItem(i))!;
    expect(bundle.unitPrice).toBe(650);
    expect(bundle.subtotal).toBe(1300);
  });

  it("orders.items 帶成分快照，取消時才有依據可補", async () => {
    await post([{ bundleId: 1, quantity: 1 }]);
    const items = insertedItems as Record<string, unknown>[];
    const bundle = items.find((i) => isBundleOrderItem(i)) as {
      bundleItems: { productId: number; spec: string; quantity: number }[];
    };
    expect(bundle.bundleItems).toHaveLength(3);
    expect(bundle.bundleItems).toEqual([
      expect.objectContaining({ productId: 1, spec: "75g", quantity: 1 }),
      expect.objectContaining({ productId: 2, spec: "75g", quantity: 1 }),
      expect.objectContaining({ productId: 3, spec: "75g", quantity: 1 }),
    ]);
  });

  it("混合單品與組合：兩種扣減各走各的", async () => {
    const res = await post([
      { productId: 1, quantity: 1, spec: "150g" },
      { bundleId: 1, quantity: 1 },
    ]);
    expect(res.status).toBe(200);
    expect(call("decrement_stock")).toHaveLength(1);
    expect(call("decrement_stock")[0].args).toMatchObject({ p_id: 1, spec: "150g" });
    expect(call("decrement_bundle_stock")).toHaveLength(1);

    // 小計 = 單品 400 + 組合 650
    const items = insertedItems as { subtotal: number }[];
    expect(items.reduce((s, i) => s + i.subtotal, 0)).toBe(1050);
  });

  it("組合扣減失敗 → 已扣的單品要回補，且不建立訂單", async () => {
    BUNDLE_RPC_ERROR = { message: "庫存不足：阿里山金萱茶 （75g）" };

    const res = await post([
      { productId: 1, quantity: 1, spec: "150g" },
      { bundleId: 1, quantity: 1 },
    ]);
    expect(res.status).toBe(400);
    // 錯誤訊息要指出是哪一款成分
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("阿里山金萱茶") });

    expect(call("increment_stock")).toHaveLength(1);
    expect(call("increment_stock")[0].args).toMatchObject({ p_id: 1, qty: 1, spec: "150g" });
  });
});

describe("splitOrderItems", () => {
  it("依 bundleId 有沒有值分流", () => {
    const r = splitOrderItems([
      { productId: 1, quantity: 2, spec: "75g" },
      { bundleId: 5, quantity: 1 },
      { productId: 3, quantity: 1 },
    ]);
    expect(r.productItems).toEqual([
      { productId: 1, quantity: 2, spec: "75g" },
      { productId: 3, quantity: 1, spec: undefined },
    ]);
    expect(r.bundleItems).toEqual([{ bundleId: 5, quantity: 1 }]);
  });
});

describe("isBundleOrderItem", () => {
  it("只有同時具備 bundleId 與 bundleItems 才算組合", () => {
    expect(isBundleOrderItem({ bundleId: 1, bundleItems: [] })).toBe(true);
    expect(isBundleOrderItem({ productId: 1, spec: "150g" })).toBe(false);
    expect(isBundleOrderItem({ bundleId: 1 })).toBe(false);
    expect(isBundleOrderItem(null)).toBe(false);
  });
});
