import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 體驗預約的結帳扣點與取消退點（真的打路由）
 *
 * 沿用 orders/cancel-order.test.ts 的兩個設計，理由相同：
 *  1. Supabase mock 只回傳 select() 指名的欄位，「忘了 select」這類錯才會變紅。
 *  2. 不 mock @/lib/points——讓真正的 refundBookingPoints 對 mock 的
 *     point_transactions 跑，測到的才是實際的退點邏輯（以帳本為準、冪等）。
 */

type Row = Record<string, unknown>;
type Tx = { points: number; type: string; description?: string; booking_id?: string; order_id?: string };

let BOOKING: Row;
let LEDGER: Tx[];
const pointInserts: Row[] = [];
const bookingUpdates: Row[] = [];

vi.mock("@/lib/email", () => ({
  sendBookingCancelEmail: () => Promise.resolve(),
}));

vi.mock("@/lib/waitlist", () => ({
  notifyNextWaitlist: () => Promise.resolve(),
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
  const st = {
    cols: "", op: "", head: false, patch: undefined as unknown,
    eqs: [] as [string, unknown][], or: "", gt: 0, lt: 0,
  };
  const chain: Record<string, unknown> = {};

  chain.select = (cols?: string, opts?: { head?: boolean }) => {
    st.cols = cols ?? "*";
    if (opts?.head) st.head = true;
    return chain;
  };
  chain.update = (patch: Row) => {
    st.op = "update";
    st.patch = patch;
    if (table === "experience_bookings") bookingUpdates.push(patch);
    return chain;
  };
  chain.insert = (row: Row) => {
    if (table === "point_transactions") {
      pointInserts.push(row);
      LEDGER.push({
        points: row.points as number,
        type: row.type as string,
        description: row.description as string,
        booking_id: (row.booking_id ?? undefined) as string | undefined,
        order_id: (row.order_id ?? undefined) as string | undefined,
      });
    }
    return Promise.resolve({ error: null });
  };
  chain.eq = (col: string, val: unknown) => { st.eqs.push([col, val]); return chain; };
  chain.or = (expr: string) => { st.or = expr; return chain; };
  chain.gt = (_c: string, v: number) => { st.gt = v; return chain; };
  chain.lt = (_c: string, v: number) => { st.lt = v; return chain; };

  chain.single = async () => {
    if (table === "user_membership") return { data: null, error: null };
    if (table !== "experience_bookings") return { data: null, error: null };
    const userEq = st.eqs.find(([c]) => c === "user_id");
    if (userEq && userEq[1] !== BOOKING.user_id) return { data: null, error: { message: "not found" } };
    const statusEq = st.eqs.find(([c]) => c === "status");
    if (statusEq && statusEq[1] !== BOOKING.status) return { data: null, error: { message: "not found" } };
    if (st.cols.includes("*")) return { data: { ...BOOKING }, error: null };
    const picked: Row = {};
    for (const c of st.cols.split(",").map(s => s.trim()).filter(Boolean)) picked[c] = BOOKING[c];
    return { data: picked, error: null };
  };
  chain.maybeSingle = chain.single;

  chain.then = (resolve: (v: unknown) => unknown) => {
    if (table !== "point_transactions") return resolve({ data: null, error: null });

    // 退點查詢：.or("booking_id.eq.X,order_id.eq.X")
    if (st.or.includes("booking_id.eq.")) {
      const id = st.or.split("booking_id.eq.")[1].split(",")[0];
      return resolve({
        data: LEDGER.filter(r => r.booking_id === id || r.order_id === id),
        error: null,
      });
    }
    // 餘額查詢：getValidBalance 依正負分兩次查
    if (st.eqs.some(([c]) => c === "user_id") && !st.head) {
      if (st.gt === 0 && st.lt === 0) return resolve({ data: LEDGER, error: null });
      const rows = st.lt === 0 ? LEDGER.filter(r => r.points > 0) : LEDGER.filter(r => r.points < 0);
      return resolve({ data: rows, error: null });
    }
    // 防重複扣點的 count 查詢
    if (st.head) {
      const bookingEq = st.eqs.find(([c]) => c === "booking_id")?.[1];
      const typeEq = st.eqs.find(([c]) => c === "type")?.[1];
      const n = LEDGER.filter(r =>
        (bookingEq === undefined || r.booking_id === bookingEq) &&
        (typeEq === undefined || r.type === typeEq)
      ).length;
      return resolve({ count: n, data: null, error: null });
    }
    return resolve({ data: [], error: null });
  };
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (t: string) => makeChain(t),
    rpc: () => Promise.resolve({ data: true, error: null }),
  },
}));

