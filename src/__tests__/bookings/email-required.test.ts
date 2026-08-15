import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 預約與候補都必須有帳號 email。
 *
 * 起因：Facebook 登入只要 `public_profile`、不要 email，所以 FB 建立的帳號
 * `user.email` 是空的。在補上防線之前：
 *   - `POST /api/bookings` 會一路撞到 `experience_bookings.booker_email` 的
 *     NOT NULL，使用者看到 Postgres 原文錯誤（500）
 *   - `POST /api/waitlist` 用 `user.email ?? ""` 存空字串，NOT NULL 過得去，
 *     於是遞補通知寄到空信箱——不報錯、沒人發現，這是最危險的一種
 *
 * 兩支都要在寫入**之前**擋下並回 400，引導使用者去會員中心綁定
 * （AccountClient.handleBindEmail 會寄驗證信）。
 */

/** 由各測試決定這次登入的使用者有沒有 email */
let CURRENT_USER: { id: string; email?: string | null } = { id: "u-1", email: "a@b.com" };

/** 記錄實際寫進資料庫的 insert，用來證明「擋下」不只是回 400 而已 */
const inserts: { table: string; payload: unknown }[] = [];

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: async () => true,
  getClientIp: () => "127.0.0.1",
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: CURRENT_USER } }) },
    from: () => {
      const c: Record<string, unknown> = {};
      const self = () => c;
      c.select = self; c.eq = self;
      c.single = async () => ({ data: { name: "小江" }, error: null });
      return c;
    },
  }),
}));

const SESSION_ROW = {
  id: "sess-1",
  status: "full",
  session_date: "2026-09-01",
  start_time: "14:00",
  current_participants: 0,
  experience_types: {
    price: 1200,
    max_participants: 8,
    min_participants: 2,
    requires_adult: false,
  },
};

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
    rpc: async () => ({ data: true, error: null }),
  },
}));

function req(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const bookingBody = {
  sessionId: "sess-1",
  participantCount: 2,
  bookerName: "小江",
  bookerPhone: "0912345678",
};

beforeEach(() => {
  inserts.length = 0;
  CURRENT_USER = { id: "u-1", email: "a@b.com" };
});

describe("預約／候補要求帳號必須有 email", () => {
  it("POST /api/bookings：帳號沒有 email → 400，且不寫入任何資料", async () => {
    CURRENT_USER = { id: "u-fb", email: null };
    const { POST } = await import("@/app/api/bookings/route");
    const res = await POST(req("http://localhost/api/bookings", bookingBody));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("會員中心");
    expect(inserts).toHaveLength(0);
  });

  it("POST /api/waitlist：帳號沒有 email → 400，且不寫入候補紀錄", async () => {
    CURRENT_USER = { id: "u-fb", email: null };
    const { POST } = await import("@/app/api/waitlist/route");
    const res = await POST(req("http://localhost/api/waitlist", bookingBody));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("會員中心");
    expect(inserts).toHaveLength(0);
  });

  it("POST /api/waitlist：帳號有 email → 通過這道防線，booker_email 寫入該值", async () => {
    CURRENT_USER = { id: "u-1", email: "a@b.com" };
    const { POST } = await import("@/app/api/waitlist/route");
    const res = await POST(req("http://localhost/api/waitlist", bookingBody));

    expect(res.status).toBe(200);
    const entry = inserts.find(i => i.table === "waitlist_entries");
    expect(entry).toBeDefined();
    expect((entry!.payload as { booker_email: string }).booker_email).toBe("a@b.com");
  });
});
