// ─── 配送重量常量（前後端共用）─────────────────────────────────────────────

/** 各規格預設配送重量（含包裝），單位：公克 */
export const DEFAULT_SPEC_WEIGHT_G: Record<string, number> = {
  "150g": 200,
  "75g": 120,
  "teabag": 150,
};

/** 國際免運門檻（商品小計） */
export const INTERNATIONAL_FREE_SHIPPING_THRESHOLD = 2500;

/** ePacket 限重 */
export const EPACKET_MAX_WEIGHT_G = 2000;

// ─── 重量計算 ─────────────────────────────────────────────────────────────

interface ProductWeights {
  shippingWeight150g?: number | null;
  shippingWeight75g?: number | null;
  shippingWeightTeabag?: number | null;
}

/** 取得單品配送重量：優先商品自訂值 > DEFAULT fallback */
export function getItemWeightG(spec: string, product?: ProductWeights): number {
  if (product) {
    if (spec === "150g" && product.shippingWeight150g) return product.shippingWeight150g;
    if (spec === "75g" && product.shippingWeight75g) return product.shippingWeight75g;
    if (spec === "teabag" && product.shippingWeightTeabag) return product.shippingWeightTeabag;
  }
  return DEFAULT_SPEC_WEIGHT_G[spec] ?? DEFAULT_SPEC_WEIGHT_G["150g"];
}

export interface WeightItem {
  spec: string;
  quantity: number;
  product?: ProductWeights;
}

/** 加總所有商品配送重量 */
export function calcTotalWeightG(items: WeightItem[]): number {
  return items.reduce((sum, item) => sum + getItemWeightG(item.spec, item.product) * item.quantity, 0);
}

// ─── 國內運費 ─────────────────────────────────────────────────────────────

/** 國內免運門檻（商品小計）。export 是因為商品頁與購物車的文案要引用同一個值 */
export const DOMESTIC_FREE_THRESHOLD = 1000;
const HOME_DELIVERY_FEE = 250;
const CVS_DELIVERY_FEE = 60;

/** 國內運費計算（純函式，不查 DB） */
export function calcDomesticFee(deliveryType: "home" | "cvs", subtotal: number): number {
  if (subtotal >= DOMESTIC_FREE_THRESHOLD) return 0;
  return deliveryType === "home" ? HOME_DELIVERY_FEE : CVS_DELIVERY_FEE;
}
