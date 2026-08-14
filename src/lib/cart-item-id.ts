import type { ProductSpec } from "@/types";

/**
 * 購物車品項 id 的編碼／解碼。
 *
 * 購物車以 `CartItem.product.id` 當唯一鍵，但同一款茶有三種規格、還要能放組合，
 * 所以實際存的是**合成 id**：
 *
 * | 範圍 | 意義 |
 * |---|---|
 * | `< 10000` | 商品 150g（id 就是 `products.id`） |
 * | `10000+` | 商品 75g（`products.id + 10000`） |
 * | `20000+` | 商品茶包（`products.id + 20000`） |
 * | `30000+` | **組合**（`product_bundles.id + 30000`） |
 *
 * 這套編碼本來就存在（`ProductCard` 的 `cartId`），但解碼的 if 階梯**重複在三個地方**
 * ——`CheckoutClient` 兩處、`CartClient` 一處。加組合等於要同步改三段易錯的判斷，
 * 而且順序寫反（先比 10000 再比 30000）就會把組合誤判成 75g。收斂成這一個模組。
 *
 * **不改變 localStorage 的格式**：既有購物車存的是同一組數字，解碼結果完全相同。
 */

/** 各類別的 id 位移。順序即優先序——比對時必須由大到小 */
const OFFSET = { bundle: 30000, teabag: 20000, "75g": 10000 } as const;

export type DecodedCartId =
  | { kind: "product"; productId: number; spec: ProductSpec }
  | { kind: "bundle"; bundleId: number };

/** 商品規格 → 購物車 id */
export function encodeProductCartId(productId: number, spec: ProductSpec): number {
  if (spec === "teabag") return productId + OFFSET.teabag;
  if (spec === "75g") return productId + OFFSET["75g"];
  return productId;
}

/** 組合 → 購物車 id */
export function encodeBundleCartId(bundleId: number): number {
  return bundleId + OFFSET.bundle;
}

/** 購物車 id → 它到底是什麼 */
export function decodeCartId(cartId: number): DecodedCartId {
  if (cartId >= OFFSET.bundle) return { kind: "bundle", bundleId: cartId - OFFSET.bundle };
  if (cartId >= OFFSET.teabag) return { kind: "product", productId: cartId - OFFSET.teabag, spec: "teabag" };
  if (cartId >= OFFSET["75g"]) return { kind: "product", productId: cartId - OFFSET["75g"], spec: "75g" };
  return { kind: "product", productId: cartId, spec: "150g" };
}

/** 只要規格（配送重量計算用）。組合沒有單一規格，回 null */
export function specOfCartId(cartId: number): ProductSpec | null {
  const d = decodeCartId(cartId);
  return d.kind === "product" ? d.spec : null;
}

export function isBundleCartId(cartId: number): boolean {
  return cartId >= OFFSET.bundle;
}
