import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 商品評價（階段一）：星等門檻、後台建檔的輸入驗證、審核路由的來源切換。
 *
 * 為什麼要打真的路由而不是只測純函式：`source` 必填是這套設計的誠實性所繫
 * （手動建檔的口碑若混進站內評價就是偽造），驗證若沒接到路由上等於沒做。
 */

const state = vi.hoisted(() => ({
  inserts: [] as { table: string; row: Record<string, unknown> }[],
  updates: [] as { table: string; patch: Record<string, unknown>; eq: [string, unknown][] }[],
}));

vi.mock("@/lib/admin-auth-guard", () => ({
  withAdminAuth: (handler: unknown) => handler,
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => ({
      insert(row: Record<string, unknown>) {
        state.inserts.push({ table, row });
        return {
          select: () => ({ single: async () => ({ data: { id: "rev-1" }, error: null }) }),
        };
      },
      update(patch: Record<string, unknown>) {
        const rec = { table, patch, eq: [] as [string, unknown][] };
        state.updates.push(rec);
        return {
          eq: async (col: string, val: unknown) => {
            rec.eq.push([col, val]);
            return { error: null };
          },
        };
      },
    }),
  },
}));

import { summarizeReviews, validateNewProductReview } from "@/lib/product-review-core";
import { POST } from "@/app/api/admin/product-reviews/route";
import { PATCH } from "@/app/api/admin/reviews/[id]/route";

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/admin/product-reviews", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

function patchReq(url: string, body: unknown) {
  return new NextRequest(url, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  state.inserts.length = 0;
  state.updates.length = 0;
});

describe("星等彙總的顯示門檻", () => {
  const r = (rating: number) => ({ rating });

  it("沒有評價時不顯示平均", () => {
    expect(summarizeReviews([])).toEqual({ count: 0, average: 0, showAverage: false });
  });

  it("1–2 則只給則數，不顯示平均", () => {
    expect(summarizeReviews([r(5)]).showAverage).toBe(false);
    expect(summarizeReviews([r(5), r(4)]).showAverage).toBe(false);
    expect(summarizeReviews([r(5), r(4)]).count).toBe(2);
  });

  it("滿 3 則才顯示平均，且四捨五入到一位小數", () => {
    const s = summarizeReviews([r(5), r(4), r(4)]);
    expect(s.showAverage).toBe(true);
    expect(s.count).toBe(3);
    expect(s.average).toBe(4.3);
  });
});

describe("後台建檔的輸入驗證", () => {
  const base = { product_id: 1, rating: 5, source: "line" };

  it("缺 source 不通過", () => {
    const res = validateNewProductReview({ product_id: 1, rating: 5 });
    expect(res.ok).toBe(false);
  });

  it("不合法的 source 不通過", () => {
    expect(validateNewProductReview({ ...base, source: "instagram" }).ok).toBe(false);
  });

  it("星等超出 1–5 不通過", () => {
    expect(validateNewProductReview({ ...base, rating: 0 }).ok).toBe(false);
    expect(validateNewProductReview({ ...base, rating: 6 }).ok).toBe(false);
    expect(validateNewProductReview({ ...base, rating: 4.5 }).ok).toBe(false);
  });

  it("缺商品不通過", () => {
    expect(validateNewProductReview({ rating: 5, source: "line" }).ok).toBe(false);
  });

  it("空字串欄位一律正規化成 null", () => {
    const res = validateNewProductReview({ ...base, comment: "  ", display_name: "", reviewed_at: "" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.comment).toBeNull();
      expect(res.value.display_name).toBeNull();
      expect(res.value.reviewed_at).toBeNull();
    }
  });
});

describe("POST /api/admin/product-reviews", () => {
  it("缺 source 回 400 且不寫入", async () => {
    const res = await POST(postReq({ product_id: 1, rating: 5, comment: "好喝" }));
    expect(res.status).toBe(400);
    expect(state.inserts).toHaveLength(0);
  });

  it("不合法的 source 回 400 且不寫入", async () => {
    const res = await POST(postReq({ product_id: 1, rating: 5, source: "ig" }));
    expect(res.status).toBe(400);
    expect(state.inserts).toHaveLength(0);
  });

  it("星等超出範圍回 400", async () => {
    const res = await POST(postReq({ product_id: 1, rating: 9, source: "line" }));
    expect(res.status).toBe(400);
    expect(state.inserts).toHaveLength(0);
  });

  it("完整欄位寫入 product_reviews 並回傳 id", async () => {
    const res = await POST(
      postReq({
        product_id:   3,
        rating:       5,
        comment:      "回甘很久",
        display_name: "王小姐",
        source:       "line",
        source_note:  "2026-07-12 LINE 對話",
        reviewed_at:  "2026-07-12",
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "rev-1" });
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0].table).toBe("product_reviews");
    expect(state.inserts[0].row).toMatchObject({
      product_id:  3,
      rating:      5,
      source:      "line",
      reviewed_at: "2026-07-12",
    });
  });

  it("沒填日期時不送 reviewed_at，交給 DB 的 default（欄位是 NOT NULL）", async () => {
    await POST(postReq({ product_id: 1, rating: 4, source: "facebook" }));
    expect(state.inserts[0].row).not.toHaveProperty("reviewed_at");
  });
});

describe("PATCH /api/admin/reviews/[id] 的來源切換", () => {
  it("帶 type=product 時改的是 product_reviews", async () => {
    const res = await PATCH(
      patchReq("http://localhost/api/admin/reviews/rev-1?type=product", { is_visible: false }),
      ctx("rev-1"),
    );
    expect(res.status).toBe(200);
    expect(state.updates[0].table).toBe("product_reviews");
    expect(state.updates[0].patch).toEqual({ is_visible: false });
    expect(state.updates[0].eq).toEqual([["id", "rev-1"]]);
  });

  it("沒帶 type 時維持既有行為，改 experience_reviews", async () => {
    const res = await PATCH(
      patchReq("http://localhost/api/admin/reviews/exp-1", { is_visible: true }),
      ctx("exp-1"),
    );
    expect(res.status).toBe(200);
    expect(state.updates[0].table).toBe("experience_reviews");
  });

  it("不合法的 type 回 400 且不寫入", async () => {
    const res = await PATCH(
      patchReq("http://localhost/api/admin/reviews/rev-1?type=bookings", { is_visible: false }),
      ctx("rev-1"),
    );
    expect(res.status).toBe(400);
    expect(state.updates).toHaveLength(0);
  });

  it("is_visible 不是布林值回 400 且不寫入", async () => {
    const res = await PATCH(
      patchReq("http://localhost/api/admin/reviews/rev-1?type=product", { is_visible: "false" }),
      ctx("rev-1"),
    );
    expect(res.status).toBe(400);
    expect(state.updates).toHaveLength(0);
  });
});
