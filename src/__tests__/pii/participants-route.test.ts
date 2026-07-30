import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// 這支測試驗證「遮罩與驗證真的接在 API 上」——pii.ts 單元測試正確，
// 不代表 route 有呼叫它。曾經的寫法是直接回傳 select("*") 的原始列。

const RAW_PARTICIPANT = {
  id: "p1",
  booking_id: "b1",
  is_primary: true,
  name: "王小明",
  id_number: "A123456789",
  date_of_birth: "1990-05-12",
  emergency_contact_name: "王大明",
  emergency_contact_phone: "0912345678",
};

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { from: (...a: unknown[]) => mockFrom(...a) },
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
  }),
}));

import { GET, POST } from "@/app/api/bookings/[id]/participants/route";

const BOOKING = {
  id: "b1",
  participant_count: 2,
  participants_due_at: new Date(Date.now() + 86_400_000).toISOString(),
  status: "confirmed",
};

// 追蹤是否真的寫入資料庫。route 在驗證前會先查 booking_participants 算人數，
// 所以「有沒有碰這張表」不是判準，「有沒有 insert」才是。
const insertSpy = vi.fn();

/** 依查詢的資料表回傳對應假資料 */
function wireSupabase(opts: { participants?: unknown[]; insertResult?: unknown } = {}) {
  mockFrom.mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {};
    const passthrough = ["select", "eq", "order", "in"];
    for (const m of passthrough) chain[m] = vi.fn(() => chain);
    chain.insert = vi.fn((...args: unknown[]) => { insertSpy(...args); return chain; });

    if (table === "experience_bookings") {
      chain.single = vi.fn().mockResolvedValue({ data: BOOKING, error: null });
    } else if (table === "booking_participants") {
      const rows = opts.participants ?? [];
      chain.single = vi.fn().mockResolvedValue({
        data: opts.insertResult ?? RAW_PARTICIPANT,
        error: null,
      });
      // GET 走 .order() 結尾（thenable）；count 查詢走 head:true
      (chain as { then?: unknown }).then = (res: (v: unknown) => void) =>
        Promise.resolve({ data: rows, error: null, count: rows.length }).then(res);
    }
    return chain;
  });
}

function makeParams() {
  return { params: Promise.resolve({ id: "b1" }) };
}

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/bookings/b1/participants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  name: "王小明",
  idNumber: "A123456789",
  dateOfBirth: "1990-05-12",
  emergencyContactName: "王大明",
  emergencyContactPhone: "0912-345-678",
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/bookings/[id]/participants", () => {
  it("回傳的參加者資料已遮罩，完整身分證號不出現在回應中", async () => {
    wireSupabase({ participants: [RAW_PARTICIPANT] });

    const res = await GET({} as NextRequest, makeParams());
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).not.toContain("A123456789");
    expect(text).not.toContain("1990-05-12");
    expect(text).not.toContain("0912345678");
    expect(text).toContain("A12*****89");
  });

  it("姓名仍保留，使用者才分得出是哪一位", async () => {
    wireSupabase({ participants: [RAW_PARTICIPANT] });

    const res = await GET({} as NextRequest, makeParams());
    const body = await res.json();

    expect(body.participants[0].name).toBe("王小明");
  });
});

describe("POST /api/bookings/[id]/participants — 欄位驗證", () => {
  it("身分證檢查碼錯誤時回 400，且不寫入資料庫", async () => {
    wireSupabase();

    const res = await POST(postReq({ ...VALID_BODY, idNumber: "A123456788" }), makeParams());

    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("姓名過長回 400", async () => {
    wireSupabase();
    const res = await POST(postReq({ ...VALID_BODY, name: "王".repeat(51) }), makeParams());
    expect(res.status).toBe(400);
  });

  it("出生日期為未來回 400", async () => {
    wireSupabase();
    const future = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
    const res = await POST(postReq({ ...VALID_BODY, dateOfBirth: future }), makeParams());
    expect(res.status).toBe(400);
  });

  it("電話含非數字字元回 400", async () => {
    wireSupabase();
    const res = await POST(postReq({ ...VALID_BODY, emergencyContactPhone: "0912-abc" }), makeParams());
    expect(res.status).toBe(400);
  });

  it("合法資料建立成功，且回應同樣是遮罩後的", async () => {
    wireSupabase();

    const res = await POST(postReq(VALID_BODY), makeParams());
    const text = await res.text();

    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledOnce();
    expect(text).not.toContain("A123456789");
    expect(text).toContain("A12*****89");
  });

  it("寫入資料庫的是正規化後的值（電話去除連字號、身分證轉大寫）", async () => {
    wireSupabase();

    await POST(postReq({ ...VALID_BODY, idNumber: "a123456789" }), makeParams());

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id_number: "A123456789", emergency_contact_phone: "0912345678" })
    );
  });
});
