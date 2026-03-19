"use client";

import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import TeaBagCard from "@/components/TeaBagCard";
import { categories } from "@/data/products";
import type { Product } from "@/types";

interface Props {
  products: Product[];
}

export default function ProductsClient({ products }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("全部");

  const filtered =
    selectedCategory === "全部"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  // 有茶包選項的產品（全部顯示，不受分類篩選影響）
  const teaBagProducts = products.filter((p) => p.priceTeaBag);

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
            {cat}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-tea-text-light text-sm mb-8 text-center">
        共 {filtered.length} 款茶品
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-24">
          <p className="text-tea-text-light text-lg">此分類暫無茶品</p>
        </div>
      )}

      {/* 茶包區 */}
      {teaBagProducts.length > 0 && (
        <div className="mt-16 md:mt-24">
          {/* 分隔線 + 標題 */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1 h-px bg-tea-green-pale" />
            <div className="text-center">
              <p className="text-tea-green text-xs tracking-[0.3em] uppercase mb-1">Tea Bag Series</p>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-tea-text">茶包系列</h2>
            </div>
            <div className="flex-1 h-px bg-tea-green-pale" />
          </div>
          <p className="text-tea-text-light text-sm text-center mb-10">
            精選茶葉製成方便茶包，每盒 15 包 × 3g，隨時享用一杯好茶
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teaBagProducts.map((product) => (
              <TeaBagCard key={`teabag-${product.id}`} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
