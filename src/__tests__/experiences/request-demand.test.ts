import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 公開月曆的需求標記。
 *
 * 兩條硬性不變量：
 *   1. **回應不含任何個資**——這是公開端點，任何人都打得到
 *   2. **累計未滿 2 人不顯示**——「只有你想」是負面社會證明，會降低而不是
 *      提高附議意願。門檻設 2 讓標記出現時永遠是正向訊號
 */

let typeRow: Record<string, unknown> | null = { id: 6, accepts_requests: true };
let requests: Record<string, unknown>[] = [];
let tableMissing = false;

vi.mock("@/lib/supabase", () => {
  const chain = (table: string) => {
    const c: Record<string, unknown> = {};
    const settle = () => {
      if (table === "experience_types") {
        return Promise.resolve({ data: typeRow, error: typeRow ? null : { message: "not found" } });
      }
      if (tableMissing) return Promise.resolve({ data: null, error: { code: "42P01", message: "missing" } });
      return Promise.resolve({ data: requests, error: null });
    };
    c.select = () => c;
    c.eq = () => c;
    c.in = () => c;
    c.gte = () => c;
    c.lte = () => c;
    c.single = settle;
    c.then = (res: unknown, rej: unknown) => (settle() as Promise<unknown>).then(res as never, rej as never);
    return c;
  };
  return { supabase: { from: (t: string) => chain(t) } };
});

const req = (qs = "slug=cattle-egret-tour&year=2026&month=9") =>
  new NextRequest(`http://localhost/api/experience-requests/demand?${qs}`);

beforeEach(() => {
  typeRow = { id: 6, accepts_requests: true };
  requests = [];
  tableMissing = false;
});

describe("顯示門檻", () => {
  it("累計 1 人 → 不顯示（負面社會證明）", async () => {
    requests = [{ preferred_date: "2026-09-20", preferred_start_time: "14:00:00", headcount: 1 }];
    const { GET } = await import("@/app/api/experience-requests/demand/route");
    expect(await (await GET(req())).json()).toEqual([]);
  });

  it("累計 2 人 → 顯示", async () => {
    requests = [
      { preferred_date: "2026-09-20", preferred_start_time: "14:00:00", headcount: 1 },
      { preferred_date: "2026-09-20", preferred_start_time: "14:00:00", headcount: 1 },
    ];
    const { GET } = await import("@/app/api/experience-requests/demand/route");
    const j = await (await GET(req())).json();
    expect(j).toEqual([{ date: "2026-09-20", startTime: "14:00", headcount: 2, requestCount: 2 }]);
  });

  it("同一天不同時段分開算", async () => {
    requests = [
      { preferred_date: "2026-09-20", preferred_start_time: "10:00:00", headcount: 3 },
      { preferred_date: "2026-09-20", preferred_start_time: "14:00:00", headcount: 1 },
    ];
    const { GET } = await import("@/app/api/experience-requests/demand/route");
    const j = await (await GET(req())) .json();
    expect(j).toHaveLength(1);           // 14:00 那組只有 1 人，被濾掉
    expect(j[0].startTime).toBe("10:00");
  });
});

describe("不外洩個資", () => {
  it("回應只有日期、時段、人數、筆數", async () => {
    requests = [
      { preferred_date: "2026-09-20", preferred_start_time: "14:00:00", headcount: 4,
        contact_name: "小江", contact_email: "a@b.com", contact_phone: "0972619391" },
    ];
    const { GET } = await import("@/app/api/experience-requests/demand/route");
    const body = JSON.stringify(await (await GET(req())).json());
    expect(body).not.toContain("小江");
    expect(body).not.toContain("a@b.com");
    expect(body).not.toContain("0972619391");
    expect(Object.keys(JSON.parse(body)[0]).sort())
      .toEqual(["date", "headcount", "requestCount", "startTime"]);
  });
});

describe("不該顯示標記的情況", () => {
  it("該款沒開放申請 → 空陣列（不然會讓人以為可以申請）", async () => {
    typeRow = { id: 6, accepts_requests: false };
    requests = [{ preferred_date: "2026-09-20", preferred_start_time: "14:00:00", headcount: 5 }];
    const { GET } = await import("@/app/api/experience-requests/demand/route");
    expect(await (await GET(req())).json()).toEqual([]);
  });

  it("資料表還沒建立 → 安靜地回空陣列，月曆不該因為附加功能而壞掉", async () => {
    tableMissing = true;
    const { GET } = await import("@/app/api/experience-requests/demand/route");
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("缺參數 → 400", async () => {
    const { GET } = await import("@/app/api/experience-requests/demand/route");
    expect((await GET(req("slug=x"))).status).toBe(400);
  });
});
