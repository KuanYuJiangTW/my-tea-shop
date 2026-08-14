import type { Bundle, BundleItem, ProductSpec } from "@/types";

/**
 * 組合商品的**純邏輯**：可售量計算與資料列對映。
 *
 * 與 `bundles.ts`（負責查資料庫）分開的理由，跟
 * `shipping-constants.ts` 之於 `shipping.ts` 是同一個：這裡不 import
 * `./supabase`，所以單元測試不需要 Supabase 環境變數就能載入。
 * 一旦純函式跟 DB client 綁在同一個模組，測試就得先 mock 一個它根本用不到的東西。
 */

/** 依規格取該成分的庫存欄位。null → undefined，語意是「未設定＝不限量」 */
export function stockForSpec(
  row: { stock_quantity?: number | null; stock_75g?: number | null; stock_tea_bag?: number | null },
  spec: ProductSpec,
): number | undefined {
  const raw =
    spec === "75g" ? row.stock_75g : spec === "teabag" ? row.stock_tea_bag : row.stock_quantity;
  return raw ?? undefined;
}

/**
 * 可售量＝各成分「還能組出幾組」的最小值。
 *
 * 庫存為 `undefined`（資料庫沒設）代表不限量，該成分不參與最小值計算——
 * 與 `orders/route.ts` 的 `stock !== null && stock < qty` 同一套語意。
 * 全部成分都不限量時回傳 `undefined`，呼叫端據此不顯示數量上限。
 *
 * **沒有成分的組合回 0，不是不限量**：那是設定錯誤，不能當成無限供應。
 */
export function calcBundleAvailable(items: BundleItem[]): number | undefined {
  if (items.length === 0) return 0;

  const limits = items
    .filter((i) => i.stock !== undefined)
    .map((i) => Math.floor((i.stock as number) / i.quantity));

  if (limits.length === 0) return undefined;
  return Math.max(0, Math.min(...limits));
}

/** 把 Supabase 的巢狀查詢結果攤平成 `Bundle` */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBundle(row: any): Bundle {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: BundleItem[] = (row.product_bundle_items ?? []).map((bi: any) => {
    const p = bi.products ?? {};
    return {
      productId: bi.product_id,
      productName: p.name ?? "",
      productNameEn: p.name_en ?? "",
      spec: bi.spec as ProductSpec,
      quantity: bi.quantity,
      stock: stockForSpec(p, bi.spec as ProductSpec),
    };
  });

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en ?? "",
    description: row.description ?? "",
    descriptionEn: row.description_en ?? "",
    price: row.price,
    items,
  };
}
