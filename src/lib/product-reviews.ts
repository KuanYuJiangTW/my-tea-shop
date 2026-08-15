import { supabase } from "./supabase";
import type { ProductReview, ReviewSource } from "./product-review-core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ProductReview {
  return {
    id:          row.id,
    productId:   row.product_id,
    rating:      row.rating,
    comment:     row.comment ?? null,
    source:      row.source as ReviewSource,
    displayName: row.display_name ?? null,
    reviewedAt:  row.reviewed_at ?? row.created_at,
  };
}

const SELECT = "id, product_id, rating, comment, source, display_name, reviewed_at, created_at";

/**
 * 全站可見的商品評價，依商品分組。
 *
 * `supabase` 用的是 service role，會繞過 RLS，所以 `is_visible` 必須在查詢裡
 * 自己過濾（同 `ExperienceReviews.tsx` 的作法）。
 *
 * 查詢失敗一律回空 Map：`product_reviews` 要業主在 Supabase 手動執行 DDL 才會
 * 存在，表還沒建之前前台就當作「沒有評價」，不該讓 /products 整頁掛掉。
 */
export async function getVisibleProductReviews(): Promise<Map<number, ProductReview[]>> {
  const { data, error } = await supabase
    .from("product_reviews")
    .select(SELECT)
    .eq("is_visible", true)
    .order("reviewed_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    if (error) console.warn("讀取商品評價失敗（表可能尚未建立）:", error.message);
    return new Map();
  }

  const grouped = new Map<number, ProductReview[]>();
  for (const row of data) {
    const review = mapRow(row);
    const list = grouped.get(review.productId);
    if (list) list.push(review);
    else grouped.set(review.productId, [review]);
  }
  return grouped;
}

/** 單一商品的可見評價（供未來的商品詳情頁使用）。 */
export async function getProductReviews(productId: number): Promise<ProductReview[]> {
  const { data, error } = await supabase
    .from("product_reviews")
    .select(SELECT)
    .eq("product_id", productId)
    .eq("is_visible", true)
    .order("reviewed_at", { ascending: false })
    .limit(20);

  if (error || !data) {
    if (error) console.warn("讀取商品評價失敗（表可能尚未建立）:", error.message);
    return [];
  }
  return data.map(mapRow);
}
