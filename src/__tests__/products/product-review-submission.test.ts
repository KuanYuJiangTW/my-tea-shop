import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * 站內留評的已購驗證（階段二）。
 *
 * `orders.items` 是 JSONB，測試資料刻意用**真實形狀**：同一個陣列裡混著單品
 * （`productId` 在頂層）與組合（`productId` 藏在 `bundleItems` 裡）。用簡化的
 * `[{ id: 1 }]` 之類的假資料測，會讓「組合買家不能留評」這種 bug 全綠通過。
 */

const state = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  order: null as Record<string, unknown> | null,
  orderError: null as unknown,
  insertError: null as { code?: string; message?: string } | null,
  inserts: [] as Record<string, unknown>[],
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "orders") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: state.order, error: state.orderError }),
            }),
          }),
        };
      }
      return {
        insert: (row: Record<string, unknown>) => {
          state.inserts.push(row);
          return {
            select: () => ({
              single: async () =>
                state.insertError
                  ? { data: null, error: state.insertError }
                  : { data: { id: "new-review" }, error: null },
            }),
          };
        },
      };
    },
  },
}));

import { POST } from "@/app/api/product-reviews/route";
import { collectOrderProducts, orderContainsProduct } from "@/lib/product-review-core";

/** 真實形狀：單品 productId 在頂層，組合的成分在 bundleItems 裡 */
const ITEMS = [
  { productId: 1, spec: "150g", name: "阿里山高山烏龍茶", quantity: 1, unitPrice: 400, subtotal: 400 },
  {
    bundleId: 1, name: "品飲組", quantity: 1, unitPrice: 650, subtotal: 650,
    bundleItems: [
      { productId: 2, productName: "蜜香紅茶", spec: "75g", quantity: 1 },
      { productId: 3, productName: "阿里山金萱茶", spec: "75g", quantity: 1 },
    ],
  },
];

const COMPLETED_ORDER = {
  id: "order-1",
  user_id: "user-1",
  order_status: "completed",
  items: ITEMS,
};

function req(body: unknown) {
  return new NextRequest("http://localhost/api/product-reviews", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

beforeEach(() => {
  state.user = { id: "user-1" };
  state.order = { ...COMPLETED_ORDER };
  state.orderError = null;
  state.insertError = null;
  state.inserts.length = 0;
});

describe("orderContainsProduct", () => {
  it("認得單品", () => {
    expect(orderContainsProduct(ITEMS, 1)).toBe(true);
  });

  it("認得組合裡的成分（品飲組買家也喝過那三款茶）", () => {
    expect(orderContainsProduct(ITEMS, 2)).toBe(true);
    expect(orderContainsProduct(ITEMS, 3)).toBe(true);
  });

  it("沒買過的回 false", () => {
    expect(orderContainsProduct(ITEMS, 99)).toBe(false);
  });

  it("items 不是陣列時回 false，不丟例外", () => {
    expect(orderContainsProduct(null, 1)).toBe(false);
    expect(orderContainsProduct({ productId: 1 }, 1)).toBe(false);
  });
});

describe("collectOrderProducts（會員中心的留評入口清單）", () => {
  it("單品與組合成分都列出，用各自的名稱", () => {
    expect(collectOrderProducts(ITEMS)).toEqual([
      { productId: 1, name: "阿里山高山烏龍茶" },
      { productId: 2, name: "蜜香紅茶" },
      { productId: 3, name: "阿里山金萱茶" },
    ]);
  });

  it("同一款茶在單品與組合裡各出現一次時只列一次（不會有兩顆留評按鈕）", () => {
    const dup = [
      { productId: 2, name: "蜜香紅茶", quantity: 1 },
      { bundleId: 1, name: "品飲組", bundleItems: [{ productId: 2, productName: "蜜香紅茶", spec: "75g", quantity: 1 }] },
    ];
    expect(collectOrderProducts(dup)).toEqual([{ productId: 2, name: "蜜香紅茶" }]);
  });

  it("items 是 null 時回空陣列", () => {
    expect(collectOrderProducts(null)).toEqual([]);
  });
});

describe("POST /api/product-reviews", () => {
  it("未登入回 401", async () => {
    state.user = null;
    const res = await POST(req({ orderId: "order-1", productId: 1, rating: 5 }));
    expect(res.status).toBe(401);
    expect(state.inserts).toHaveLength(0);
  });

  it("訂單不屬於本人回 403", async () => {
    state.order = { ...COMPLETED_ORDER, user_id: "someone-else" };
    const res = await POST(req({ orderId: "order-1", productId: 1, rating: 5 }));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "無權限" });
    expect(state.inserts).toHaveLength(0);
  });

  it("訂單尚未完成回 409", async () => {
    state.order = { ...COMPLETED_ORDER, order_status: "preparing" };
    const res = await POST(req({ orderId: "order-1", productId: 1, rating: 5 }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "訂單尚未完成，無法留評" });
    expect(state.inserts).toHaveLength(0);
  });

  it("訂單不含此商品回 409（拿一筆已完成訂單評遍全店）", async () => {
    const res = await POST(req({ orderId: "order-1", productId: 99, rating: 5 }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "這筆訂單沒有這項商品" });
    expect(state.inserts).toHaveLength(0);
  });

  it("找不到訂單回 404", async () => {
    state.order = null;
    state.orderError = { message: "no rows" };
    const res = await POST(req({ orderId: "nope", productId: 1, rating: 5 }));
    expect(res.status).toBe(404);
  });

  it("評分超出 1–5 回 400", async () => {
    for (const rating of [0, 6, 4.5, "5"]) {
      const res = await POST(req({ orderId: "order-1", productId: 1, rating }));
      expect(res.status).toBe(400);
    }
    expect(state.inserts).toHaveLength(0);
  });

  it("成功寫入並回傳 id；留言選填", async () => {
    const res = await POST(req({ orderId: "order-1", productId: 1, rating: 5 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "new-review" });
    expect(state.inserts[0]).toMatchObject({
      product_id: 1,
      order_id:   "order-1",
      user_id:    "user-1",
      rating:     5,
      comment:    null,
      source:     "site",
    });
  });

  it("組合裡的商品也能留評", async () => {
    const res = await POST(req({ orderId: "order-1", productId: 2, rating: 4, comment: "蜜香明顯" }));
    expect(res.status).toBe(200);
    expect(state.inserts[0]).toMatchObject({ product_id: 2, comment: "蜜香明顯" });
  });

  it("請求帶 source 也一律寫成 site", async () => {
    await POST(req({ orderId: "order-1", productId: 1, rating: 5, source: "line" }));
    expect(state.inserts[0].source).toBe("site");
  });

  it("重複留評由 UNIQUE 擋下，23505 轉 409", async () => {
    state.insertError = { code: "23505", message: "duplicate key" };
    const res = await POST(req({ orderId: "order-1", productId: 1, rating: 5 }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "您已經評價過這項商品" });
  });
});
