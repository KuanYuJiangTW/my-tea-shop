import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 「想來但沒訂到」需求登記 API 的驗證行為（客製開課請求 Phase 0）。
 *
 * 這支是**公開端點**，任何人都打得到，所以防濫用的每一條都要有測試守住：
 * honeypot 必須靜默丟棄（回 200 但不寫庫，否則機器人知道自己被擋就會換招）、
 * 限流要回 429、聯絡方式至少一個。
 *
 * 另外釘住一條容易被「修好」成錯誤行為的：**重複登記回 200 而不是錯誤**。
 * 對客人來說「我登記過了」跟「登記成功」是同一件事，回錯誤只會讓人一直重按。
 */

const inserted: Record<string, unknown>[] = [];
let insertError: { code?: string; message: string } | null = null;
let rateLimitOk = true;
const emailsSent: unknown[] = [];

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: () => "1.2.3.4",
  rateLimit: async () => rateLimitOk,
}));

vi.mock("@/lib/email", () => ({
  sendExperienceInterestEmail: async (d: unknown) => { emailsSent.push(d); },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        if (table === "experience_interest") inserted.push(row);
        return Promise.resolve({ error: insertError });
      },
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: { name: "萬鷺朝鳳・茶山導覽" }, error: null }) }),
      }),
    }),
  },
}));

const post = (body: unknown) =>
  new NextRequest("http://localhost/api/experience-interest", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

const ok = { experienceTypeId: 6, contactEmail: "a@b.com" };

beforeEach(() => {
  inserted.length = 0;
  emailsSent.length = 0;
  insertError = null;
  rateLimitOk = true;
});

describe("防濫用", () => {
  it("honeypot 有值 → 回 200 但不寫庫、不寄信", async () => {
    const { POST } = await import("@/app/api/experience-interest/route");
    const res = await POST(post({ ...ok, website: "http://spam" }));
    expect(res.status).toBe(200);
    expect(inserted).toHaveLength(0);
    expect(emailsSent).toHaveLength(0);
  });

  it("超過限流 → 429，且不寫庫", async () => {
    rateLimitOk = false;
    const { POST } = await import("@/app/api/experience-interest/route");
    const res = await POST(post(ok));
    expect(res.status).toBe(429);
    expect(inserted).toHaveLength(0);
  });
});

describe("欄位驗證", () => {
  it("Email 與 LINE 都沒填 → 400", async () => {
    const { POST } = await import("@/app/api/experience-interest/route");
    const res = await POST(post({ experienceTypeId: 6 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("至少留一個");
  });

  it("只填 LINE 也可以", async () => {
    const { POST } = await import("@/app/api/experience-interest/route");
    const res = await POST(post({ experienceTypeId: 6, contactLine: "wujue" }));
    expect(res.status).toBe(200);
    expect(inserted[0].contact_line).toBe("wujue");
    expect(inserted[0].contact_email).toBeNull();
  });

  it("Email 格式不對 → 400", async () => {
    const { POST } = await import("@/app/api/experience-interest/route");
    expect((await POST(post({ experienceTypeId: 6, contactEmail: "not-an-email" }))).status).toBe(400);
  });

  it("缺體驗 id → 400", async () => {
    const { POST } = await import("@/app/api/experience-interest/route");
    expect((await POST(post({ contactEmail: "a@b.com" }))).status).toBe(400);
  });

  it("日期格式不對 → 400", async () => {
    const { POST } = await import("@/app/api/experience-interest/route");
    expect((await POST(post({ ...ok, preferredDate: "2026/10/11" }))).status).toBe(400);
  });

  it("人數超出 1–50 → 400", async () => {
    const { POST } = await import("@/app/api/experience-interest/route");
    expect((await POST(post({ ...ok, headcount: 0 }))).status).toBe(400);
    expect((await POST(post({ ...ok, headcount: 51 }))).status).toBe(400);
    expect((await POST(post({ ...ok, headcount: 2.5 }))).status).toBe(400);
  });

  it("source 灌入非法值 → 收斂成預設，不是報錯", async () => {
    const { POST } = await import("@/app/api/experience-interest/route");
    const res = await POST(post({ ...ok, source: "'; DROP TABLE --" }));
    expect(res.status).toBe(200);
    expect(inserted[0].source).toBe("no-date");
  });
});

describe("成功路徑", () => {
  it("完整填寫 → 寫庫並通知業主", async () => {
    const { POST } = await import("@/app/api/experience-interest/route");
    const res = await POST(post({
      experienceTypeId: 6, contactEmail: "a@b.com", contactLine: "wujue",
      preferredDate: "2026-10-05", headcount: 3, note: "帶長輩", source: "no-date", locale: "zh",
    }));
    expect(res.status).toBe(200);
    expect(inserted[0]).toMatchObject({
      experience_type_id: 6, contact_email: "a@b.com", contact_line: "wujue",
      preferred_date: "2026-10-05", headcount: 3, note: "帶長輩", source: "no-date",
    });
    expect(emailsSent).toHaveLength(1);
  });

  it("重複登記（DB unique 擋下）→ 回 200，不是錯誤", async () => {
    insertError = { code: "23505", message: "duplicate key" };
    const { POST } = await import("@/app/api/experience-interest/route");
    const res = await POST(post(ok));
    expect(res.status).toBe(200);
    expect((await res.json()).duplicate).toBe(true);
  });

  it("寄信爆掉不影響已落庫的成功回應", async () => {
    const mod = await import("@/lib/email");
    const spy = vi.spyOn(mod, "sendExperienceInterestEmail").mockRejectedValue(new Error("resend down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/experience-interest/route");
    const res = await POST(post(ok));
    expect(res.status).toBe(200);
    expect(inserted).toHaveLength(1);
    spy.mockRestore(); errSpy.mockRestore();
  });
});
