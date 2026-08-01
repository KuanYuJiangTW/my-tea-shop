import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 訂單取消時的優惠還原（真的打路由，不是對本地變數做算術）
 *
 * 兩個刻意的設計：
 *  1. Supabase mock 只回傳 `select()` 指名的欄位——這兩個 bug 之一就是路由忘了
 *     把 points_discount 撈出來。若 mock 無條件回傳整筆訂單，這類錯就測不出來。
 *  2. 不 mock `@/lib/points`——讓真正的 refundOrderPoints 對 mock 的
 *     point_transactions 跑，測到的才是實際的退點邏輯（以帳本為準、冪等）。
 */

type Row = Record<string, unknown>;

let ORDER: Row;
let LEDGER: { points: number; type: string; order_id: string }[];
const pointInserts: Row[] = [];
const couponUpdates: { id: unknown; patch: unknown }[] = [];
const usageDeletes: { column: string; value: unknown }[] = [];

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
  const st = { cols: "", op: "", patch: undefined as unknown, eqs: [] as [string, unknown][] };
  const chain: Record<string, unknown> = {};

  chain.select = (cols?: string) => { st.cols = cols ?? "*"; return chain; };
  chain.update = (patch: unknown) => { st.op = "update"; st.patch = patch; return chain; };
  chain.delete = () => { st.op = "delete"; return chain; };
  chain.insert = (row: Row) => {
    if (table === "point_transactions") {
      pointInserts.push(row);
      LEDGER.push({
        points: row.points as number,
        type: row.type as string,
        order_id: row.order_id as string,
      });
    }
    return Promise.resolve({ error: null });
  };
  chain.eq = (col: string, val: unknown) => {
    st.eqs.push([col, val]);
    if (st.op === "update" && table === "coupons") couponUpdates.push({ id: val, patch: st.patch });
    if (st.op === "delete" && table === "coupon_usages") usageDeletes.push({ column: col, value: val });
    return chain;
  };
  chain.single = async () => {
    if (st.cols === "*") return { data: { ...ORDER }, error: null };
    const picked: Row = {};
    for (const c of st.cols.split(",").map(s => s.trim()).filter(Boolean)) picked[c] = ORDER[c];
    return { data: picked, error: null };
  };
  // 直接 await chain 的情況（select 後不接 single、或 update/delete）
  chain.then = (resolve: (v: unknown) => unknown) => {
    if (table === "point_transactions" && st.op === "") {
      const orderId = st.eqs.find(([c]) => c === "order_id")?.[1];
      return resolve({ data: LEDGER.filter(r => r.order_id === orderId), error: null });
    }
    return resolve({ data: null, error: null });
  };
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (t: string) => makeChain(t),
    rpc: () => Promise.resolve({ data: true, error: null }),
  },
}));

function reset(order: Partial<Row> = {}, ledger?: typeof LEDGER) {
  pointInserts.length = 0;
  couponUpdates.length = 0;
  usageDeletes.length = 0;
  ORDER = {
    id: "o-1", user_id: "u-1", order_status: "new", coupon_id: null,
    points_used: 500, points_discount: 500, coupon_discount: 0,
    subtotal: 2000, shipping_fee: 0, discount_amount: 500,
    items: [], payment_method: "cod", payment_status: "pending",
    ...order,
  };
  LEDGER = ledger ?? [{ points: -500, type: "redeem", order_id: "o-1" }];
}

const refunds = () => pointInserts.filter(r => r.type === "refund");

// ─── 會員自助取消 ────────────────────────────────────────────────────────────

