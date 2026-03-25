"use client";

import { useState, useEffect } from "react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types";

interface StockRow {
  id:            number;
  stockQuantity?: number;
  stock75g?:     number;
  stockTeaBag?:  number;
}

export default function FeaturedSection({ products }: { products: Product[] }) {
  const [liveProducts, setLiveProducts] = useState<Product[]>(products);

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {liveProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
