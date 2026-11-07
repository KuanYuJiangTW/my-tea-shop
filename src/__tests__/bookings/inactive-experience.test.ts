import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 已下架的體驗不接受新預約（openspec experience-visibility-toggle）。
 *
 * 起因：前台列表與詳細頁早就只顯示 `is_active = true` 的體驗，但
 * `POST /api/bookings` 只看場次 `status === "open"`——客人手上有舊的場次連結，
 * 下架後照樣能訂到、付款。業主以為關掉了，其實還在收單。
 *
 * 另外原本 join 回來的 `experience_types` 是 null 時，程式在
 * `expType.max_participants` 直接丟例外（500），現在一併擋成 409。
 *
 * 刻意**不擋**的路徑（design D5，不要「順手」補上檢查）：
 *   - `ecpay/experience-checkout`：對已存在的 pending_payment 預約結帳。擋了就會
 *     出現客人佔了名額卻付不了錢的狀態。體驗付款只有這一條（PayPal 沒有體驗付款）
 *   - `waitlist/[id]/confirm`：系統主動通知的候補，客人已持有「被邀請」的狀態
 */

let SESSION_ROW: Record<string, unknown>;

/** 記錄實際寫進資料庫的 insert，證明「擋下」不只是回 409 而已 */
const inserts: { table: string; payload: unknown }[] = [];
const rpcCalls: string[] = [];

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: async () => true,
  getClientIp: () => "127.0.0.1",
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u-1", email: "a@b.com" } } }) },
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      const c: Record<string, unknown> = {};
      const self = () => c;
      c.select = self; c.eq = self;
      c.insert = (payload: unknown) => { inserts.push({ table, payload }); return c; };
      c.single = async () =>
        table === "experience_sessions"
          ? { data: SESSION_ROW, error: null }
          : { data: { id: "row-1" }, error: null };
      return c;
    },
    rpc: async (name: string) => { rpcCalls.push(name); return { data: true, error: null }; },
  },
}));

function req(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const body = {
  sessionId: "sess-1",
  participantCount: 2,
  bookerName: "小江",
  bookerPhone: "0912345678",
};

function session(status: "open" | "full", expType: Record<string, unknown> | null) {
  return {
    id: "sess-1",
    status,
    session_date: "2026-12-01",
    start_time: "14:00",
    current_participants: 0,
    experience_types: expType,
  };
}

const ACTIVE   = { name: "茶藝體驗", price: 800, max_participants: 8, min_participants: 2, requires_adult: false, is_active: true };
const INACTIVE = { ...ACTIVE, is_active: false };

beforeEach(() => {
  inserts.length = 0;
  rpcCalls.length = 0;
});

describe("POST /api/bookings：已下架的體驗不接受新預約", () => {
  it("上架中、名額足夠 → 照常建立預約", async () => {
    SESSION_ROW = session("open", ACTIVE);
    const { POST } = await import("@/app/api/bookings/route");
    const res = await POST(req("http://localhost/api/bookings", body));

    expect(res.status).toBe(200);
    expect(inserts.filter(i => i.table === "experience_bookings")).toHaveLength(1);
  });

  it("已下架 → 409「此體驗目前未開放預約」，不寫入預約", async () => {
    SESSION_ROW = session("open", INACTIVE);
    const { POST } = await import("@/app/api/bookings/route");
    const res = await POST(req("http://localhost/api/bookings", body));

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("此體驗目前未開放預約");
    expect(inserts).toHaveLength(0);
  });

  it("已下架且人數超過名額 → 仍回「未開放」而不是「名額不足」（檢查在名額之前）", async () => {
    SESSION_ROW = { ...session("open", INACTIVE), current_participants: 8 };
    const { POST } = await import("@/app/api/bookings/route");
    const res = await POST(req("http://localhost/api/bookings", body));

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("此體驗目前未開放預約");
  });

  it("場次 join 不到體驗（null）→ 409，不是 500", async () => {
    SESSION_ROW = session("open", null);
    const { POST } = await import("@/app/api/bookings/route");
    const res = await POST(req("http://localhost/api/bookings", body));

    expect(res.status).toBe(409);
    expect(inserts).toHaveLength(0);
  });

  it("is_active 欄位缺漏（undefined）→ 視為未上架", async () => {
    const { is_active: _omit, ...noFlag } = ACTIVE;
    void _omit;
    SESSION_ROW = session("open", noFlag);
    const { POST } = await import("@/app/api/bookings/route");
    const res = await POST(req("http://localhost/api/bookings", body));

    expect(res.status).toBe(409);
  });
});

describe("POST /api/waitlist：加入候補也是新入口，同一條規則", () => {
  it("上架中、場次額滿 → 可以加入候補", async () => {
    SESSION_ROW = session("full", ACTIVE);
    const { POST } = await import("@/app/api/waitlist/route");
    const res = await POST(req("http://localhost/api/waitlist", body));

    expect(res.status).toBe(200);
    expect(inserts.filter(i => i.table === "waitlist_entries")).toHaveLength(1);
  });

  it("已下架 → 409，不寫入候補、不增加候補人數", async () => {
    SESSION_ROW = session("full", INACTIVE);
    const { POST } = await import("@/app/api/waitlist/route");
    const res = await POST(req("http://localhost/api/waitlist", body));

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("此體驗目前未開放預約");
    expect(inserts).toHaveLength(0);
    expect(rpcCalls).toHaveLength(0);
  });
});