describe("會員自助取消訂單 POST /api/orders/[id]/cancel", () => {
  beforeEach(() => reset());

  async function cancel() {
    const { POST } = await import("@/app/api/orders/[id]/cancel/route");
    return POST(
      new NextRequest("http://localhost/api/orders/o-1/cancel", { method: "POST" }),
      { params: Promise.resolve({ id: "o-1" }) },
    );
  }

  it("退還帳本上實際扣除的點數，不是它的 1%", async () => {
    const res = await cancel();
    expect(res.status).toBe(200);
    // 回歸：路由曾因未 select points_discount 而落到舊制 fallback，只退 floor(500/100)=5
    expect(refunds()).toHaveLength(1);
    expect(refunds()[0].points).toBe(500);
    expect(refunds()[0].order_id).toBe("o-1");
  });

  it("舊制訂單：退帳本的實扣量，不看 orders.points_used", async () => {
    // 線上實際存在的形狀（2026-05-07 那批）：points_used 3300、points_discount 33，
    // 但帳本只扣了 33。照 points_used 退會憑空送出 3267 點
    reset(
      { points_used: 3300, points_discount: 33 },
      [{ points: -33, type: "redeem", order_id: "o-1" }],
    );
    await cancel();
    expect(refunds()[0].points).toBe(33);
  });

  it("已部分退還過的訂單只補差額（冪等）", async () => {
    reset({}, [
      { points: -500, type: "redeem", order_id: "o-1" },
      { points: 5, type: "refund", order_id: "o-1" },   // 舊 bug 退的那 5 點
    ]);
    await cancel();
    expect(refunds()).toHaveLength(1);
    expect(refunds()[0].points).toBe(495);
  });

  it("已全額退還過的訂單不再重複退", async () => {
    reset({}, [
      { points: -500, type: "redeem", order_id: "o-1" },
      { points: 500, type: "refund", order_id: "o-1" },
    ]);
    await cancel();
    expect(refunds()).toHaveLength(0);
  });

  it("通用碼：依 order_id 刪除 coupon_usages", async () => {
    reset({ coupon_id: "tmpl-1" });
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
    reset({ coupon_id: "coupon-1" });
    await cancel();
    expect(couponUpdates).toEqual([{ id: "coupon-1", patch: { used_at: null, order_id: null } }]);
  });

  it("沒用點數的訂單不產生退點記錄", async () => {
    reset({ points_used: 0, points_discount: 0 }, []);
    await cancel();
    expect(refunds()).toHaveLength(0);
  });

  it("已出貨的訂單不能取消，且不還原任何優惠", async () => {
    reset({ order_status: "shipped" });
    const res = await cancel();
    expect(res.status).toBe(400);
    expect(refunds()).toHaveLength(0);
    expect(usageDeletes).toHaveLength(0);
    expect(couponUpdates).toHaveLength(0);
  });

  it("不是本人的訂單回 403，且不還原任何優惠", async () => {
    reset({ user_id: "someone-else" });
    const res = await cancel();
    expect(res.status).toBe(403);
    expect(refunds()).toHaveLength(0);
    expect(usageDeletes).toHaveLength(0);
  });
});

// ─── 後台取消 ────────────────────────────────────────────────────────────────

describe("後台取消訂單 PATCH /api/admin/orders/[id]", () => {
  beforeEach(() => reset());

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

  it("退還帳本上實際扣除的點數", async () => {
    await adminCancel();
    expect(refunds()).toHaveLength(1);
    expect(refunds()[0].points).toBe(500);
  });

  it("舊制訂單：退帳本的實扣量，不看 orders.points_used", async () => {
    reset(
      { points_used: 3300, points_discount: 33 },
      [{ points: -33, type: "redeem", order_id: "o-1" }],
    );
    await adminCancel();
    expect(refunds()[0].points).toBe(33);
  });

  it("通用碼：依 order_id 刪除 coupon_usages", async () => {
    reset({ coupon_id: "tmpl-1" });
    await adminCancel();
    // 回歸：後台取消原本也只還原批次券，通用碼記錄留著
    expect(usageDeletes).toEqual([{ column: "order_id", value: "o-1" }]);
  });

  it("已經是 cancelled 的訂單再次送出不會重複退點", async () => {
    reset({ order_status: "cancelled" });
    await adminCancel();
    expect(refunds()).toHaveLength(0);
    expect(usageDeletes).toHaveLength(0);
  });
});
