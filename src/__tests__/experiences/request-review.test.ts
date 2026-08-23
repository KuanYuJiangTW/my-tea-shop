import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * 核准流程的服務層。
 *
 * 最重要的一組是 `convertRequestOnPayment` ——它從**綠界回調**裡被呼叫。
 * 那支回調必須回 `1|OK`，否則綠界會一直重送、客人的付款狀態會亂。所以
 * 「開課請求的收尾出錯時絕不能丟例外」是一條硬性不變量，不是好習慣。
 */

type Row = Record<string, unknown>;

const state = {
  request:      null as Row | null,
  existingSession: null as Row | null,
  insertedSession: null as Row | null,
  confirmedBookings: 0,
  updates:      [] as { table: string; patch: Row }[],
  deletes:      [] as string[],
  sessionInsertError: null as { message: string } | null,
  throwOnRequestSelect: false,
};

vi.mock("@/lib/email", () => ({
  sendRequestApprovedEmail: async () => { /* 成功 */ },
}));

vi.mock("@/lib/supabase", () => {
  const chain = (table: string) => {
    const c: Record<string, unknown> = {};
    const settle = () => {
      if (table === "experience_requests") {
        if (state.throwOnRequestSelect) throw new Error("db exploded");
        return Promise.resolve({ data: state.request, error: state.request ? null : { message: "not found" } });
      }
      if (table === "experience_sessions") {
        return Promise.resolve({ data: state.existingSession, error: null });
      }
      if (table === "experience_bookings") {
        return Promise.resolve({ data: null, error: null, count: state.confirmedBookings });
      }
      return Promise.resolve({ data: null, error: null });
    };
    c.select = () => c;
    c.eq = () => c;
    c.single = settle;
    c.maybeSingle = settle;
    c.insert = (row: Row) => {
      if (table === "experience_sessions") {
        state.insertedSession = row;
        return { select: () => ({ single: () => Promise.resolve(
          state.sessionInsertError
            ? { data: null, error: state.sessionInsertError }
            : { data: { id: "sess-1" }, error: null },
        ) }) };
      }
      return { select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) };
    };
    c.update = (patch: Row) => {
      state.updates.push({ table, patch });
      return { eq: () => Promise.resolve({ error: null }) };
    };
    c.delete = () => ({ eq: (_c: string, v: string) => { state.deletes.push(String(v)); return Promise.resolve({ error: null }); } });
    c.then = (res: unknown, rej: unknown) => (settle() as Promise<unknown>).then(res as never, rej as never);
    return c;
  };
  return { supabase: { from: (t: string) => chain(t) } };
});

const REQUEST = {
  id: "req-1", request_no: "R2608-AAAA", status: "pending",
  experience_type_id: 1, preferred_date: "2026-09-20", preferred_start_time: "14:00",
  headcount: 3, is_private: false, contact_name: "小江",
  contact_phone: "0972619391", contact_email: "a@b.com", locale: "zh", token: "old-token",
  experience_types: { name: "茶藝體驗", price: 800, max_participants: 20, request_min_slots: 4 },
};

beforeEach(() => {
  state.request = { ...REQUEST };
  state.existingSession = null;
  state.insertedSession = null;
  state.confirmedBookings = 0;
  state.updates = [];
  state.deletes = [];
  state.sessionInsertError = null;
  state.throwOnRequestSelect = false;
});

