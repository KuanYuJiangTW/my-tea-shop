import { describe, it, expect } from "vitest";
import { calcBundleAvailable, mapBundle } from "@/lib/bundle-core";
import type { BundleItem } from "@/types";

/**
 * 組合可售量：`min(floor(成分庫存 ÷ 每組所需))`
 *
 * 這條規則是「組合不預先打包」的直接後果——沒有獨立庫存欄位可查，
 * 只能由成分推導。存一份獨立庫存等於同一個事實有兩個來源，一定會不同步。
 */

const item = (over: Partial<BundleItem> = {}): BundleItem => ({
  productId: 1,
  productName: "阿里山高山烏龍茶",
  productNameEn: "Ali Shan High Mountain Oolong",
  spec: "75g",
  quantity: 1,
  stock: 10,
  ...over,
});

describe("calcBundleAvailable", () => {
  it("成分充足時取最小值", () => {
    // 正式站的實際數字：烏龍 50、蜜香紅茶 53、金萱 48
    const items = [
      item({ productId: 1, stock: 50 }),
      item({ productId: 2, stock: 53 }),
      item({ productId: 3, stock: 48 }),
    ];
    expect(calcBundleAvailable(items)).toBe(48);
  });

  it("任一成分為 0 → 可售量 0（前台顯示售完，不是隱藏商品）", () => {
    const items = [item({ productId: 1, stock: 50 }), item({ productId: 2, stock: 0 })];
    expect(calcBundleAvailable(items)).toBe(0);
  });

  it("每組需要 2 件時，該成分的貢獻要除以 2", () => {
    // 庫存 5、每組要 2 → 只能組 2 組
    const items = [item({ productId: 1, stock: 50 }), item({ productId: 2, stock: 5, quantity: 2 })];
    expect(calcBundleAvailable(items)).toBe(2);
  });

  it("庫存未設定（undefined＝不限量）的成分不參與最小值", () => {
    const items = [item({ productId: 1, stock: undefined }), item({ productId: 2, stock: 7 })];
    expect(calcBundleAvailable(items)).toBe(7);
  });

  it("全部成分都不限量 → 回傳 undefined（不限量）", () => {
    const items = [item({ stock: undefined }), item({ productId: 2, stock: undefined })];
    expect(calcBundleAvailable(items)).toBeUndefined();
  });

  it("沒有成分的組合回 0，不是不限量——那是設定錯誤", () => {
    expect(calcBundleAvailable([])).toBe(0);
  });
});

describe("mapBundle", () => {
  it("依規格取對應的庫存欄位，null 轉 undefined", () => {
    const row = {
      id: 1, slug: "tasting-set", name: "品飲組", name_en: "Tasting Set",
      description: "三款各 75g", description_en: "Three teas", price: 650,
      product_bundle_items: [
        { product_id: 1, spec: "75g", quantity: 1,
          products: { name: "烏龍", name_en: "Oolong", stock_quantity: 50, stock_75g: 30, stock_tea_bag: 8 } },
        { product_id: 2, spec: "teabag", quantity: 1,
          products: { name: "紅茶", name_en: "Black", stock_quantity: 51, stock_75g: 53, stock_tea_bag: 8 } },
        { product_id: 3, spec: "150g", quantity: 1,
          products: { name: "金萱", name_en: "Jin Xuan", stock_quantity: null, stock_75g: 48, stock_tea_bag: 7 } },
      ],
    };

    const b = mapBundle(row);
    expect(b.price).toBe(650);
    expect(b.items.map((i) => i.stock)).toEqual([30, 8, undefined]);
    // 可售量取最小值，null 那項（不限量）不參與
    expect(calcBundleAvailable(b.items)).toBe(8);
  });

  it("成分為空時不炸，可售量為 0", () => {
    const b = mapBundle({ id: 9, slug: "x", name: "空組合", price: 100 });
    expect(b.items).toEqual([]);
    expect(calcBundleAvailable(b.items)).toBe(0);
  });
});
