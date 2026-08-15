import { supabase } from "@/lib/supabase";
import ProductReviewsClient, { type AdminProductReview } from "./ProductReviewsClient";

export const dynamic = "force-dynamic";

/**
 * 後台的商品評價管理。
 *
 * 階段一的重點是**手動建檔既有口碑**（LINE／FB），所以這頁除了列表還有新增表單，
 * 與只能切顯示狀態的「評價管理」（體驗）不同。
 */
export default async function AdminProductReviewsPage() {
  const [{ data: reviews, error }, { data: products }] = await Promise.all([
    supabase
      .from("product_reviews")
      .select(
        `id, product_id, rating, comment, source, display_name, source_note,
         reviewed_at, is_visible, products ( name )`,
      )
      .order("reviewed_at", { ascending: false }),
    supabase
      .from("products")
      .select("id, name")
      .eq("is_active", true)
      .order("id"),
  ]);

  // 表要業主在 Supabase 手動執行 DDL 才會存在——沒建之前給明確指引，
  // 而不是丟一個看不懂的 PostgREST 錯誤碼
  if (error) {
    return (
      <div className="p-6 sm:p-8">
        <h1 className="font-serif text-2xl font-bold text-tea-text mb-4">商品評價</h1>
        <div className="bg-white rounded-2xl border border-tea-cream-dark p-6 text-sm leading-relaxed">
          <p className="text-red-500 font-medium mb-2">尚未建立 product_reviews 資料表</p>
          <p className="text-tea-text-light">
            請到 Supabase 的 SQL Editor 執行專案裡的{" "}
            <code className="bg-tea-cream px-1.5 py-0.5 rounded">supabase/add_product_reviews.sql</code>
            ，執行完重新整理本頁即可。
          </p>
          <p className="text-tea-text-faint text-xs mt-3">原始錯誤：{error.message}</p>
        </div>
      </div>
    );
  }

  const rows = (reviews ?? []) as unknown as (Omit<AdminProductReview, "productName"> & {
    products: { name: string } | null;
  })[];

  return (
    <ProductReviewsClient
      products={(products ?? []) as { id: number; name: string }[]}
      initialReviews={rows.map(({ products: p, ...r }) => ({
        ...r,
        productName: p?.name ?? `#${r.product_id}`,
      }))}
    />
  );
}
