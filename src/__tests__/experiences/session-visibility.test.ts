import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 私人場次不得出現在公開月曆。
 *
 * 核准開課請求時會建立 `visibility = 'private'` 的場次——只有拿到專屬連結的
 * 人看得到，申請人付款後才轉 public。**這條過濾若失效，等於把還沒成立的
 * 私人包場公開在月曆上**，而且是最容易在後續重構中被順手拿掉的一行。
 *
 * 另外釘住：`visibility` 欄位還不存在時（SQL 未執行）不能讓整個查詢失敗——
 * PostgREST 對不存在的欄位過濾會回 42703，月曆會變成空的。products 已經
 * 踩過同一個坑（ordering-fallback.test.ts）。
 */

interface Row { id: string; visibility?: string; session_date: string }

let rows: Row[] = [];
let filterError: { code?: string; message: string } | null = null;
const queries: { filters: string[] }[] = [];

vi.mock("@/lib/supabase", () => {
  const chain = (table: string) => {
    const st = { filters: [] as string[] };
    const c: Record<string, unknown> = {};
    const settle = () => {
      queries.push({ filters: [...st.filters] });
      if (st.filters.includes("visibility") && filterError) {
        return Promise.resolve({ data: null, error: filterError });
      }
      if (table === "experience_types") {
        return Promise.resolve({ data: { id: 6, min_participants: 4, max_participants: 20 }, error: null });
      }
      // 真實的 PostgREST 會照過濾條件回資料；這裡模擬「有過濾就只回 public」
      const visible = st.filters.includes("visibility")
        ? rows.filter(r => r.visibility !== "private")
        : rows;
      return Promise.resolve({ data: visible, error: null });
    };
    c.select = () => c;
    c.eq = (col: string) => { st.filters.push(col); return c; };
    c.gte = () => c;
    c.lte = () => c;
    c.order = () => c;
    c.single = settle;
    c.then = (res: unknown, rej: unknown) => (settle() as Promise<unknown>).then(res as never, rej as never);
    return c;
  };
  return { supabase: { from: (t: string) => chain(t) } };
});

const req = () =>
  new NextRequest("http://localhost/api/experience-sessions?slug=cattle-egret-tour&year=2026&month=9");

beforeEach(() => {
  queries.length = 0;
  filterError = null;
  rows = [
    { id: "s1", visibility: "public",  session_date: "2026-09-05" },
    { id: "s2", visibility: "public",  session_date: "2026-09-12" },
    { id: "s3", visibility: "private", session_date: "2026-09-20" },
  ];
});

describe("公開月曆", () => {
  it("只回公開場次——私人場次不得出現", async () => {
    const { GET } = await import("@/app/api/experience-sessions/route");
    const res = await GET(req());
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(list.map((s: { id: string }) => s.id)).toEqual(["s1", "s2"]);
  });

  it("查詢真的有帶 visibility 過濾（不是碰巧資料裡沒有私人場次）", async () => {
    const { GET } = await import("@/app/api/experience-sessions/route");
    await GET(req());
    const sessionQuery = queries.find(q => q.filters.includes("experience_type_id"));
    expect(sessionQuery?.filters).toContain("visibility");
  });

  it("私人場次轉公開後就會出現", async () => {
    rows = rows.map(r => (r.id === "s3" ? { ...r, visibility: "public" } : r));
    const { GET } = await import("@/app/api/experience-sessions/route");
    const list = await (await GET(req())).json();
    expect(list.map((s: { id: string }) => s.id)).toEqual(["s1", "s2", "s3"]);
  });
});

describe("欄位還不存在時的退路", () => {
  it("visibility 欄位不存在（42703）→ 退回不帶過濾的查法，月曆不會變空", async () => {
    filterError = { code: "42703", message: "column experience_sessions.visibility does not exist" };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { GET } = await import("@/app/api/experience-sessions/route");
    const res = await GET(req());
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(list).toHaveLength(3);     // 退回舊行為：全部回傳
    warn.mockRestore();
  });

  it("其他錯誤不會被退路吃掉", async () => {
    filterError = { code: "08006", message: "connection failure" };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { GET } = await import("@/app/api/experience-sessions/route");
    const res = await GET(req());
    expect(res.status).toBe(500);
    warn.mockRestore();
  });
});
