"use client";

import { useState, useEffect } from "react";
import ProductCard from "@/components/ProductCard";
import { categories } from "@/data/products";
import type { Product } from "@/types";
import { useTranslations } from "next-intl";

interface StockRow {
  id:            number;
  stockQuantity?: number;
  stock75g?:     number;
  stockTeaBag?:  number;
}

interface Props {
  products: Product[];
}

export default function ProductsClient({ products }: Props) {
  const t = useTranslations("products");
  const [selectedCategory, setSelectedCategory] = useState<string>("全部");
  const [liveProducts, setLiveProducts] = useState<Product[]>(products);

  // 即時抓庫存（不走快取），合併到 ISR 商品資料
  useEffect(() => {
    fetch("/api/products/stock")
      .then(r => r.json())
      .then((stocks: StockRow[]) => {
        const map = new Map(stocks.map(s => [s.id, s]));
        setLiveProducts(products.map(p => {
          const s = map.get(p.id);
          if (!s) return p;
          return { ...p, stockQuantity: s.stockQuantity, stock75g: s.stock75g, stockTeaBag: s.stockTeaBag };
        }));
      })
      .catch(() => {});
  }, [products]);

  const filtered =
    selectedCategory === "全部"
      ? liveProducts
      : liveProducts.filter((p) => p.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-3 mb-12 justify-center">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
              selectedCategory === cat
                ? "bg-tea-green text-white shadow-sm"
                : "bg-white text-tea-text-light hover:bg-tea-green-mist border border-tea-green-pale"
            }`}
          >
            {cat === "全部" ? t("filterAll") : cat === "烏龍茶" ? t("categoryOolong") : t("categoryBlack")}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-tea-text-light text-sm mb-8 text-center">
        {t("countLabel", { count: filtered.length })}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-24">
          <p className="text-tea-text-light text-lg">{t("noResults")}</p>
        </div>
      )}
    </div>
  );
}
