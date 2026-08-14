import type { Metadata } from "next";
import { getProducts } from "@/lib/products";
import { getActiveBundles } from "@/lib/bundles";
import ProductsClient from "./ProductsClient";
import { getTranslations } from "next-intl/server";
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
  const [products, bundles, t] = await Promise.all([
    getProducts(),
    getActiveBundles(),
    getTranslations("products"),
  ]);

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
    </div>
    </>
  );
}