describe("approveRequest", () => {
  it("建立的場次是 private，並記錄來源請求", async () => {
    const { approveRequest } = await import("@/lib/experience-request-review");
    const r = await approveRequest("req-1");
    expect(r.ok).toBe(true);
    expect(state.insertedSession).toMatchObject({
      visibility: "private",
      created_from_request_id: "req-1",
      session_date: "2026-09-20",
      start_time: "14:00",
      status: "open",
    });
  });

  it("換一把新 token，並帶 48 小時期限", async () => {
    const { approveRequest, TOKEN_TTL_HOURS } = await import("@/lib/experience-request-review");
    const r = await approveRequest("req-1");
    if (!r.ok) throw new Error("should succeed");
    expect(r.token).not.toBe("old-token");
    const hours = (Date.parse(r.expiresAt) - Date.now()) / 3600_000;
    expect(Math.round(hours)).toBe(TOKEN_TTL_HOURS);
  });

  it("金額用共用計算：申請 3 人、最低 4 名額 → 4 × 800", async () => {
    const { approveRequest } = await import("@/lib/experience-request-review");
    const r = await approveRequest("req-1");
    if (!r.ok) throw new Error("should succeed");
    expect(r.slots).toBe(4);
    expect(r.total).toBe(3200);
  });

  it("該時段已有場次 → conflict，且**不建新場次**", async () => {
    state.existingSession = { id: "sess-old", status: "open", current_participants: 6 };
    const { approveRequest } = await import("@/lib/experience-request-review");
    const r = await approveRequest("req-1");
    expect(r).toMatchObject({ ok: false, code: "conflict" });
    if (r.ok || r.code !== "conflict") throw new Error("expected conflict");
    expect(r.session.availableSpots).toBe(14);
    expect(state.insertedSession).toBeNull();
  });

  it("狀態不允許核准時擋掉（例如已婉拒）", async () => {
    state.request = { ...REQUEST, status: "declined" };
    const { approveRequest } = await import("@/lib/experience-request-review");
    expect(await approveRequest("req-1")).toMatchObject({ ok: false, code: "bad-status" });
    expect(state.insertedSession).toBeNull();
  });

  it("替代方案的日期會覆蓋原申請日", async () => {
    const { approveRequest } = await import("@/lib/experience-request-review");
    await approveRequest("req-1", { overrideDate: "2026-09-28", overrideTime: "10:00" });
    expect(state.insertedSession).toMatchObject({ session_date: "2026-09-28", start_time: "10:00" });
  });

  it("寄信失敗不回滾——否則會留下後台顯示未核准、資料庫卻有孤兒場次", async () => {
    const mod = await import("@/lib/email");
    const spy = vi.spyOn(mod, "sendRequestApprovedEmail").mockRejectedValue(new Error("resend down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { approveRequest } = await import("@/lib/experience-request-review");
    expect((await approveRequest("req-1")).ok).toBe(true);
    spy.mockRestore(); err.mockRestore();
  });

  it("建場次失敗 → 回 db 錯誤，不會留下 approved 狀態", async () => {
    state.sessionInsertError = { message: "boom" };
    const { approveRequest } = await import("@/lib/experience-request-review");
    expect(await approveRequest("req-1")).toMatchObject({ ok: false, code: "db" });
    expect(state.updates.filter(u => u.table === "experience_requests")).toHaveLength(0);
  });
});

describe("revokeApproval", () => {
  it("沒有付款預約時可以撤銷，並回收場次", async () => {
    state.request = { id: "req-1", status: "approved", session_id: "sess-1" };
    const { revokeApproval } = await import("@/lib/experience-request-review");
    expect(await revokeApproval("req-1")).toEqual({ ok: true });
    expect(state.deletes).toContain("sess-1");
    expect(state.updates.at(-1)?.patch).toMatchObject({ status: "pending", session_id: null });
  });

  it("已經有人付款 → 擋下，要走既有的取消與退款流程", async () => {
    state.request = { id: "req-1", status: "approved", session_id: "sess-1" };
    state.confirmedBookings = 1;
    const { revokeApproval } = await import("@/lib/experience-request-review");
    expect(await revokeApproval("req-1")).toMatchObject({ ok: false, code: "has-booking" });
    expect(state.deletes).toHaveLength(0);
  });
});

describe("convertRequestOnPayment — 從綠界回調呼叫，絕不能丟例外", () => {
  it("非包場：請求轉 converted，場次轉 public", async () => {
    state.request = { id: "req-1", is_private: false, status: "approved" };
    const { convertRequestOnPayment } = await import("@/lib/experience-request-review");
    await convertRequestOnPayment("sess-1", "book-1");
    expect(state.updates.some(u => u.table === "experience_requests" && u.patch.status === "converted")).toBe(true);
    expect(state.updates.some(u => u.table === "experience_sessions" && u.patch.visibility === "public")).toBe(true);
  });

  it("包場：請求轉 converted，但場次維持 private", async () => {
    state.request = { id: "req-1", is_private: true, status: "approved" };
    const { convertRequestOnPayment } = await import("@/lib/experience-request-review");
    await convertRequestOnPayment("sess-1", "book-1");
    expect(state.updates.some(u => u.patch.status === "converted")).toBe(true);
    expect(state.updates.some(u => u.table === "experience_sessions")).toBe(false);
  });

  it("一般預約（沒有對應的請求）→ 什麼都不做", async () => {
    state.request = null;
    const { convertRequestOnPayment } = await import("@/lib/experience-request-review");
    await convertRequestOnPayment("sess-1", "book-1");
    expect(state.updates).toHaveLength(0);
  });

  it("沒有 sessionId → 直接跳過", async () => {
    const { convertRequestOnPayment } = await import("@/lib/experience-request-review");
    await convertRequestOnPayment(null, "book-1");
    expect(state.updates).toHaveLength(0);
  });

  // ── 這一條是整個檔案最重要的 ──────────────────────────────
  it("資料庫爆掉時**不丟例外**——綠界回調必須還能回 1|OK", async () => {
    state.throwOnRequestSelect = true;
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { convertRequestOnPayment } = await import("@/lib/experience-request-review");
    await expect(convertRequestOnPayment("sess-1", "book-1")).resolves.toBeUndefined();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