// 距今 N 天後的場次（用於落在各退款級距）
// 路由把 session_date + start_time 當本地時間解析，所以這裡也一律用本地時間取值——
// 混用 toISOString()（UTC）與 toTimeString()（本地）會差 8 小時，把級距推到隔壁格
function sessionInDays(days: number) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    session_date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    start_time: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`,
    experience_types: { name: "茶山採茶體驗" },
  };
}

function reset(booking: Partial<Row> = {}, ledger?: Tx[]) {
  pointInserts.length = 0;
  bookingUpdates.length = 0;
  BOOKING = {
    id: "b-1", user_id: "u-1", session_id: "s-1", status: "confirmed",
    participant_count: 2, total_price: 6000,
    points_used: 500, points_discount: 500,
    booker_name: "小江", booker_email: "test@example.com",
    session: sessionInDays(10),
    ...booking,
  };
  LEDGER = ledger ?? [{ points: -500, type: "redeem", booking_id: "b-1" }];
}

const refunds = () => pointInserts.filter(r => r.type === "refund");

// ─── 會員自助取消 ────────────────────────────────────────────────────────────

describe("會員取消體驗預約 POST /api/bookings/[id]/cancel", () => {
  beforeEach(() => reset());

  async function cancel() {
    const { POST } = await import("@/app/api/bookings/[id]/cancel/route");
    return POST(
      new NextRequest("http://localhost/api/bookings/b-1/cancel", { method: "POST" }),
      { params: Promise.resolve({ id: "b-1" }) },
    );
  }

  it("7 天前取消：退還帳本上實際扣除的全部點數", async () => {
    const res = await cancel();
    expect(res.status).toBe(200);
    expect(refunds()).toHaveLength(1);
    expect(refunds()[0].points).toBe(500);
    expect(refunds()[0].booking_id).toBe("b-1");
  });

  it("帳本與 points_discount 不一致時，以帳本為準", async () => {
    // 線上實際的舊制資料是 points_used 600 / points_discount 6 / 帳本 −6
    // （points_system.sql:132 的 migration 把帳本除以 100，卻沒 backfill
    // experience_bookings），那個形狀下 points_discount 與帳本碰巧相等。
    // 這裡刻意造一個三者都不同的形狀：抄 points_used 會退 3300、
    // 抄 points_discount 會退 33，只有讀帳本才會退 300。
    reset(
      { points_used: 3300, points_discount: 33 },
      [{ points: -300, type: "redeem", booking_id: "b-1" }],
    );
    await cancel();
    expect(refunds()[0].points).toBe(300);
  });

  it("redeem 記錄寫在 order_id 欄位也要撈得到", async () => {
    // d104048 之前，體驗的點數記錄寫的是 order_id（被 FK 擋掉而多半沒存進去，
    // 但不能假設一筆都沒有）。刻意讓 points_discount(33) 與帳本(300) 不同——
    // 只查 booking_id 會撈到空帳本而退 0 點，抄 points_discount 會退 33 點
    reset(
      { points_used: 3300, points_discount: 33 },
      [{ points: -300, type: "redeem", order_id: "b-1" }],
    );
    await cancel();
    expect(refunds()).toHaveLength(1);
    expect(refunds()[0].points).toBe(300);
  });

  it("3–6 天前取消：按 50% 退還", async () => {
    reset({ session: sessionInDays(4) });
    await cancel();
    expect(refunds()[0].points).toBe(250);
  });

  it("1–2 天前取消：按 20% 退還", async () => {
    reset({ session: sessionInDays(1.5) });
    await cancel();
    expect(refunds()[0].points).toBe(100);
  });

  it("未滿 24 小時取消：不退點", async () => {
    reset({ session: sessionInDays(0.5) });
    const res = await cancel();
    expect(res.status).toBe(200);
    expect(refunds()).toHaveLength(0);
  });

  it("待付款取消：全額退還（尚未成行，不適用比例）", async () => {
    reset({ status: "pending_payment", session: sessionInDays(0.5) });
    await cancel();
    expect(refunds()[0].points).toBe(500);
  });

  it("已部分退還過的預約只補差額（冪等）", async () => {
    reset({}, [
      { points: -500, type: "redeem", booking_id: "b-1" },
      { points: 5, type: "refund", booking_id: "b-1" },
    ]);
    await cancel();
    expect(refunds()).toHaveLength(1);
    expect(refunds()[0].points).toBe(495);
  });

  it("舊制寫成 earn 的退還記錄算已退，不重複發", async () => {
    reset({}, [
      { points: -500, type: "redeem", booking_id: "b-1" },
      { points: 500, type: "earn", description: "體驗預約取消退還點數", booking_id: "b-1" },
    ]);
    await cancel();
    expect(refunds()).toHaveLength(0);
  });

  it("完成回饋的 earn 不算已退，不影響退點金額", async () => {
    reset({}, [
      { points: -500, type: "redeem", booking_id: "b-1" },
      { points: 110, type: "earn", description: "體驗完成回饋", booking_id: "b-1" },
    ]);
    await cancel();
    expect(refunds()[0].points).toBe(500);
  });

  it("沒用點數的預約不產生退點記錄", async () => {
    reset({ points_used: 0, points_discount: 0 }, []);
    await cancel();
    expect(refunds()).toHaveLength(0);
  });

  it("帳本沒有扣點記錄時不退點，即使 points_used > 0", async () => {
    // 線上真有這種資料（aef4f39e）：d104048 之前扣點寫 order_id 被 FK 擋掉，
    // 預約欄位留著 300 但帳本一筆都沒有。舊寫法會依 points_discount 憑空發 3 點
    reset({ points_used: 300, points_discount: 3 }, []);
    await cancel();
    expect(refunds()).toHaveLength(0);
  });

  it("已取消的預約回 409，且不退點", async () => {
    reset({ status: "cancelled" });
    const res = await cancel();
    expect(res.status).toBe(409);
    expect(refunds()).toHaveLength(0);
  });

  it("不是本人的預約回 404，且不退點", async () => {
    reset({ user_id: "someone-else" });
    const res = await cancel();
    expect(res.status).toBe(404);
    expect(refunds()).toHaveLength(0);
  });
});

// ─── 後台取消 ────────────────────────────────────────────────────────────────

describe("後台取消體驗預約 POST /api/admin/experience-bookings/[id]/cancel", () => {
  beforeEach(() => reset());

  async function adminCancel() {
    const { POST } = await import("@/app/api/admin/experience-bookings/[id]/cancel/route");
    return (POST as unknown as (r: NextRequest, c: unknown) => Promise<Response>)(
      new NextRequest("http://localhost/api/admin/experience-bookings/b-1/cancel", { method: "POST" }),
      { params: Promise.resolve({ id: "b-1" }) },
    );
  }

  it("7 天前取消：退還帳本上實際扣除的全部點數", async () => {
    await adminCancel();
    expect(refunds()).toHaveLength(1);
    expect(refunds()[0].points).toBe(500);
  });

  it("帳本與 points_discount 不一致時，以帳本為準", async () => {
    reset(
      { points_used: 3300, points_discount: 33 },
      [{ points: -300, type: "redeem", booking_id: "b-1" }],
    );
    await adminCancel();
    expect(refunds()[0].points).toBe(300);
  });

  it("3–6 天前取消：按 50% 退還", async () => {
    reset({ session: sessionInDays(4) });
    await adminCancel();
    expect(refunds()[0].points).toBe(250);
  });

  it("待付款取消：全額退還", async () => {
    reset({ status: "pending_payment", session: sessionInDays(0.5) });
    await adminCancel();
    expect(refunds()[0].points).toBe(500);
  });

  it("已取消的預約回 409，且不退點", async () => {
    reset({ status: "cancelled" });
    const res = await adminCancel();
    expect(res.status).toBe(409);
    expect(refunds()).toHaveLength(0);
  });
});

// ─── 結帳扣點 ────────────────────────────────────────────────────────────────

describe("體驗結帳扣點 POST /api/ecpay/experience-checkout", () => {
  beforeEach(() => reset({ status: "pending_payment", points_used: 0, points_discount: 0 }, [
    { points: 2000, type: "earn", description: "消費回饋" },
  ]));

  async function checkout(pointsToUse: number) {
    const { POST } = await import("@/app/api/ecpay/experience-checkout/route");
    return POST(new NextRequest("http://localhost/api/ecpay/experience-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: "b-1", pointsToUse }),
    }));
  }

  const redeems = () => pointInserts.filter(r => r.type === "redeem");

  it("首次結帳扣一次點，金額為折後價", async () => {
    const res = await checkout(500);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(redeems()).toHaveLength(1);
    expect(redeems()[0].points).toBe(-500);
    expect(body.params.TotalAmount).toBe("5500");
  });

  it("同一筆預約重複結帳不重複扣點（回上一頁、重整、換付款方式）", async () => {
    await checkout(500);
    // 第一次扣點後，booking 的欄位已寫入
    BOOKING.points_used = 500;
    BOOKING.points_discount = 500;

    const res = await checkout(500);
    const body = await res.json();
    expect(res.status).toBe(200);
    // 回歸：原本每次呼叫都無條件 deductPoints，第二次扣的 500 點在取消時退不回來
    expect(redeems()).toHaveLength(1);
    // 金額仍為折後價，沿用既有折抵
    expect(body.params.TotalAmount).toBe("5500");
  });

  it("重複結帳時就算改帶更多點數也不會再扣", async () => {
    await checkout(500);
    BOOKING.points_used = 500;
    BOOKING.points_discount = 500;

    await checkout(600);
    expect(redeems()).toHaveLength(1);
    expect(redeems()[0].points).toBe(-500);
  });

  it("點數超過折抵上限回 400，且不扣點", async () => {
    // total_price 6000、一般會員上限 10% → 600
    const res = await checkout(700);
    expect(res.status).toBe(400);
    expect(redeems()).toHaveLength(0);
  });

  it("點數不足回 400，且不扣點", async () => {
    LEDGER = [{ points: 100, type: "earn" }];
    const res = await checkout(500);
    expect(res.status).toBe(400);
    expect(redeems()).toHaveLength(0);
  });
});
