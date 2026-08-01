import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 逾期未付款預約的自動取消 cron（真的打路由）
 *
 * 體驗預約的點數在導向綠界之前就扣掉了，客人放棄付款時預約會永遠停在
 * pending_payment、點數跟著卡住。這支 cron 是唯一會把那些點數放出來的機制，
 * 所以「誰該被取消」的邊界條件要測到。
 */

type Row = Record<string, unknown>;
type Tx = { points: number; type: string; description?: string; booking_id?: string; order_id?: string };

let BOOKINGS: Row[];
let LEDGER: Tx[];
const pointInserts: Row[] = [];
const bookingUpdates: { id: unknown; patch: Row }[] = [];
const cancelEmails: Row[] = [];

vi.mock("@/lib/email", () => ({
  sendBookingCancelEmail: (d: Row) => { cancelEmails.push(d); return Promise.resolve(); },
}));

function makeChain(table: string) {
  const st = {
    cols: "", op: "", head: false, patch: {} as Row,
    eqs: [] as [string, unknown][], or: "",
  };
  const chain: Record<string, unknown> = {};

  chain.select = (cols?: string, opts?: { head?: boolean }) => {
    st.cols = cols ?? "*";
    if (opts?.head) st.head = true;
    return chain;
  };
  chain.update = (patch: Row) => { st.op = "update"; st.patch = patch; return chain; };
  chain.insert = (row: Row) => {
    if (table === "point_transactions") {
      pointInserts.push(row);
      LEDGER.push({
        points: row.points as number,
        type: row.type as string,
        description: row.description as string,
        booking_id: (row.booking_id ?? undefined) as string | undefined,
      });
    }
    return Promise.resolve({ error: null });
  };
  chain.eq = (col: string, val: unknown) => { st.eqs.push([col, val]); return chain; };
  chain.or = (expr: string) => { st.or = expr; return chain; };
  chain.lt = () => chain;
  chain.gt = () => chain;
  chain.order = () => chain;

  chain.then = (resolve: (v: unknown) => unknown) => {
    if (table === "experience_bookings") {
      if (st.op === "update") {
        const id = st.eqs.find(([c]) => c === "id")?.[1];
        // 路由帶了 .eq("status", "pending_payment") 當併發保護，mock 也照做
        const statusGuard = st.eqs.find(([c]) => c === "status")?.[1];
        const target = BOOKINGS.find(b => b.id === id);
        if (statusGuard && target && target.status !== statusGuard) {
          return resolve({ error: null }); // 已被別人改掉，視同沒中
        }
        bookingUpdates.push({ id, patch: st.patch });
        return resolve({ error: null });
      }
      const statusEq = st.eqs.find(([c]) => c === "status")?.[1];
      const rows = statusEq ? BOOKINGS.filter(b => b.status === statusEq) : BOOKINGS;
      return resolve({ data: rows, error: null });
    }
    if (table === "point_transactions" && st.or.includes("booking_id.eq.")) {
      const id = st.or.split("booking_id.eq.")[1].split(",")[0];
      return resolve({
        data: LEDGER.filter(r => r.booking_id === id || r.order_id === id),
        error: null,
      });
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

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

// 距今 N 小時後的場次（負數 = 已經過去）
function sessionInHours(h: number) {
  const d = new Date(Date.now() + h * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    session_date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    start_time: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`,
    experience_types: { name: "茶山採茶體驗" },
  };
}

function booking(over: Partial<Row> = {}): Row {
  return {
    id: "b-1", user_id: "u-1", status: "pending_payment",
    created_at: hoursAgo(48), booker_name: "小江", booker_email: "test@example.com",
    session: sessionInHours(24 * 30),
    ...over,
  };
}

function reset(bookings: Row[], ledger: Tx[] = []) {
  pointInserts.length = 0;
  bookingUpdates.length = 0;
  cancelEmails.length = 0;
  BOOKINGS = bookings;
  LEDGER = ledger;
}

async function run() {
  const { GET } = await import("@/app/api/cron/expire-pending-bookings/route");
  return GET(new NextRequest("http://localhost/api/cron/expire-pending-bookings", {
    headers: { authorization: "Bearer test-cron-secret" },
  }));
}

const refunds = () => pointInserts.filter(r => r.type === "refund");

describe("逾期未付款預約清理 GET /api/cron/expire-pending-bookings", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
    reset([booking()], [{ points: -500, type: "redeem", booking_id: "b-1" }]);
  });

  it("沒有 CRON_SECRET 回 401，且什麼都不做", async () => {
    const { GET } = await import("@/app/api/cron/expire-pending-bookings/route");
    const res = await GET(new NextRequest("http://localhost/api/cron/expire-pending-bookings"));
    expect(res.status).toBe(401);
    expect(bookingUpdates).toHaveLength(0);
    expect(refunds()).toHaveLength(0);
  });

  it("建立超過 24 小時的未付款預約會被取消並全額退點", async () => {
    const res = await run();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.results.cancelled).toBe(1);
    expect(bookingUpdates[0].patch.status).toBe("cancelled");
    expect(bookingUpdates[0].patch.cancellation_reason).toBe("逾期未付款，系統自動取消");
    // 從未付款，沒有現金要退
    expect(bookingUpdates[0].patch.refund_amount).toBe(0);
    expect(bookingUpdates[0].patch.refund_status).toBe("none");
    // 點數全額退，不套用距活動時間的比例
    expect(refunds()).toHaveLength(1);
    expect(refunds()[0].points).toBe(500);
  });

  it("建立未滿 24 小時且場次還沒到的不動它", async () => {
    reset([booking({ created_at: hoursAgo(3) })], [{ points: -500, type: "redeem", booking_id: "b-1" }]);
    const res = await run();
    const body = await res.json();
    expect(body.results.cancelled).toBe(0);
    expect(bookingUpdates).toHaveLength(0);
    expect(refunds()).toHaveLength(0);
  });

  it("場次已經開始的未付款預約要收掉，即使還沒滿 24 小時", async () => {
    // 場次 12 小時後開始的預約撐不到逾期就過期了，只靠 24 小時規則會漏掉
    reset(
      [booking({ created_at: hoursAgo(3), session: sessionInHours(-1) })],
      [{ points: -500, type: "redeem", booking_id: "b-1" }],
    );
    const body = await (await run()).json();
    expect(body.results.cancelled).toBe(1);
    expect(refunds()[0].points).toBe(500);
  });

  it("沒用點數的逾期預約只取消，不產生退點記錄", async () => {
    reset([booking()], []);
    const body = await (await run()).json();
    expect(body.results.cancelled).toBe(1);
    expect(body.results.pointsRefunded).toBe(0);
    expect(refunds()).toHaveLength(0);
  });

  it("已退還過的不重複退（冪等）", async () => {
    reset([booking()], [
      { points: -500, type: "redeem", booking_id: "b-1" },
      { points: 500, type: "refund", booking_id: "b-1" },
    ]);
    await run();
    expect(refunds()).toHaveLength(0);
  });

  it("退還的點數有效期不是空的", async () => {
    await run();
    // 回歸：refundPoints 原本沒帶 expires_at，getValidBalance 會把它當永不過期
    expect(refunds()[0].expires_at).toBeTruthy();
    expect(new Date(refunds()[0].expires_at as string).getTime()).toBeGreaterThan(Date.now());
  });

  it("寄取消通知信，標明是未付款狀態", async () => {
    await run();
    expect(cancelEmails).toHaveLength(1);
    expect(cancelEmails[0].wasPending).toBe(true);
    expect(cancelEmails[0].refundAmount).toBe(0);
    expect(cancelEmails[0].bookerEmail).toBe("test@example.com");
  });

  it("多筆逾期預約逐一處理", async () => {
    reset(
      [
        booking({ id: "b-1" }),
        booking({ id: "b-2", created_at: hoursAgo(3) }),  // 未逾期
        booking({ id: "b-3" }),
      ],
      [
        { points: -100, type: "redeem", booking_id: "b-1" },
        { points: -200, type: "redeem", booking_id: "b-3" },
      ],
    );
    const body = await (await run()).json();
    expect(body.results.cancelled).toBe(2);
    expect(bookingUpdates.map(u => u.id)).toEqual(["b-1", "b-3"]);
    expect(refunds().map(r => r.points)).toEqual([100, 200]);
  });

  it("已 confirmed 的預約不在處理範圍內", async () => {
    reset([booking({ status: "confirmed" })], [{ points: -500, type: "redeem", booking_id: "b-1" }]);
    const body = await (await run()).json();
    expect(body.results.cancelled).toBe(0);
    expect(refunds()).toHaveLength(0);
  });
});
