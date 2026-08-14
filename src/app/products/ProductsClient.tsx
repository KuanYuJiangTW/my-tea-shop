"use client";

import { useState, useEffect } from "react";
import ProductCard from "@/components/ProductCard";
import BundleCard from "@/components/BundleCard";
import { categories } from "@/data/products";
import type { Product, Bundle } from "@/types";
import { useTranslations } from "next-intl";
import {
  DOMESTIC_FREE_THRESHOLD,
  INTERNATIONAL_FREE_SHIPPING_THRESHOLD,
} from "@/lib/shipping-constants";

interface StockRow {
  id:            number;
  stockQuantity?: number;
  stock75g?:     number;
  stockTeaBag?:  number;
}

interface Props {
  products: Product[];
  /** 上架中的組合。目前只有品飲組；未上架時為空陣列，畫面等同沒有這一段 */
  bundles?: Bundle[];
}

export default function ProductsClient({ products, bundles = [] }: Props) {
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
      <p className="text-tea-text-light text-sm mb-3 text-center">
        {t("countLabel", { count: filtered.length })}
      </p>

      {/* 運送信任標。刻意放在清單頁而不是商品卡上——商品卡固定 632px 是拍板的
          硬約束，往卡片裡加東西會破壞三張等高。兩段用 flex-wrap 各自成行，
          比讓一長串中文在窄螢幕任意斷行好看。 */}
      <p className="mb-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-caption text-tea-text-muted">
        <span>{t("shippingNoteDomestic", { amount: DOMESTIC_FREE_THRESHOLD.toLocaleString() })}</span>
        <span aria-hidden className="text-tea-green-pale">・</span>
        <span>{t("shippingNoteIntl", { amount: INTERNATIONAL_FREE_SHIPPING_THRESHOLD.toLocaleString() })}</span>
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 組合排在單品之前：它是給第一次買茶的人的入口，擺後面等於沒有。
            只在「全部」分類顯示——組合橫跨烏龍與紅茶，放進任一分類都不誠實 */}
        {selectedCategory === "全部" &&
          bundles.map((b) => <BundleCard key={`bundle-${b.id}`} bundle={b} />)}
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
