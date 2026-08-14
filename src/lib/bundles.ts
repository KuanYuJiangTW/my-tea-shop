import { supabase } from "./supabase";
import { mapBundle } from "./bundle-core";
import type { Bundle } from "@/types";

/**
 * 組合商品（品飲組）的讀取。
 *
 * 純邏輯（可售量、對映）在 `bundle-core.ts`，這裡只負責查資料庫——
 * 與 `shipping.ts` / `shipping-constants.ts` 的分法一致。
 *
 * **扣庫存不在這裡**：那是 `decrement_bundle_stock` 這支 RPC 的事，
 * 必須在單一資料庫交易內完成才有「全成功或全不動」。應用層迴圈做不到，
 * 那正是 `orders/route.ts` 修正前的缺陷成因。
 */

export { calcBundleAvailable, mapBundle, stockForSpec } from "./bundle-core";

const BUNDLE_SELECT = `
  id, slug, name, name_en, description, description_en, price,
  product_bundle_items (
    product_id, spec, quantity,
    products ( name, name_en, stock_quantity, stock_75g, stock_tea_bag )
  )
`;

/** 讀取單一上架中的組合；找不到或未上架回 null */
export async function getBundleBySlug(slug: string): Promise<Bundle | null> {
  const { data, error } = await supabase
    .from("product_bundles")
    .select(BUNDLE_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("讀取組合失敗:", error);
    return null;
  }
  return mapBundle(data);
}

/** 讀取所有上架中的組合 */
export async function getActiveBundles(): Promise<Bundle[]> {
  const { data, error } = await supabase
    .from("product_bundles")
    .select(BUNDLE_SELECT)
    .eq("is_active", true)
    .order("id");

  if (error || !data) {
    if (error) console.error("讀取組合失敗:", error);
    return [];
  }
  return data.map(mapBundle);
}
