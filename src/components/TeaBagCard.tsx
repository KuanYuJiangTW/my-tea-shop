"use client";

import Image from "next/image";
import type { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { useState } from "react";

interface Props {
  product: Product;
}

export default function TeaBagCard({ product }: Props) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  if (!product.priceTeaBag) return null;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      ...product,
      id: product.id + 20000,
      price: product.priceTeaBag!,
      weight: "15包 × 3g",
      name: `${product.name} 茶包組`,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex border border-tea-green-pale/40 hover:scale-[1.01] hover:-translate-y-0.5">
      {/* 左側：圖片或色塊 */}
      <div className={`w-28 sm:w-36 bg-gradient-to-br ${product.color} relative flex-shrink-0`}>
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="144px"
            className="object-cover opacity-60"
          />
        ) : null}
        {/* 茶包標示 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white drop-shadow">
            <rect x="7" y="2" width="10" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none"/>
            <path d="M12 15v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M9 20h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M12 2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M12 0 L15 -2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span className="text-white text-xs font-bold drop-shadow tracking-wide">茶包</span>
        </div>
      </div>

      {/* 右側：資訊 */}
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-tea-green font-medium mb-0.5 tracking-wide">{product.origin}</p>
              <h3 className="font-serif font-bold text-tea-text text-base leading-snug truncate">
                {product.name}
              </h3>
              <p className="text-xs text-tea-text-light italic truncate">{product.nameEn}</p>
            </div>
            <span className="bg-tea-green-mist text-tea-green text-xs px-2.5 py-0.5 rounded-full font-medium flex-shrink-0 border border-tea-green-pale/50">
              茶包
            </span>
          </div>
          <p className="text-xs text-tea-text-light mt-2 leading-relaxed">
            每盒 15 包，每包 3g，方便沖泡，風味同等
          </p>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-tea-green-pale/40">
          <div>
            <span className="font-bold text-lg text-tea-green">
              NT${product.priceTeaBag.toLocaleString()}
            </span>
            <span className="text-tea-text-light text-xs ml-1">/ 盒</span>
          </div>
          <button
            onClick={handleAdd}
            className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded-full font-medium transition-all duration-200 shadow-sm ${
              added
                ? "bg-tea-green-pale text-tea-green-dark scale-95"
                : "bg-tea-green hover:bg-tea-green-dark text-white hover:shadow-md active:scale-95"
            }`}
          >
            {added ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                已加入
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                加入購物車
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
