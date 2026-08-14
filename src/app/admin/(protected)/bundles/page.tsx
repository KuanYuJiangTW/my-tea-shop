import { supabase } from "@/lib/supabase";
import { mapBundle } from "@/lib/bundle-core";
import BundlesClient from "./BundlesClient";

export const dynamic = "force-dynamic";

/**
 * 後台的組合管理。
 *
 * 與前台的 `getActiveBundles()` 差在**不過濾 `is_active`**——後台要看得到
 * 下架中的組合才能把它重新上架。
 */
export default async function AdminBundlesPage() {
  const { data, error } = await supabase
    .from("product_bundles")
    .select(
      `id, slug, name, name_en, description, description_en, price, is_active,
       product_bundle_items (
         product_id, spec, quantity,
         products ( name, name_en, stock_quantity, stock_75g, stock_tea_bag )
       )`,
    )
    .order("id", { ascending: true });

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-500 text-sm">載入組合失敗：{error.message}</p>
      </div>
    );
  }

  const bundles = (data ?? []).map((row) => ({
    ...mapBundle(row),
    isActive: row.is_active as boolean,
  }));

  return <BundlesClient initialBundles={bundles} />;
}
