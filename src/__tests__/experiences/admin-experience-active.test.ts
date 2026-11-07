import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 後台體驗上架／下架 API（openspec experience-visibility-toggle）。
 *
 * 要釘住的三件事：
 *   1. body 只接受 `{ is_active: boolean }`——多帶 price 之類的欄位要 400，
 *      這支不能變成「改任何欄位」的後門
 *   2. 成功才清快取；資料庫更新失敗時不清（清了也沒用，還會打一波無謂的重建）
 *   3. 查無此體驗回 404，而不是假裝成功
 * 登入保護由 route-auth-coverage.test.ts 自動掃描涵蓋。
 */

vi.mock("@/lib/admin-auth-guard", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withAdminAuth: (handler: any) => handler,
}));

const revalidated: unknown[][] = [];
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => { revalidated.push(args); },
}));

const updates: unknown[] = [];
let nextResult: { data: unknown; error: { message: string } | null } = { data: [], error: null };

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => {
      const c: Record<string, unknown> = {};
      c.update = (payload: unknown) => { updates.push(payload); return c; };
      c.eq = () => c;
      c.select = () => Promise.resolve(nextResult);
      return c;
    },
  },
}));

function patch(id: string, body: unknown) {
  return [
    new NextRequest(`http://localhost/api/admin/experience-types/${id}`, {
      method: "PATCH",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ id }) },
  ] as const;
}

beforeEach(() => {
  revalidated.length = 0;
  updates.length = 0;
  nextResult = { data: [{ id: 3, slug: "tea-picking", is_active: false }], error: null };
});

describe("PATCH /api/admin/experience-types/[id]", () => {
  it("下架 → 200，只更新 is_active，並清全站快取", async () => {
    const { PATCH } = await import("@/app/api/admin/experience-types/[id]/route");
    const res = await PATCH(...patch("3", { is_active: false }));

    expect(res.status).toBe(200);
    expect(updates).toEqual([{ is_active: false }]);
    expect(revalidated).toEqual([["/", "layout"]]);
  });

  it("上架 → 200", async () => {
    nextResult = { data: [{ id: 3, slug: "tea-picking", is_active: true }], error: null };
    const { PATCH } = await import("@/app/api/admin/experience-types/[id]/route");
    const res = await PATCH(...patch("3", { is_active: true }));

    expect(res.status).toBe(200);
    expect(updates).toEqual([{ is_active: true }]);
  });

  it.each([
    ["is_active 是字串", { is_active: "false" }],
    ["is_active 缺漏", {}],
    ["多帶 price", { is_active: true, price: 1 }],
    ["body 是陣列", [true]],
  ])("%s → 400，不更新、不清快取", async (_label, body) => {
    const { PATCH } = await import("@/app/api/admin/experience-types/[id]/route");
    const res = await PATCH(...patch("3", body));

    expect(res.status).toBe(400);
    expect(updates).toHaveLength(0);
    expect(revalidated).toHaveLength(0);
  });

  it("body 不是 JSON → 400", async () => {
    const { PATCH } = await import("@/app/api/admin/experience-types/[id]/route");
    const res = await PATCH(...patch("3", "not json"));
    expect(res.status).toBe(400);
  });

  it("id 不是數字 → 400", async () => {
    const { PATCH } = await import("@/app/api/admin/experience-types/[id]/route");
    const res = await PATCH(...patch("abc", { is_active: false }));
    expect(res.status).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it("查無此體驗 → 404，不清快取", async () => {
    nextResult = { data: [], error: null };
    const { PATCH } = await import("@/app/api/admin/experience-types/[id]/route");
    const res = await PATCH(...patch("999", { is_active: false }));

    expect(res.status).toBe(404);
    expect(revalidated).toHaveLength(0);
  });

  it("資料庫更新失敗 → 500，不清快取", async () => {
    nextResult = { data: null, error: { message: "boom" } };
    const { PATCH } = await import("@/app/api/admin/experience-types/[id]/route");
    const res = await PATCH(...patch("3", { is_active: false }));

    expect(res.status).toBe(500);
    expect(revalidated).toHaveLength(0);
  });
});
