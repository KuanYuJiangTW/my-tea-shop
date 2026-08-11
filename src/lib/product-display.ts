/**
 * 商品在購物流程裡的顯示字串（購物車／結帳共用）。
 *
 * 這裡刻意只做「顯示」：`Product` 上存的 `name`／`weight` 同時是**資料與判斷依據**
 * （`weight === "15包 × 3g"` 被拿來分辨茶包規格、對到 `stockTeaBag`，見 `CartClient`），
 * 所以絕對不能就地改成英文——只能在畫面上換一層皮。
 *
 * 客戶端專用：不要 import `lib/products.ts`（那支會拉進 service-role 的 supabase client）。
 */
import type { Product } from "@/types";

/** 茶包規格是前端合成的（`ProductCard`／`TeaBagCard`），不是 DB 欄位 */
const TEA_BAG_WEIGHT = "15包 × 3g";
const TEA_BAG_WEIGHT_EN = "15 bags × 3g";

/**
 * 商品名稱。`nameEn` 缺漏時回中文名——購物車存的是**下單當下的商品快照**
 * （`cart_items.product_data`），舊快照可能沒有這個欄位，不留 fallback 會顯示空白。
 *
 * 茶包組要特別處理：加入購物車時 `name` 被合成為「<茶名> 茶包組」
 * （`ProductCard`／`TeaBagCard`），但 **`nameEn` 沒跟著合成**，仍是基礎茶名。
 * 直接拿 `nameEn` 會讓英文版的茶包組與 150g 散茶同名、分不出是哪一項，
 * 所以英文版用 `weight` 判斷後自己補上後綴（`teaBagSetLabel` 由呼叫端從 messages 取，
 * 不在這裡寫死英文字串）。
 */
export function productDisplayName(
  product: Pick<Product, "name" | "weight"> & { nameEn?: string },
  isEn: boolean,
  teaBagSetLabel?: string,
): string {
  if (!isEn) return product.name;
  const base = product.nameEn || product.name;
  return product.weight === TEA_BAG_WEIGHT && teaBagSetLabel ? `${base} ${teaBagSetLabel}` : base;
}

/** 規格。目前只有茶包那組含中文，其餘（`150g`／`75g`）本來就是語系中立的 */
export function productDisplayWeight(weight: string, isEn: boolean): string {
  return isEn && weight === TEA_BAG_WEIGHT ? TEA_BAG_WEIGHT_EN : weight;
}

/** 產地。fallback 邏輯與 `ProductCard` 一致 */
export function productDisplayOrigin(product: Pick<Product, "origin"> & { originEn?: string }, isEn: boolean): string {
  return isEn ? (product.originEn || product.origin) : product.origin;
}
