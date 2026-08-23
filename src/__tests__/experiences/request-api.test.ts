import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 開課請求的客人端 API。
 *
 * 這支是**公開端點**，任何人都打得到，所以每一條防線都要有測試守住。另外釘住
 * 兩件容易在重構中被弄丟的事：
 *   1. `accepts_requests = false` 的體驗必須擋掉——那是這個功能的總開關，
 *      漏掉就等於在業主還沒準備好時就上線了
 *   2. 查詢回應**絕不含 admin_note**（內部備註外洩給客人）
 */

let rateLimitOk = true;
let typeRow: Record<string, unknown> | null = null;
let blackoutRows: { blackout_date: string }[] = [];
let insertError: { code?: string; message: string } | null = null;
let requestRow: Record<string, unknown> | null = null;
let updated: Record<string, unknown>[] = [];
const inserted: Record<string, unknown>[] = [];
const mails: string[] = [];

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: () => "1.2.3.4",
  rateLimit: async () => rateLimitOk,
}));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));
vi.mock("@/lib/email", () => ({
  sendRequestReceivedEmail:   async () => { mails.push("received"); },
  sendAdminRequestNoticeEmail: async () => { mails.push("admin"); },
}));

vi.mock("@/lib/supabase", () => {
  const chain = (table: string) => {
    const c: Record<string, unknown> = {};
    const settle = () => {
      if (table === "experience_blackout_dates") return Promise.resolve({ data: blackoutRows, error: null });
      if (table === "experience_types") return Promise.resolve({ data: typeRow, error: typeRow ? null : { message: "not found" } });
      return Promise.resolve({ data: requestRow, error: requestRow ? null : { message: "not found" } });
    };
    c.select = () => c;
    c.eq     = () => c;
    c.single = settle;
    c.insert = (row: Record<string, unknown>) => {
      inserted.push(row);
      return {
        select: () => ({
          single: () => Promise.resolve(
            insertError
              ? { data: null, error: insertError }
              : { data: { id: "r1", request_no: "R2608-AAAA", token: "tok-123" }, error: null },
          ),
        }),
      };
    };
    c.update = (patch: Record<string, unknown>) => {
      updated.push(patch);
      return { eq: () => Promise.resolve({ error: null }) };
    };
    c.then = (res: unknown, rej: unknown) => (settle() as Promise<unknown>).then(res as never, rej as never);
    return c;
  };
  return { supabase: { from: (t: string) => chain(t) } };
});

const OPEN_TYPE = {
  id: 1, name: "茶藝體驗", price: 800, max_participants: 20,
  request_min_slots: 4, request_lead_days: 7,
  request_start_times: ["10:00", "14:00"],
  accepts_requests: true, is_active: true,
  experience_availability_windows: [],
};

/** 距今 N 天（台灣時間） */
function plus(days: number): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

const base = () => ({
  experienceTypeId: 1,
  preferredDate: plus(20),
  preferredStartTime: "14:00",
  headcount: 3,
  contactName: "小江",
  contactPhone: "0972619391",
  contactEmail: "a@b.com",
});

