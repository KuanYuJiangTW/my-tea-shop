import { describe, it, expect } from "vitest";
import { productDisplayName, productDisplayWeight, productDisplayOrigin } from "@/lib/product-display";
import en from "../../../messages/en.json";

/**
 * 購物車／結帳的商品顯示字串。
 *
 * 這支測試存在的理由是一個具體的坑：加入購物車時 `name` 被**合成**為
 * 「<茶名> 茶包組」（`ProductCard`／`TeaBagCard`），但 `nameEn` 沒跟著合成，
 * 仍是基礎茶名。所以「英文版直接改用 `nameEn`」會讓茶包組與 150g 散茶**同名**，
 * 客人分不出訂到哪一項——而這件事不會報錯，只會安靜地顯示錯誤的名字。
 */

const TEA_BAG_SET_EN = en.products.teaBagSet;

/** 最小可用的商品形狀；只帶顯示函式真正會讀的欄位 */
const oolong = { name: "阿里山高山烏龍茶", nameEn: "Ali Shan High Mountain Oolong", origin: "阿里山", originEn: "Alishan", weight: "150g" };
const teaBag = { ...oolong, name: `${oolong.name} 茶包組`, weight: "15包 × 3g" };

describe("商品名稱", () => {
  it("中文版一律用 name，不受 nameEn 影響", () => {
    expect(productDisplayName(oolong, false)).toBe("阿里山高山烏龍茶");
    expect(productDisplayName(teaBag, false, TEA_BAG_SET_EN)).toBe("阿里山高山烏龍茶 茶包組");
  });

  it("英文版用 nameEn", () => {
    expect(productDisplayName(oolong, true)).toBe("Ali Shan High Mountain Oolong");
  });

  it("**茶包組在英文版必須補回後綴**，否則會與散茶同名", () => {
    const bag   = productDisplayName(teaBag, true, TEA_BAG_SET_EN);
    const loose = productDisplayName(oolong, true, TEA_BAG_SET_EN);
    expect(bag).toBe(`Ali Shan High Mountain Oolong ${TEA_BAG_SET_EN}`);
    // 這條才是重點：兩個規格不可以顯示成同一個名字
    expect(bag).not.toBe(loose);
  });

  it("nameEn 缺漏時回中文名——購物車存的是舊快照時不能顯示空白", () => {
    const legacy = { name: "四季春", origin: "梅山", weight: "150g" };
    expect(productDisplayName(legacy, true)).toBe("四季春");
    expect(productDisplayName({ ...legacy, nameEn: "" }, true)).toBe("四季春");
  });
});

describe("規格", () => {
  it("茶包組在英文版轉成英文寫法，其餘規格語系中立不動", () => {
    expect(productDisplayWeight("15包 × 3g", true)).toBe("15 bags × 3g");
    expect(productDisplayWeight("150g", true)).toBe("150g");
    expect(productDisplayWeight("75g", true)).toBe("75g");
  });

  it("中文版原樣不動", () => {
    expect(productDisplayWeight("15包 × 3g", false)).toBe("15包 × 3g");
  });

  it("**全站只能有一種茶包規格的英文寫法**——與 messages 的 teaBagHint 對齊", () => {
    // 業主 2026-08-11 拍板維持 `15 bags × 3g`。改動任一處就會在這裡變紅，
    // 避免同一個東西出現 `15 bags` 與 `15 tea bags` 兩種寫法。
    expect(productDisplayWeight("15包 × 3g", true)).toBe(en.products.teaBagHint);
  });
});

describe("產地", () => {
  it("依語系取值，originEn 缺漏時回中文", () => {
    expect(productDisplayOrigin(oolong, true)).toBe("Alishan");
    expect(productDisplayOrigin(oolong, false)).toBe("阿里山");
    expect(productDisplayOrigin({ origin: "梅山" }, true)).toBe("梅山");
  });
});
