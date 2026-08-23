import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 開課請求的每日排程。
 *
 * 三件事共用一支：待審積壓提醒、核准逾期回收、替代方案逾期。
 *
 * 最重要的一條是**「場次已經有人付款時只標請求、不回收場次」**——那一場是
 * 真的成立了，回收它會殺掉別人已付款的預約。這種錯誤不會有任何錯誤訊息，
 * 只會在客人抵達現場時才發現。
 */

type Row = Record<string, unknown>;

const state = {
  approved:     [] as Row[],
  alternatives: [] as Row[],
  pending:      [] as Row[],
  confirmedBookings: 0,
  tableMissing: false,
  updates: [] as { table: string; patch: Row }[],
  deletedSessions: [] as string[],
};
const digests: unknown[][] = [];

vi.mock("@/lib/email", () => ({
  sendAdminRequestDigest: async (items: unknown[]) => { digests.push(items); },
}));

vi.mock("@/lib/supabase", () => {
  const chain = (table: string) => {
    const st = { filters: {} as Record<string, unknown> };
    const c: Record<string, unknown> = {};
    const settle = () => {
      if (state.tableMissing && table === "experience_requests") {
        return Promise.resolve({ data: null, error: { code: "42P01", message: "missing" } });
      }
      if (table === "experience_requests") {
        const s = st.filters.status;
        if (s === "approved")            return Promise.resolve({ data: state.approved, error: null });
        if (s === "alternative_offered") return Promise.resolve({ data: state.alternatives, error: null });
        if (s === "pending")             return Promise.resolve({ data: state.pending, error: null });
        return Promise.resolve({ data: [], error: null });
      }
      if (table === "experience_bookings") {
        return Promise.resolve({ data: null, error: null, count: state.confirmedBookings });
      }
      return Promise.resolve({ data: [], error: null });
    };
    c.select = () => c;
    c.eq = (col: string, v: unknown) => { st.filters[col] = v; return c; };
    c.lt = () => c;
    c.order = () => c;
    c.update = (patch: Row) => {
      state.updates.push({ table, patch });
      return { eq: () => Promise.resolve({ error: null }) };
    };
    c.delete = () => ({
      eq: (_col: string, v: string) => { state.deletedSessions.push(String(v)); return Promise.resolve({ error: null }); },
    });
    c.then = (res: unknown, rej: unknown) => (settle() as Promise<unknown>).then(res as never, rej as never);
    return c;
  };
  return { supabase: { from: (t: string) => chain(t) } };
});

const req = (auth = "Bearer test-secret") =>
  new NextRequest("http://localhost/api/cron/experience-request-digest", {
    headers: { authorization: auth },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

beforeEach(() => {
  process.env.CRON_SECRET = "test-secret";
  state.approved = [];
  state.alternatives = [];
  state.pending = [];
  state.confirmedBookings = 0;
  state.tableMissing = false;
  state.updates = [];
  state.deletedSessions = [];
  digests.length = 0;
});

describe("授權", () => {
  it("沒有正確的 CRON_SECRET → 401", async () => {
    const { GET } = await import("@/app/api/cron/experience-request-digest/route");
    expect((await GET(req("Bearer wrong"))).status).toBe(401);
    expect((await GET(req(""))).status).toBe(401);
  });

  it("資料表還沒建立 → 503，並點名要跑哪支 SQL", async () => {
    state.tableMissing = true;
    const { GET } = await import("@/app/api/cron/experience-request-digest/route");
    const res = await GET(req());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain("add_experience_requests.sql");
  });
});

describe("核准逾期回收", () => {
  it("沒人付款 → 回收場次並標為 expired", async () => {
    state.approved = [{ id: "r1", session_id: "s1" }];
    const { GET } = await import("@/app/api/cron/experience-request-digest/route");
    const j = await (await GET(req())).json();

    expect(j.expiredApprovals).toBe(1);
    expect(j.reclaimedSessions).toBe(1);
    expect(state.deletedSessions).toContain("s1");
    expect(state.updates.some(u => u.patch.status === "expired" && u.patch.session_id === null)).toBe(true);
  });

  // ── 這一條是本檔最重要的 ────────────────────────────────
  it("場次已經有人付款 → **不回收場次**，只把請求標為 expired", async () => {
    state.approved = [{ id: "r1", session_id: "s1" }];
    state.confirmedBookings = 1;
    const { GET } = await import("@/app/api/cron/experience-request-digest/route");
    const j = await (await GET(req())).json();

    expect(j.expiredApprovals).toBe(1);
    expect(j.reclaimedSessions).toBe(0);
    expect(state.deletedSessions).toHaveLength(0);
    // session_id 要留著——那一場是真的成立了
    const patch = state.updates.find(u => u.patch.status === "expired")?.patch;
    expect(patch).toBeDefined();
    expect("session_id" in patch!).toBe(false);
  });

  it("沒有逾期的核准 → 什麼都不做", async () => {
    const { GET } = await import("@/app/api/cron/experience-request-digest/route");
    const j = await (await GET(req())).json();
    expect(j.expiredApprovals).toBe(0);
    expect(state.deletedSessions).toHaveLength(0);
  });
});

describe("替代方案逾期", () => {
  it("超過 7 天沒回應 → expired", async () => {
    state.alternatives = [{ id: "r2" }, { id: "r3" }];
    const { GET } = await import("@/app/api/cron/experience-request-digest/route");
    const j = await (await GET(req())).json();
    expect(j.expiredAlternatives).toBe(2);
  });
});

describe("待審彙整", () => {
  it("有積壓 → 寄一封，含等待時數", async () => {
    state.pending = [{
      request_no: "R2608-AAAA", preferred_date: "2026-09-20", preferred_start_time: "14:00:00",
      headcount: 3, created_at: new Date(Date.now() - 30 * 3600_000).toISOString(),
      experience_types: { name: "茶藝體驗" },
    }];
    const { GET } = await import("@/app/api/cron/experience-request-digest/route");
    const j = await (await GET(req())).json();

    expect(j.digestItems).toBe(1);
    expect(digests).toHaveLength(1);
    const item = (digests[0] as { waitingHours: number; time: string }[])[0];
    expect(item.waitingHours).toBe(30);
    expect(item.time).toBe("14:00");     // TIME 欄位要切成 HH:MM，不是 14:00:00
  });

  it("沒有積壓 → 仍呼叫但送空陣列（那支自己會 return，不寄信）", async () => {
    const { GET } = await import("@/app/api/cron/experience-request-digest/route");
    const j = await (await GET(req())).json();
    expect(j.digestItems).toBe(0);
    expect(digests[0]).toEqual([]);
  });

  it("寄信爆掉不影響回收與回應", async () => {
    state.approved = [{ id: "r1", session_id: "s1" }];
    const mod = await import("@/lib/email");
    const spy = vi.spyOn(mod, "sendAdminRequestDigest").mockRejectedValue(new Error("down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("@/app/api/cron/experience-request-digest/route");
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect((await res.json()).reclaimedSessions).toBe(1);
    spy.mockRestore(); err.mockRestore();
  });
});