const post = (body: unknown) =>
  new NextRequest("http://localhost/api/experience-requests", {
    method: "POST", body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

beforeEach(() => {
  rateLimitOk = true;
  typeRow = { ...OPEN_TYPE };
  blackoutRows = [];
  insertError = null;
  requestRow = null;
  updated = [];
  inserted.length = 0;
  mails.length = 0;
});

describe("防濫用", () => {
  it("honeypot → 200 但不寫庫", async () => {
    const { POST } = await import("@/app/api/experience-requests/route");
    const res = await POST(post({ ...base(), website: "spam" }));
    expect(res.status).toBe(200);
    expect(inserted).toHaveLength(0);
  });

  it("限流 → 429", async () => {
    rateLimitOk = false;
    const { POST } = await import("@/app/api/experience-requests/route");
    expect((await POST(post(base()))).status).toBe(429);
  });
});

describe("總開關", () => {
  it("accepts_requests = false → 409，不寫庫", async () => {
    typeRow = { ...OPEN_TYPE, accepts_requests: false };
    const { POST } = await import("@/app/api/experience-requests/route");
    const res = await POST(post(base()));
    expect(res.status).toBe(409);
    expect(inserted).toHaveLength(0);
  });

  it("找不到體驗 → 404", async () => {
    typeRow = null;
    const { POST } = await import("@/app/api/experience-requests/route");
    expect((await POST(post(base()))).status).toBe(404);
  });
});

describe("欄位驗證", () => {
  it("缺姓名／電話／Email → 400", async () => {
    const { POST } = await import("@/app/api/experience-requests/route");
    for (const k of ["contactName", "contactPhone", "contactEmail"]) {
      const b = base() as Record<string, unknown>; b[k] = "";
      expect((await POST(post(b))).status).toBe(400);
    }
  });

  it("Email 格式不對 → 400", async () => {
    const { POST } = await import("@/app/api/experience-requests/route");
    expect((await POST(post({ ...base(), contactEmail: "nope" }))).status).toBe(400);
  });

  it("人數超出 1–50 → 400", async () => {
    const { POST } = await import("@/app/api/experience-requests/route");
    expect((await POST(post({ ...base(), headcount: 0 }))).status).toBe(400);
    expect((await POST(post({ ...base(), headcount: 51 }))).status).toBe(400);
  });

  it("聯絡偏好灌入非法值 → 400", async () => {
    const { POST } = await import("@/app/api/experience-requests/route");
    expect((await POST(post({ ...base(), contactPreference: "carrier-pigeon" }))).status).toBe(400);
  });

  it("非該體驗的時段 → 400", async () => {
    const { POST } = await import("@/app/api/experience-requests/route");
    expect((await POST(post({ ...base(), preferredStartTime: "21:00" }))).status).toBe(400);
  });
});

describe("可申請性", () => {
  it("太趕 → 400 並帶 reason，訊息要導向 LINE／電話", async () => {
    const { POST } = await import("@/app/api/experience-requests/route");
    const res = await POST(post({ ...base(), preferredDate: plus(3) }));
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.reason).toBe("too-soon");
    expect(j.error).toContain("LINE");
  });

  it("超過 90 天 → 400", async () => {
    const { POST } = await import("@/app/api/experience-requests/route");
    expect((await POST(post({ ...base(), preferredDate: plus(120) }))).json().then((j: { reason: string }) => j.reason))
      .resolves.toBe("too-far");
  });

  it("公休日 → 400", async () => {
    const d = plus(20);
    blackoutRows = [{ blackout_date: d }];
    const { POST } = await import("@/app/api/experience-requests/route");
    const j = await (await POST(post({ ...base(), preferredDate: d }))).json();
    expect(j.reason).toBe("blackout");
  });

  it("季節外 → 400", async () => {
    typeRow = { ...OPEN_TYPE, experience_availability_windows: [{ start_date: "2026-01-01", end_date: "2026-01-31" }] };
    const { POST } = await import("@/app/api/experience-requests/route");
    const j = await (await POST(post(base()))).json();
    expect(j.reason).toBe("out-of-season");
  });
});

describe("成功與重複", () => {
  it("送出成功 → 回編號、token、名額與金額，並寄兩封信", async () => {
    const { POST } = await import("@/app/api/experience-requests/route");
    const res = await POST(post(base()));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.requestNo).toBe("R2608-AAAA");
    expect(j.token).toBe("tok-123");
    expect(j.slots).toBe(4);            // 申請 3 人，最低名額 4
    expect(j.total).toBe(3200);         // 4 × 800
    expect(mails).toEqual(["received", "admin"]);
    expect(inserted[0].status).toBeUndefined();   // 交給 DB 預設 pending
  });

  it("重複送出（DB unique）→ 409", async () => {
    insertError = { code: "23505", message: "duplicate" };
    const { POST } = await import("@/app/api/experience-requests/route");
    expect((await POST(post(base()))).status).toBe(409);
  });

  it("寄信爆掉不影響已落庫的申請", async () => {
    const mod = await import("@/lib/email");
    const spy = vi.spyOn(mod, "sendRequestReceivedEmail").mockRejectedValue(new Error("down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/experience-requests/route");
    expect((await POST(post(base()))).status).toBe(200);
    expect(inserted).toHaveLength(1);
    spy.mockRestore(); errSpy.mockRestore();
  });
});

describe("自助查詢與撤回", () => {
  const ctx = (token: string) => ({ params: Promise.resolve({ token }) });

  it("token 不存在 → 404", async () => {
    requestRow = null;
    const { GET } = await import("@/app/api/experience-requests/[token]/route");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((await GET({} as any, ctx("nope"))).status).toBe(404);
  });

  it("查詢回應不含 admin_note 與其他人的資料", async () => {
    requestRow = {
      request_no: "R2608-AAAA", status: "pending",
      preferred_date: plus(20), preferred_start_time: "14:00",
      alt_date: null, alt_start_time: null,
      headcount: 3, is_private: false, contact_name: "小江",
      token_expires_at: null, session_id: null, created_at: "2026-08-22T00:00:00Z",
      admin_note: "這個客人上次放鳥",       // 就算 DB 回了也不能出現在回應裡
      experience_types: {
        id: 1, slug: "tea-ceremony", name: "茶藝體驗", name_en: "Tea Ceremony",
        price: 800, max_participants: 20, request_min_slots: 4, request_lead_days: 7,
      },
    };
    const { GET } = await import("@/app/api/experience-requests/[token]/route");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j = await (await GET({} as any, ctx("tok"))).json();
    expect(JSON.stringify(j)).not.toContain("放鳥");
    expect(j.adminNote).toBeUndefined();
    expect(j.slots).toBe(4);
    expect(j.total).toBe(3200);
  });

  it("pending 可以撤回", async () => {
    requestRow = { id: "r1", status: "pending" };
    const { DELETE } = await import("@/app/api/experience-requests/[token]/route");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await DELETE({} as any, ctx("tok"));
    expect(res.status).toBe(200);
    expect(updated[0]).toEqual({ status: "withdrawn" });
  });

  it("已核准不能自行撤回（他可能已經付款了）→ 409", async () => {
    requestRow = { id: "r1", status: "approved" };
    const { DELETE } = await import("@/app/api/experience-requests/[token]/route");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await DELETE({} as any, ctx("tok"));
    expect(res.status).toBe(409);
    expect(updated).toHaveLength(0);
  });

  it("終局狀態也不能撤回", async () => {
    const { DELETE } = await import("@/app/api/experience-requests/[token]/route");
    for (const s of ["declined", "expired", "withdrawn", "converted"]) {
      requestRow = { id: "r1", status: s };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((await DELETE({} as any, ctx("tok"))).status).toBe(409);
    }
  });
});
