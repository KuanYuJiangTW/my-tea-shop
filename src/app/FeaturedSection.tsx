"use client";

import { useState, useCallback } from "react";
import ProductCard from "@/components/ProductCard";
import ProductLightbox, { buildLightboxPhotos, getPhotoIndex } from "@/components/ProductLightbox";
import type { Product } from "@/types";

export default function FeaturedSection({ products }: { products: Product[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const photos = buildLightboxPhotos(products);
  const total  = photos.length;

  const open  = useCallback((i: number) => setLightboxIndex(i), []);
  const close = useCallback(() => setLightboxIndex(null), []);
  const prev  = useCallback(() => setLightboxIndex(i => i === null ? 0 : (i - 1 + total) % total), [total]);
  const next  = useCallback(() => setLightboxIndex(i => i === null ? 0 : (i + 1) % total), [total]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((product, pIdx) => (
          <ProductCard
            key={product.id}
            product={product}
            onImageClick={(isSecond) =>
              open(getPhotoIndex(products, pIdx, !!isSecond))
            }
          />
        ))}
      </div>

      {lightboxIndex !== null && total > 0 && (
        <ProductLightbox
          photos={photos}
          index={lightboxIndex}
          onClose={close}
          onPrev={prev}
          onNext={next}
        />
      )}
    </>
  );
}
