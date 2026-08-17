import { describe, it, expect } from "vitest";
import { buildProductItemList } from "@/lib/product-jsonld";
import type { Product } from "@/types";

// 商品 ItemList 結構化資料的必填欄位守衛。
//
// 背景（2026-08-17）：線上 /products 的 JSON-LD 有 5 筆商品，其中紅烏龍茶與
// 四季春因為 DB 沒有照片而輸出成沒有 `image` 的 Product。`image` 是 Google
// Merchant listing 的必填欄位，缺了會被判為 invalid item。這類錯誤不會讓網站
// 壞掉，只會讓 Search Console 幾週後寄信，所以需要測試而不是靠人眼。

const BASE = "https://taiwantea.store";

function product(over: Partial<Product> & { id: number }): Product {
  // id 由末尾的 ...over 提供（型別已保證存在），這裡不重複指定
  return {
    name:        `茶${over.id}`,
    nameEn:      `Tea ${over.id}`,
    category:    "oolong",
    origin:      "梅山",
    price:       400,
    weight:      "150g",
    description: `描述${over.id}`,
    descriptionEn: `Description ${over.id}`,
    originEn:    "Meishan",
    color:       "from-green-100 to-emerald-200",
    featured:    false,
    image:       `/images/products/0${over.id}.png`,
    price75g:    240,
    priceTeaBag: 280,
    ...over,
  } as Product;
}

type Item = { position: number; item: Record<string, unknown> };

function items(json: ReturnType<typeof buildProductItemList>): Item[] {
  return json.itemListElement as unknown as Item[];
}

describe("buildProductItemList：必填欄位", () => {
  it("沒有照片的商品整筆不輸出", () => {
    const json = buildProductItemList(
      [product({ id: 1 }), product({ id: 2, image: undefined }), product({ id: 3 })],
      { baseUrl: BASE, isEn: false },
    );

    const list = items(json);
    expect(list).toHaveLength(2);
    expect(list.map(e => e.item.name)).toEqual(["茶1", "茶3"]);
  });

  it("輸出的每一筆都有非空的 image、name、description 與 offers", () => {
    const json = buildProductItemList(
      [product({ id: 1 }), product({ id: 2 })],
      { baseUrl: BASE, isEn: false },
    );

    for (const { item } of items(json)) {
      expect(item.image).toBeTruthy();
      expect(String(item.image).startsWith(BASE)).toBe(true);
      expect(item.name).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.brand).toBeTruthy();
      const offers = item.offers as Record<string, unknown>;
      expect(offers.price).toBeTypeOf("number");
      expect(offers.priceCurrency).toBe("TWD");
      expect(offers.url).toBeTruthy();
    }
  });

  it("篩掉商品後 position 仍連續，從 1 開始", () => {
    const json = buildProductItemList(
      [product({ id: 1, image: undefined }), product({ id: 2 }), product({ id: 3, image: undefined }), product({ id: 4 })],
      { baseUrl: BASE, isEn: false },
    );
    expect(items(json).map(e => e.position)).toEqual([1, 2]);
  });

  it("全部商品都沒圖時輸出空清單，而不是壞掉的 item", () => {
    const json = buildProductItemList(
      [product({ id: 1, image: undefined })],
      { baseUrl: BASE, isEn: false },
    );
    expect(items(json)).toEqual([]);
  });

  it("seller 不是懸空 @id，帶有 @type 與 name", () => {
    const json = buildProductItemList([product({ id: 1 })], { baseUrl: BASE, isEn: false });
    const seller = (items(json)[0].item.offers as Record<string, unknown>).seller as Record<string, unknown>;
    expect(seller["@type"]).toBe("Organization");
    expect(seller["@id"]).toBe(`${BASE}/#business`);
    expect(seller.name).toBeTruthy();
  });
});

describe("buildProductItemList：語言", () => {
  it("en 用英文名稱與描述，網址帶 /en 前綴", () => {
    const json = buildProductItemList([product({ id: 1 })], { baseUrl: BASE, isEn: true });
    const { item } = items(json)[0];
    expect(item.name).toBe("Tea 1");
    expect(item.description).toBe("Description 1");
    expect(item.url).toBe(`${BASE}/en/products`);
    expect(json.url).toBe(`${BASE}/en/products`);
  });

  it("英文欄位是空字串時退回中文，不會輸出空的 name", () => {
    const json = buildProductItemList(
      [product({ id: 1, nameEn: "", descriptionEn: "" })],
      { baseUrl: BASE, isEn: true },
    );
    const { item } = items(json)[0];
    expect(item.name).toBe("茶1");
    expect(item.description).toBe("描述1");
  });

  it("zh 不加前綴", () => {
    const json = buildProductItemList([product({ id: 1 })], { baseUrl: BASE, isEn: false });
    expect(json.url).toBe(`${BASE}/products`);
  });
});

describe("buildProductItemList：aggregateRating", () => {
  it("門檻未達（回傳 undefined）時不輸出該欄位", () => {
    const json = buildProductItemList([product({ id: 1 })], {
      baseUrl: BASE, isEn: false,
      aggregateRatingOf: () => undefined,
    });
    // JSON.stringify 會丟掉 undefined，序列化後不該出現這個 key
    expect(JSON.stringify(items(json)[0].item)).not.toContain("aggregateRating");
  });

  it("有評價時原樣帶入", () => {
    const rating = { "@type": "AggregateRating", ratingValue: 4.7, reviewCount: 9 };
    const json = buildProductItemList([product({ id: 1 })], {
      baseUrl: BASE, isEn: false,
      aggregateRatingOf: () => rating,
    });
    expect(items(json)[0].item.aggregateRating).toEqual(rating);
  });
});
