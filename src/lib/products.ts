import { supabase } from "./supabase";
import type { Product } from "@/types";

/**
 * PostgREST 對不存在的欄位排序會讓**整個查詢失敗**（42703），而不是忽略排序
 * ——也就是說「程式先於 SQL 部署」會讓商品列表變成空的。這是實跑 dev server
 * 才看得到的缺陷：tsc 綠、單元測試綠，畫面卻是空的。
 *
 * 所以帶新排序欄位的查詢一律先試新的、遇到 42703 才退回舊查法。
 * **壞掉的方向要是安全的**——退回 id 順序（跟現在一樣），不是整頁空白。
 *
 * `UNDEFINED_COLUMN` 分辨「該退回舊查法」與「真的壞了」——只有前者靜默
 * 退回，其他錯誤照樣印出來，不要讓這層退路吃掉真正的故障。
 * 回歸測試：src/__tests__/experiences/ordering-fallback.test.ts
 */
const UNDEFINED_COLUMN = "42703";

export async function getProducts(): Promise<Product[]> {
  const sorted = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { nullsFirst: false })
    .order("id");

  if (!sorted.error && sorted.data) return sorted.data.map(mapRow);

  if (sorted.error?.code !== UNDEFINED_COLUMN) {
    console.error("讀取產品失敗:", sorted.error);
    return [];
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("id");

  if (error || !data) {
    console.error("讀取產品失敗:", error);
    return [];
  }
  return data.map(mapRow);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const sorted = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .eq("featured", true)
    .order("sort_order", { nullsFirst: false })
    .order("id");

  if (!sorted.error && sorted.data) return sorted.data.map(mapRow);

  if (sorted.error?.code !== UNDEFINED_COLUMN) {
    console.error("讀取精選產品失敗:", sorted.error);
    return [];
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .eq("featured", true)
    .order("id");

  if (error || !data) {
    console.error("讀取精選產品失敗:", error);
    return [];
  }
  return data.map(mapRow);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Product {
  const price = row.price as number;
  return {
    id:            row.id,
    name:          row.name,
    nameEn:        row.name_en,
    category:      row.category,
    origin:        row.origin,
    altitude:      row.altitude && /^\d+$/.test(String(row.altitude).trim())
                    ? `${String(row.altitude).trim()}m`
                    : row.altitude,
    price,
    weight:        row.weight,
    description:   row.description,
    descriptionEn: row.description_en || "",
    originEn:      row.origin_en || "",
    color:         row.color,
    featured:      row.featured,
    image:         (row.gallery?.[0]) || row.image_url  || undefined,
    image2:        (row.gallery?.[1]) || row.image_url2 || undefined,
    // null → undefined（null = 資料庫未設定，視同不限量；0 = 明確售完）
    stockQuantity: row.stock_quantity ?? undefined,
    price75g:    row.price_75g    ?? Math.round(price * 0.6 / 10) * 10,
    priceTeaBag: row.price_tea_bag ?? Math.round(price * 0.7 / 10) * 10,
    stock75g:    row.stock_75g    != null ? row.stock_75g    : undefined,
    stockTeaBag: row.stock_tea_bag != null ? row.stock_tea_bag : undefined,
  };
}
