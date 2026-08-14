import { describe, it, expect } from "vitest";
import {
  decodeCartId,
  encodeProductCartId,
  encodeBundleCartId,
  specOfCartId,
  isBundleCartId,
} from "@/lib/cart-item-id";

/**
 * 購物車合成 id 的編碼／解碼。
 *
 * 這組數字**已經在 localStorage 裡**（既有購物車存的就是 1／10001／20001），
 * 所以下面的斷言等同回歸測試：解碼結果一旦改變，客人重新整理後看到的購物車就會變樣。
 *
 * 收斂成單一模組之前，解碼的 if 階梯重複在 CheckoutClient（兩處）與 CartClient，
 * 加組合時只要有一處把 30000 排在 10000 之後，組合就會被誤判成 75g。
 */

describe("decodeCartId（回歸：既有 localStorage 的數字必須解出相同結果）", () => {
  it("小於 10000 是 150g，id 就是 products.id", () => {
    expect(decodeCartId(1)).toEqual({ kind: "product", productId: 1, spec: "150g" });
    expect(decodeCartId(9999)).toEqual({ kind: "product", productId: 9999, spec: "150g" });
  });

  it("10000+ 是 75g", () => {
    expect(decodeCartId(10001)).toEqual({ kind: "product", productId: 1, spec: "75g" });
    expect(decodeCartId(10005)).toEqual({ kind: "product", productId: 5, spec: "75g" });
  });

  it("20000+ 是茶包", () => {
    expect(decodeCartId(20001)).toEqual({ kind: "product", productId: 1, spec: "teabag" });
  });

  it("30000+ 是組合", () => {
    expect(decodeCartId(30001)).toEqual({ kind: "bundle", bundleId: 1 });
  });

  it("邊界值歸在正確的類別", () => {
    expect(decodeCartId(9999)).toMatchObject({ spec: "150g" });
    expect(decodeCartId(10000)).toMatchObject({ spec: "75g", productId: 0 });
    expect(decodeCartId(19999)).toMatchObject({ spec: "75g" });
    expect(decodeCartId(20000)).toMatchObject({ spec: "teabag", productId: 0 });
    expect(decodeCartId(29999)).toMatchObject({ spec: "teabag" });
    expect(decodeCartId(30000)).toEqual({ kind: "bundle", bundleId: 0 });
  });

  it("組合不會被誤判成 75g（比對順序必須由大到小）", () => {
    // 30001 同時 >= 10000 也 >= 20000，順序寫反就會解成 75g 或茶包
    expect(decodeCartId(30001).kind).toBe("bundle");
  });
});

describe("encode / decode 對稱", () => {
  it("商品三種規格來回一致", () => {
    for (const spec of ["150g", "75g", "teabag"] as const) {
      const id = encodeProductCartId(7, spec);
      expect(decodeCartId(id)).toEqual({ kind: "product", productId: 7, spec });
    }
  });

  it("組合來回一致", () => {
    expect(decodeCartId(encodeBundleCartId(3))).toEqual({ kind: "bundle", bundleId: 3 });
  });

  it("編碼結果與既有慣例相同（ProductCard 的 cartId）", () => {
    expect(encodeProductCartId(1, "150g")).toBe(1);
    expect(encodeProductCartId(1, "75g")).toBe(10001);
    expect(encodeProductCartId(1, "teabag")).toBe(20001);
  });
});

describe("輔助函式", () => {
  it("specOfCartId：組合沒有單一規格，回 null", () => {
    expect(specOfCartId(1)).toBe("150g");
    expect(specOfCartId(10001)).toBe("75g");
    expect(specOfCartId(20001)).toBe("teabag");
    expect(specOfCartId(30001)).toBeNull();
  });

  it("isBundleCartId", () => {
    expect(isBundleCartId(20001)).toBe(false);
    expect(isBundleCartId(30001)).toBe(true);
  });
});
