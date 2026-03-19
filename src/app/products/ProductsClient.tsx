"use client";

import { useState, useCallback } from "react";
import ProductCard from "@/components/ProductCard";
import ProductLightbox, { buildLightboxPhotos, getPhotoIndex } from "@/components/ProductLightbox";
import { categories } from "@/data/products";
import type { Product } from "@/types";

interface Props {
  products: Product[];
}

export default function ProductsClient({ products }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("全部");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered =
    selectedCategory === "全部"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const photos = buildLightboxPhotos(filtered);
  const total  = photos.length;

  const open  = useCallback((i: number) => setLightboxIndex(i), []);
  const close = useCallback(() => setLightboxIndex(null), []);
  const prev  = useCallback(() => setLightboxIndex(i => i === null ? 0 : (i - 1 + total) % total), [total]);
  const next  = useCallback(() => setLightboxIndex(i => i === null ? 0 : (i + 1) % total), [total]);

  function handleCategoryChange(cat: string) {
    setSelectedCategory(cat);
    setLightboxIndex(null); // 切換分類時關閉 lightbox
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-3 mb-12 justify-center">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
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
        {filtered.map((product, pIdx) => (
          <ProductCard
            key={product.id}
            product={product}
            onImageClick={(isSecond) =>
              open(getPhotoIndex(filtered, pIdx, !!isSecond))
            }
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-24">
          <p className="text-tea-text-light text-lg">此分類暫無茶品</p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && total > 0 && (
        <ProductLightbox
          photos={photos}
          index={lightboxIndex}
          onClose={close}
          onPrev={prev}
          onNext={next}
        />
      )}
    </div>
  );
}
