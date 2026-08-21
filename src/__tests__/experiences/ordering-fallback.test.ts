import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * 「程式先於 SQL 部署」的退路。
 *
 * 這條測試的由來是一個實跑才抓到的缺陷：PostgREST 對不存在的欄位排序會讓
 * **整個查詢失敗**（42703），而不是忽略排序。第一版把 `.order("sort_order")`
 * 加進 getProducts() 之後，商品列表在欄位還沒建好時直接變成空的——tsc 綠、
 * 單元測試綠、只有把 dev server 跑起來才看得到。
 *
 * 所以這裡釘的是**壞掉的方向**：欄位不存在時要退回 id 順序（跟現在一樣），
 * 不是整頁空白。
 */

type Row = Record<string, unknown>;

const PRODUCT_ROWS: Row[] = [
  { id: 2, name: "蜜香紅茶",       price: 400, is_active: true, featured: true },
  { id: 1, name: "阿里山高山烏龍", price: 400, is_active: true, featured: true },
];
const EXPERIENCE_ROWS: Row[] = [
  { id: 1, slug: "tea-ceremony",     name: "茶藝體驗",         name_en: "Tea Ceremony", price: 800, duration_hours: 2, max_participants: 20, min_participants: 4, requires_adult: false, is_active: true },
  { id: 6, slug: "cattle-egret-tour", name: "萬鷺朝鳳・茶山導覽", name_en: "Cattle Egret Tour", price: 450, duration_hours: 1.5, max_participants: 20, min_participants: 4, requires_adult: false, is_active: true },
];

/** 記錄每一次查詢用了什麼 select 與 order，讓斷言看得到「退回舊查法」真的發生 */
const queries: { table: string; cols: string; orders: string[] }[] = [];

function makeChain(table: string) {
  const st = { cols: "*", orders: [] as string[] };
  const chain: Record<string, unknown> = {};
  const settle = () => {
    queries.push({ table, cols: st.cols, orders: [...st.orders] });

    // 新欄位還沒建好的線上狀態：
    // - products 對 sort_order 排序 → 42703
    // - experience_types 嵌 experience_availability_windows → 找不到關聯
    if (table === "products" && st.orders.includes("sort_order")) {
      return Promise.resolve({ data: null, error: { code: "42703", message: "column products.sort_order does not exist" } });
    }
    if (table === "experience_types" && st.cols.includes("experience_availability_windows")) {
      return Promise.resolve({ data: null, error: { code: "PGRST200", message: "Could not find a relationship" } });
    }
    return Promise.resolve({
      data: table === "products" ? PRODUCT_ROWS : EXPERIENCE_ROWS,
      error: null,
    });
  };

  chain.select = (cols?: string) => { st.cols = cols ?? "*"; return chain; };
  chain.eq     = () => chain;
  chain.order  = (col: string) => { st.orders.push(col); return chain; };
  chain.then   = (res: unknown, rej: unknown) =>
    (settle() as Promise<unknown>).then(res as never, rej as never);
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabase: { from: (table: string) => makeChain(table) },
}));
vi.mock("./supabase", () => ({
  supabase: { from: (table: string) => makeChain(table) },
}));
vi.mock("@/sanity/client", () => ({ sanityFetch: () => Promise.reject(new Error("no sanity")) }));

beforeEach(() => { queries.length = 0; });

describe("欄位／資料表還沒建好時的退路", () => {
  it("getProducts：sort_order 不存在時退回 id 順序，不是空陣列", async () => {
    const { getProducts } = await import("@/lib/products");
    const rows = await getProducts();

    expect(rows.map(r => r.id)).toEqual([2, 1]);   // 資料原樣回來，沒有被吃掉
    expect(rows).toHaveLength(2);

    // 第一次帶 sort_order 失敗，第二次只用 id — 退路確實跑到了
    expect(queries.map(q => q.orders)).toEqual([["sort_order", "id"], ["id"]]);
  });

  it("getFeaturedProducts：同樣要退回，首頁的精選區不能變空", async () => {
    const { getFeaturedProducts } = await import("@/lib/products");
    const rows = await getFeaturedProducts();

    expect(rows).toHaveLength(2);
    expect(queries.map(q => q.orders)).toEqual([["sort_order", "id"], ["id"]]);
  });

  it("getExperienceTypes：季節表不存在時退回 id 順序，六款照樣列出來", async () => {
    const { getExperienceTypes } = await import("@/lib/experiences");
    const rows = await getExperienceTypes();

    expect(rows.map(r => r.id)).toEqual([1, 6]);
    expect(queries[0].cols).toContain("experience_availability_windows");
    expect(queries[1].cols).toBe("*");
  });

  it("退路只吃「欄位不存在」，其他錯誤不會被靜默吞掉", async () => {
    // 真的故障（例如連線失敗）時不該重試，而是照原本的行為回空陣列並記錄錯誤
    const { supabase } = await import("@/lib/supabase");
    const spy = vi.spyOn(supabase, "from").mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            order: () => Promise.resolve({ data: null, error: { code: "08006", message: "connection failure" } }),
          }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getProducts } = await import("@/lib/products");
    expect(await getProducts()).toEqual([]);
    expect(errSpy).toHaveBeenCalled();

    spy.mockRestore();
    errSpy.mockRestore();
  });
});
