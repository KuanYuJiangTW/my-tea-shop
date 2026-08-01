import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 訂單取消時的優惠還原（真的打路由，不是對本地變數做算術）
 *
 * 這裡的 Supabase mock 刻意「只回傳 select() 指名的欄位」——因為這兩個 bug
 * 之一就是路由忘了把 points_discount 撈出來。若 mock 無條件回傳整筆訂單，
 * 這類「忘了 select」的錯就測不出來。
 */

type OrderRow = Record<string, unknown>;

let ORDER: OrderRow;
const refundCalls: { points: number; orderId?: string }[] = [];
const couponUpdates: { id: unknown; patch: unknown }[] = [];
const usageDeletes: { column: string; value: unknown }[] = [];
const stockCalls: unknown[] = [];

vi.mock("@/lib/points", () => ({
  refundPoints: (p: { points: number; orderId?: string }) => {
    refundCalls.push(p);
    return Promise.resolve();
  },
  issuePoints: () => Promise.resolve({ points: 0, multiplier: 1 }),
}));

vi.mock("@/lib/email", () => ({
  sendShippingEmail: () => Promise.resolve(),
  sendOrderEmails: () => Promise.resolve(),
}));

vi.mock("@/lib/admin-auth-guard", () => ({
  withAdminAuth: (handler: unknown) => handler,
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u-1" } } }) },
  }),
}));

function makeChain(table: string) {
  const state: { cols: string; eqs: [string, unknown][]; op: string; patch: unknown } = {
    cols: "", eqs: [], op: "", patch: undefined,
  };
  const chain: Record<string, unknown> = {};

  chain.select = (cols?: string) => { state.cols = cols ?? "*"; return chain; };
  chain.update = (patch: unknown) => { state.op = "update"; state.patch = patch; return chain; };
  chain.delete = () => { state.op = "delete"; return chain; };
  chain.eq = (col: string, val: unknown) => {
    state.eqs.push([col, val]);
    if (state.op === "update" && table === "coupons") {
      couponUpdates.push({ id: val, patch: state.patch });
    }
    if (state.op === "delete" && table === "coupon_usages") {
      usageDeletes.push({ column: col, value: val });
    }
    return chain;
  };
  chain.single = async () => {
    if (state.cols === "*") return { data: { ...ORDER }, error: null };
    const picked: OrderRow = {};
    for (const c of state.cols.split(",").map(s => s.trim()).filter(Boolean)) {
      picked[c] = ORDER[c];
    }
    return { data: picked, error: null };
  };
  // `await supabase.from(x).update(y).eq(...)` 直接 await chain
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null });
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (t: string) => makeChain(t),
    rpc: (name: string, args: unknown) => {
      stockCalls.push({ name, args });
      return Promise.resolve({ data: true, error: null });
    },
  },
}));

function resetAll(order: Partial<OrderRow> = {}) {
  refundCalls.length = 0;
  couponUpdates.length = 0;
  usageDeletes.length = 0;
  stockCalls.length = 0;
  ORDER = {
    id: "o-1",
    user_id: "u-1",
    order_status: "new",
    coupon_id: null,
    points_used: 500,
    points_discount: 500,
    coupon_discount: 0,
    subtotal: 2000,
    shipping_fee: 0,
    discount_amount: 500,
    items: [],
    payment_method: "cod",
    payment_status: "pending",
    ...order,
  };
}

// ─── 會員自助取消 ────────────────────────────────────────────────────────────

