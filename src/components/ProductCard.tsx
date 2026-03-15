"use client";

import Image from "next/image";
import { Product } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useState } from "react";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col border border-tea-green-pale/40 hover:scale-[1.03] hover:-translate-y-1">

      {/* 圖片區 */}
      <div className={`h-56 bg-gradient-to-br ${product.color} relative overflow-hidden flex-shrink-0`}>
        {product.image ? (
          <>
            <Image
              src={product.image}
              alt={product.name}
              fill
              className={`object-cover transition-opacity duration-500 ${product.image2 ? "group-hover:opacity-0" : ""}`}
            />
            {product.image2 && (
              <Image
                src={product.image2}
                alt={`${product.name} 第二張`}
                fill
                className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              width="100"
              height="100"
              viewBox="0 0 100 100"
              fill="none"
              className="opacity-25 group-hover:opacity-35 transition-opacity duration-300 group-hover:scale-110 transform"
            >
              <path
                d="M50 10C50 10 22 30 22 55C22 70.46 34.54 83 50 83C65.46 83 78 70.46 78 55C78 30 50 10 50 10Z"
                fill="#3D4A42"
              />
              <path
                d="M50 24C50 24 34 40 34 55C34 61.63 41.37 69 50 69C58.63 69 66 61.63 66 55C66 40 50 24 50 24Z"
                fill="#7D9B84"
              />
              <line x1="50" y1="83" x2="50" y2="94" stroke="#3D4A42" strokeWidth="4" strokeLinecap="round" />
              <path d="M50 55 Q38 45 30 35" stroke="#3D4A42" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
              <path d="M50 55 Q62 45 70 35" stroke="#3D4A42" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
            </svg>
          </div>
        )}

        {/* 類別標籤 */}
        <div className="absolute top-3 left-3">
          <span className="bg-white/75 backdrop-blur-sm text-tea-text text-xs px-3 py-1 rounded-full font-medium shadow-sm">
            {product.category}
          </span>
        </div>

        {/* 海拔標籤 */}
        <div className="absolute top-3 right-3">
          <span className="bg-white/75 backdrop-blur-sm text-tea-text-light text-xs px-3 py-1 rounded-full shadow-sm">
            {product.altitude}
          </span>
        </div>
      </div>

      {/* 卡片內容 */}
      <div className="p-5 flex flex-col flex-1">

        {/* 產地 */}
        <div className="flex items-center gap-1.5 mb-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-tea-green flex-shrink-0">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor" />
            <circle cx="12" cy="9" r="2.5" fill="white" />
          </svg>
          <p className="text-xs text-tea-green font-medium tracking-wide">
            {product.origin}
          </p>
        </div>

        {/* 茶名 */}
        <h3 className="font-serif text-xl font-bold text-tea-text mb-1 group-hover:text-tea-green transition-colors leading-snug">
          {product.name}
        </h3>
        <p className="text-xs text-tea-text-light italic mb-3">
          {product.nameEn}
        </p>

        {/* 描述 */}
        <p className="text-sm text-tea-text-light leading-relaxed line-clamp-2 flex-1 mb-5">
          {product.description}
        </p>

        {/* 價格 + 加入購物車 */}
        <div className="flex items-center justify-between pt-4 border-t border-tea-green-pale/60">
          {/* 價格 */}
          <div className="flex flex-col">
            <span className="text-tea-green font-bold text-xl leading-none">
              NT${product.price.toLocaleString()}
            </span>
            <span className="text-tea-text-light text-xs mt-0.5">
              / {product.weight}
            </span>
          </div>

          {/* 加入購物車按鈕 */}
          <button
            onClick={handleAdd}
            className={`flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-full font-medium transition-all duration-200 shadow-sm ${
              added
                ? "bg-tea-green-pale text-tea-green-dark scale-95"
                : "bg-tea-green hover:bg-tea-green-dark text-white hover:shadow-md active:scale-95"
            }`}
          >
            {added ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                已加入
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
