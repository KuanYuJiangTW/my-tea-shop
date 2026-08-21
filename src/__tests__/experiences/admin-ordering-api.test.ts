import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 後台排序／季節 API 的驗證行為。
 *
 * 最重要的兩條是「釘選一定要有到期日」與「到期日不能早於今天」——那不是
 * 表單體貼，是 design.md D2 的核心：**沒有到期日的置頂將來一定會忘記撤下**，
 * 12 月的首頁第一張還掛著一個沒有場次的季節商品。UI 擋得住不算數，API 也要擋。
 */

vi.mock("@/lib/admin-auth-guard", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withAdminAuth: (handler: any) => handler,
}));

/** 下一次 DB 操作要回什麼。預設成功 */
let nextResult: { data: unknown; error: { code?: string; message: string } | null } = {
  data: [], error: null,
};

function chain() {
  const c: Record<string, unknown> = {};
  const settle = () => Promise.resolve(nextResult);
  for (const m of ["select", "update", "eq", "order", "insert", "delete"]) {
    c[m] = () => c;
  }
  c.single = settle;
  c.then = (res: unknown, rej: unknown) =>
    (settle() as Promise<unknown>).then(res as never, rej as never);
  return c;
}

vi.mock("@/lib/supabase", () => ({ supabase: { from: () => chain() } }));

const URL_BASE = "http://localhost/api/admin/experience-ordering";
const post = (body: unknown, method = "PATCH") =>
  new NextRequest(URL_BASE, {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

/** 台灣時間的今天，與 API 用的是同一支函式，測試不自己算日期 */
async function today() {
  const { taipeiToday } = await import("@/lib/experience-ordering");
  return taipeiToday();
}
function shiftDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

beforeEach(() => { nextResult = { data: [], error: null }; });

describe("釘選：到期日必填且不得在過去", () => {
  it("沒帶到期日 → 400", async () => {
    const { PATCH } = await import("@/app/api/admin/experience-ordering/route");
    const res = await PATCH(post({ id: 6, pinnedUntil: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("到期日");
  });

  it("到期日格式不對 → 400", async () => {
    const { PATCH } = await import("@/app/api/admin/experience-ordering/route");
    const res = await PATCH(post({ id: 6, pinnedUntil: "2026/10/11" }));
    expect(res.status).toBe(400);
  });

  it("到期日早於今天 → 400", async () => {
    const { PATCH } = await import("@/app/api/admin/experience-ordering/route");
    const res = await PATCH(post({ id: 6, pinnedUntil: shiftDays(await today(), -1) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("不能早於今天");
  });

  it("到期日就是今天 → 允許（當天仍算釘選中）", async () => {
    const { PATCH } = await import("@/app/api/admin/experience-ordering/route");
    const res = await PATCH(post({ id: 6, pinnedUntil: await today() }));
    expect(res.status).toBe(200);
  });

  it("傳 null 可以取消釘選", async () => {
    const { PATCH } = await import("@/app/api/admin/experience-ordering/route");
    const res = await PATCH(post({ id: 6, pinnedUntil: null }));
    expect(res.status).toBe(200);
  });
});

describe("季節區間", () => {
  it("結束日早於開始日 → 400", async () => {
    const { POST } = await import("@/app/api/admin/experience-ordering/route");
    const res = await POST(post(
      { experienceTypeId: 6, startDate: "2026-10-11", endDate: "2026-08-18" }, "POST",
    ));
    expect(res.status).toBe(400);
  });

  it("與既有區間重疊（DB 的 EXCLUDE 擋下）→ 409，訊息說得出原因", async () => {
    nextResult = { data: null, error: { code: "23P01", message: "conflicting key value" } };
    const { POST } = await import("@/app/api/admin/experience-ordering/route");
    const res = await POST(post(
      { experienceTypeId: 6, startDate: "2026-09-01", endDate: "2026-09-30" }, "POST",
    ));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("重疊");
  });

  it("合法區間 → 200", async () => {
    nextResult = { data: { id: "x" }, error: null };
    const { POST } = await import("@/app/api/admin/experience-ordering/route");
    const res = await POST(post(
      { experienceTypeId: 6, startDate: "2026-08-18", endDate: "2026-10-11", note: "萬鷺朝鳳鳥況期" }, "POST",
    ));
    expect(res.status).toBe(200);
  });
});

describe("SQL 還沒執行時的提示", () => {
  it("資料表不存在 → 503，並直接告訴業主要執行哪一支 SQL", async () => {
    nextResult = { data: null, error: { code: "42P01", message: "relation does not exist" } };
    const { GET } = await import("@/app/api/admin/experience-ordering/route");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await GET(new NextRequest(URL_BASE) as any);
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain("add_experience_ordering.sql");
  });
});