describe("會員自助取消訂單 POST /api/orders/[id]/cancel", () => {
  beforeEach(() => resetAll());

  async function cancel() {
    const { POST } = await import("@/app/api/orders/[id]/cancel/route");
    return POST(
      new NextRequest("http://localhost/api/orders/o-1/cancel", { method: "POST" }),
      { params: Promise.resolve({ id: "o-1" }) },
    );
  }

  it("退還的點數等於下單時扣除的 points_used，不是它的 1%", async () => {
    const res = await cancel();
    expect(res.status).toBe(200);
    expect(refundCalls).toHaveLength(1);
    // 回歸：路由曾因未 select points_discount 而落到舊制 fallback，只退 floor(500/100)=5
    expect(refundCalls[0].points).toBe(500);
    expect(refundCalls[0].orderId).toBe("o-1");
  });

  it("通用碼：依 order_id 刪除 coupon_usages", async () => {
    // 通用碼的訂單，coupon_id 存的是 coupon_templates.id
    resetAll({ coupon_id: "tmpl-1" });
    const res = await cancel();
    expect(res.status).toBe(200);
    // 回歸：原本完全沒有刪 coupon_usages，那組碼會永久吃掉使用者的額度
    expect(usageDeletes).toEqual([{ column: "order_id", value: "o-1" }]);
  });

  it("沒有折價券時仍會清 coupon_usages（不必先知道券的種類）", async () => {
    const res = await cancel();
    expect(res.status).toBe(200);
    expect(usageDeletes).toEqual([{ column: "order_id", value: "o-1" }]);
  });

  it("批次券：還原 used_at 與 order_id", async () => {
    resetAll({ coupon_id: "coupon-1" });
    await cancel();
    expect(couponUpdates).toEqual([
      { id: "coupon-1", patch: { used_at: null, order_id: null } },
    ]);
  });

  it("points_used 與 points_discount 不一致時，退的是 points_used（扣了幾點就退幾點）", async () => {
    // 新制 1:1 下兩者相等，測不出差別；這裡用舊制形狀的資料釘住語意，
    // 免得日後有人把它改回 points_discount（那是折抵金額，不是點數）
    resetAll({ points_used: 50000, points_discount: 500 });
    await cancel();
    expect(refundCalls[0].points).toBe(50000);
  });

  it("沒用點數的訂單不產生退點記錄", async () => {
    resetAll({ points_used: 0, points_discount: 0 });
    await cancel();
    expect(refundCalls).toHaveLength(0);
  });

  it("已出貨的訂單不能取消，且不還原任何優惠", async () => {
    resetAll({ order_status: "shipped" });
    const res = await cancel();
    expect(res.status).toBe(400);
    expect(refundCalls).toHaveLength(0);
    expect(usageDeletes).toHaveLength(0);
    expect(couponUpdates).toHaveLength(0);
  });

  it("不是本人的訂單回 403，且不還原任何優惠", async () => {
    resetAll({ user_id: "someone-else" });
    const res = await cancel();
    expect(res.status).toBe(403);
    expect(refundCalls).toHaveLength(0);
    expect(usageDeletes).toHaveLength(0);
  });
});

// ─── 後台取消 ────────────────────────────────────────────────────────────────

describe("後台取消訂單 PATCH /api/admin/orders/[id]", () => {
  beforeEach(() => resetAll());

  async function adminCancel(orderStatus = "cancelled") {
    const { PATCH } = await import("@/app/api/admin/orders/[id]/route");
    return (PATCH as unknown as (r: NextRequest, c: unknown) => Promise<Response>)(
      new NextRequest("http://localhost/api/admin/orders/o-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus }),
      }),
      { params: Promise.resolve({ id: "o-1" }) },
    );
  }

  it("退還全額 points_used", async () => {
    await adminCancel();
    expect(refundCalls).toHaveLength(1);
    expect(refundCalls[0].points).toBe(500);
  });

  it("points_used 與 points_discount 不一致時，退的是 points_used", async () => {
    resetAll({ points_used: 50000, points_discount: 500 });
    await adminCancel();
    expect(refundCalls[0].points).toBe(50000);
  });

  it("通用碼：依 order_id 刪除 coupon_usages", async () => {
    resetAll({ coupon_id: "tmpl-1" });
    await adminCancel();
    // 回歸：後台取消原本也只還原批次券，通用碼記錄留著
    expect(usageDeletes).toEqual([{ column: "order_id", value: "o-1" }]);
  });

  it("已經是 cancelled 的訂單再次送出不會重複退點", async () => {
    resetAll({ order_status: "cancelled" });
    await adminCancel();
    expect(refundCalls).toHaveLength(0);
    expect(usageDeletes).toHaveLength(0);
  });
});
