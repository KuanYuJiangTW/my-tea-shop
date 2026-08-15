import type { Metadata } from "next";
import { getProducts } from "@/lib/products";
import { getActiveBundles } from "@/lib/bundles";
import { getVisibleProductReviews } from "@/lib/product-reviews";
import ProductsClient from "./ProductsClient";
import ProductReviews from "@/components/ProductReviews";
import { getLocale, getTranslations } from "next-intl/server";
import { langAlternates, jsonLdString } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "茶葉系列",
  description: "嚴選嘉義阿里山梅山高山烏龍茶、金萱茶、紅茶、紅烏龍、四季春等台灣頂級茶葉。每一款都來自自家茶園，品質親手把關。",
  keywords: ["台灣高山茶", "烏龍茶購買", "金萱茶", "四季春", "阿里山高山茶", "嘉義茶葉", "梅山茶", "高山茶網購"],
  alternates: langAlternates("/products"),
  openGraph: {
    title: "茶葉系列 | 霧抉茶",
    description: "嚴選嘉義阿里山梅山高山烏龍茶、金萱茶等台灣頂級茶葉，品質親手把關。",
    url: "/products",
  },
};

export default async function ProductsPage() {
  const [products, bundles, reviewsByProduct, t, locale] = await Promise.all([
    getProducts(),
    getActiveBundles(),
    getVisibleProductReviews(),
    getTranslations("products"),
    getLocale(),
  ]);

  const isEn = locale === "en";

  // 只有真的有評價的茶會進顧客回饋區（平均星等的門檻由 ProductReviews 自己判斷）
  const reviewedProducts = products.filter((p) => (reviewsByProduct.get(p.id)?.length ?? 0) > 0);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";

  const productsJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "霧抉茶茶葉系列",
    "url": `${baseUrl}/products`,
    "itemListElement": products.map((p, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "Product",
        "name": p.name,
        "url": `${baseUrl}/products`,
        "image": p.image ? `${baseUrl}${p.image}` : undefined,
        "description": p.description,
        "offers": {
          "@type": "Offer",
          "price": p.price,
          "priceCurrency": "TWD",
          "availability": "https://schema.org/InStock",
        },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(productsJsonLd) }}
      />
      <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-tea-green-mist py-12 md:py-20 border-b border-tea-green-pale">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-tea-green text-xs tracking-[0.3em] uppercase mb-4">
            {t("sectionLabel")}
          </p>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-tea-text mb-4">
            {t("pageTitle")}
          </h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-5" />
          <p className="text-tea-text-light text-body-lg max-w-md mx-auto">
            {t("pageTagline")}
          </p>
        </div>
      </div>

      <ProductsClient products={products} bundles={bundles} />

      {/* 顧客回饋。**沒有任何評價就整段不存在**——空的社會證明是負分，
          所以這裡沒有「暫無評價」的空狀態（design.md、spec 的三個 Scenario）。
          商品詳情頁（product-detail-pages）做好之後，這段會搬到各自的頁面。 */}
      {reviewedProducts.length > 0 && (
        <div className="bg-tea-cream border-t border-tea-green-pale/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="text-center mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-tea-text">
                {t("reviews.sectionTitle")}
              </h2>
              <div className="w-10 h-0.5 bg-tea-green mx-auto my-4" />
              <p className="text-tea-text-light text-body">{t("reviews.sectionTagline")}</p>
            </div>

            <div className="space-y-10">
              {reviewedProducts.map((p) => (
                <ProductReviews
                  key={p.id}
                  productName={isEn ? p.nameEn : p.name}
                  reviews={reviewsByProduct.get(p.id) ?? []}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
