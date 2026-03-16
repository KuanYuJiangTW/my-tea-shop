import type { Metadata } from "next";
import { getProducts } from "@/lib/products";
import ProductsClient from "./ProductsClient";

export const metadata: Metadata = {
  title: "茶葉系列",
  description: "嚴選嘉義梅山高山烏龍茶、金萱茶、紅茶、紅烏龍、四季春等台灣頂級茶葉。每一款都來自自家茶園，品質親手把關。",
  keywords: ["台灣高山茶", "烏龍茶購買", "金萱茶", "四季春", "嘉義梅山茶葉", "高山茶網購"],
  alternates: {
    canonical: "/products",
  },
  openGraph: {
    title: "茶葉系列 | 霧抉茶",
    description: "嚴選嘉義梅山高山烏龍茶、金萱茶等台灣頂級茶葉，品質親手把關。",
    url: "/products",
  },
};

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-tea-green-mist py-12 md:py-20 border-b border-tea-green-pale">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-tea-green text-xs tracking-[0.3em] uppercase mb-4">
            Our Collection
          </p>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-tea-text mb-4">
            茶葉系列
          </h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-5" />
          <p className="text-tea-text-light max-w-md mx-auto">
            嚴選來自台灣各大茶區的頂級茶葉，每一款都有獨特的風味與故事
          </p>
        </div>
      </div>

      <ProductsClient products={products} />
    </div>
  );
}
