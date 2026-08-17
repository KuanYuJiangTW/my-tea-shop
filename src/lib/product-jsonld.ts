import type { Product } from "@/types";

// 商品列表頁的 ItemList 結構化資料。抽出來是為了讓「必填欄位」有測試守著——
// 這類錯誤不會讓網站壞掉，只會讓 Google Search Console 在幾週後寄信。

export interface ProductItemListOptions {
  baseUrl:  string;
  isEn:     boolean;
  /** 評價數未達門檻時回傳 undefined（門檻由呼叫端決定） */
  aggregateRatingOf?: (productId: number) => object | undefined;
}

export function buildProductItemList(products: Product[], opts: ProductItemListOptions) {
  const { baseUrl, isEn, aggregateRatingOf } = opts;
  const pageUrl = `${baseUrl}${isEn ? "/en" : ""}/products`;
  const brand   = { "@type": "Brand", "name": "霧抉茶 Wu Jue Tea" };
  const seller  = { "@type": "Organization", "@id": `${baseUrl}/#business`, "name": "霧抉茶 Wu Jue Tea" };

  // `image` 是 Google Merchant listing 的**必填**欄位，缺了是 error 不是 warning。
  // 沒有照片的商品整筆不進結構化資料——硬塞品牌圖等於謊報商品外觀，
  // 而商品卡本身在沒圖時也只顯示漸層底色，程式端沒有誠實的 fallback 可用。
  // 照片補進 DB 之後，商品會自動重新出現。
  const withImage = products.filter(p => !!p.image);

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": isEn ? "Wu Jue Tea Collection" : "霧抉茶茶葉系列",
    "url": pageUrl,
    "itemListElement": withImage.map((p, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "Product",
        "name": isEn ? (p.nameEn || p.name) : p.name,
        // 目前沒有商品獨立頁，五款茶只能共用列表頁網址。真正的解法是
        // openspec 5.4 的 /products/[slug]；那之前至少要跟著語言走。
        "url": pageUrl,
        "image": `${baseUrl}${p.image}`,
        "description": isEn ? (p.descriptionEn || p.description) : p.description,
        "brand": brand,
        "offers": {
          "@type": "Offer",
          "price": p.price,
          "priceCurrency": "TWD",
          "availability": "https://schema.org/InStock",
          "url": pageUrl,
          // @id 連回首頁的 LocalBusiness 節點；同時寫上 @type 與 name，
          // 否則對只讀這一頁的爬蟲來說是懸空參照
          "seller": seller,
        },
        "aggregateRating": aggregateRatingOf?.(p.id),
      },
    })),
  };
}
