"use client";

import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types";

export default function FeaturedSection({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
