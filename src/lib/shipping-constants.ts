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
/**
 * 宅配運費。150 = 黑貓「3 斤以下・本島」實收 130 ＋ 20 元包材緩衝。
 *
 * **原本是 250，那是黑貓「15–30 斤」的費率**（≈46 包以上），而實際訂單幾乎都在
 * 3 斤以下（3 斤 = 1,800g = 9 包 150g 散茶，要 10 包才跳級距）。等於把 9 包以內
 * 的訂單按 46 包收費：客人買一包 400 元的茶要付 250 運費（佔商品 62.5%），
 * 而其中 120 元不是成本。業主 2026-08-12 提供黑貓實際費率後修正。
 *
 * **離島未區分**：黑貓離島 3 斤以下是 220。目前寄離島一樣收 150 且免運時由我們
 * 吸收 220，是已知缺口，要做需要從地址判斷離島（另案）。
 */
const HOME_DELIVERY_FEE = 150;
/** 超商店到店。與黑貓無關，超商自有費率 */
const CVS_DELIVERY_FEE = 60;

/**
 * 前台文案要顯示這兩個數字（購物車摘要、首頁信任列）。
 * 連金額一起 export 是為了讓文案帶參數而不是硬寫——`shippingOptions` 原本寫死
 * 「宅配 NT$250」，改費率時漏掉它就會對客人講錯價。
 */
export const DOMESTIC_FEES = { home: HOME_DELIVERY_FEE, cvs: CVS_DELIVERY_FEE } as const;

/** 國內運費計算（純函式，不查 DB） */
export function calcDomesticFee(deliveryType: "home" | "cvs", subtotal: number): number {
  if (subtotal >= DOMESTIC_FREE_THRESHOLD) return 0;
  return deliveryType === "home" ? HOME_DELIVERY_FEE : CVS_DELIVERY_FEE;
}
