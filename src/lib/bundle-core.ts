import type { Bundle, BundleItem, Product, ProductSpec } from "@/types";
import { encodeBundleCartId } from "./cart-item-id";

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

/**
 * 把組合包成購物車能存的形狀。
 *
 * 購物車以 `CartItem.product` 為單位，而規格早就是用「合成 Product」表達的
 * （`TeaBagCard` 就是 `{...product, id: product.id + 20000, price: priceTeaBag}`）。
 * 組合沿用同一套，只是 id 落在 30000+ 的區間，解碼由 `cart-item-id.ts` 統一負責。
 *
 * 這樣做的代價是要湊出 `Product` 的必填欄位；換到的是**購物車、Header 徽章、
 * 訂單摘要全部不用改**——它們看到的仍然是一個有 id、名稱、價格的東西。
 *
 * `stockQuantity` 帶入可售量，讓購物車既有的「庫存不足自動下修數量」直接生效。
 */
export function bundleToCartProduct(bundle: Bundle): Product {
  const available = calcBundleAvailable(bundle.items);
  return {
    id: encodeBundleCartId(bundle.id),
    name: bundle.name,
    nameEn: bundle.nameEn,
    category: "烏龍茶",
    origin: "",
    originEn: "",
    altitude: "",
    price: bundle.price,
    weight: bundle.items.map((i) => i.spec).join(" + "),
    description: bundle.description,
    descriptionEn: bundle.descriptionEn,
    color: "from-tea-green-pale to-tea-cream",
    featured: false,
    stockQuantity: available,
  };
}
