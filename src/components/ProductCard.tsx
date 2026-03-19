"use client";

import Image from "next/image";
import type { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { useState, useCallback } from "react";
import ProductLightbox, { type LightboxPhoto } from "@/components/ProductLightbox";

interface ProductCardProps {
  product: Product;
}

type VariantKey = "150g" | "75g" | "teabag";

interface Variant {
  key: VariantKey;
  label: string;
  hint: string;
  price: number;
  weight: string;
  cartId: number;   // 合成 ID：避免與其他規格碰撞
  cartName: string;
  stock?: number;   // undefined = 不限量；0 = 售完
}

function buildVariants(product: Product): Variant[] {
  const variants: Variant[] = [
    {
      key:      "150g",
      label:    "150g",
      hint:     "散茶",
      price:    product.price,
      weight:   "150g",
      cartId:   product.id,
      cartName: product.name,
      stock:    product.stockQuantity,
    },
  ];
  if (product.price75g) {
    variants.push({
      key:      "75g",
      label:    "75g",
      hint:     "散茶",
      price:    product.price75g,
      weight:   "75g",
      cartId:   product.id + 10000,
      cartName: product.name,
      stock:    product.stock75g,
    });
  }
  if (product.priceTeaBag) {
    variants.push({
      key:      "teabag",
      label:    "茶包",
      hint:     "15入 × 3g",
      price:    product.priceTeaBag,
      weight:   "15包 × 3g",
      cartId:   product.id + 20000,
      cartName: `${product.name} 茶包組`,
      stock:    product.stockTeaBag,
    });
  }
  return variants;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const variants = buildVariants(product);
  const [selectedKey, setSelectedKey] = useState<VariantKey>(variants[0].key);
  const selected = variants.find((v) => v.key === selectedKey) ?? variants[0];

  // 目前選取的規格是否售完（stock 為 0 才算售完；undefined = 不限）
  const selectedSoldOut = selected.stock === 0;
  // 是否所有規格都售完（用於圖片區遮罩）
  const allSoldOut = variants.every((v) => v.stock === 0);

  // Lightbox
  const photos: LightboxPhoto[] = [];
  if (product.image)  photos.push({ src: product.image,  productName: product.name, productNameEn: product.nameEn });
  if (product.image2) photos.push({ src: product.image2, productName: product.name, productNameEn: product.nameEn });
  const total = photos.length;

  const open  = useCallback(() => setLightboxIndex(0), []);
  const close = useCallback(() => setLightboxIndex(null), []);
  const prev  = useCallback(() => setLightboxIndex(i => i === null ? 0 : (i - 1 + total) % total), [total]);
  const next  = useCallback(() => setLightboxIndex(i => i === null ? 0 : (i + 1) % total), [total]);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedSoldOut) return;
    addToCart({
      ...product,
      id:     selected.cartId,
      price:  selected.price,
      weight: selected.weight,
      name:   selected.cartName,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col border border-tea-green-pale/40 hover:scale-[1.03] hover:-translate-y-1">

        {/* 圖片區 */}
        <div
          className={`h-56 bg-gradient-to-br ${product.color} relative overflow-hidden flex-shrink-0 ${product.image ? "cursor-zoom-in" : ""}`}
          onClick={() => product.image && open()}
          role={product.image ? "button" : undefined}
          aria-label={product.image ? `放大查看 ${product.name}` : undefined}
        >
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
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="bg-black/30 backdrop-blur-sm rounded-full p-2.5">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="100" height="100" viewBox="0 0 100 100" fill="none"
                className="opacity-25 group-hover:opacity-35 transition-opacity duration-300 group-hover:scale-110 transform">
                <path d="M50 10C50 10 22 30 22 55C22 70.46 34.54 83 50 83C65.46 83 78 70.46 78 55C78 30 50 10 50 10Z" fill="#3D4A42"/>
                <path d="M50 24C50 24 34 40 34 55C34 61.63 41.37 69 50 69C58.63 69 66 61.63 66 55C66 40 50 24 50 24Z" fill="#7D9B84"/>
                <line x1="50" y1="83" x2="50" y2="94" stroke="#3D4A42" strokeWidth="4" strokeLinecap="round"/>
                <path d="M50 55 Q38 45 30 35" stroke="#3D4A42" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
                <path d="M50 55 Q62 45 70 35" stroke="#3D4A42" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
              </svg>
            </div>
          )}

          {/* 類別標籤 */}
          <div className="absolute top-3 left-3">
            <span className="bg-white/75 backdrop-blur-sm text-tea-text text-xs px-3 py-1 rounded-full font-medium shadow-sm">
              {product.category}
            </span>
          </div>

          {/* 海拔 或 售完 */}
          <div className="absolute top-3 right-3">
            {allSoldOut ? (
              <span className="bg-gray-800/80 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-medium shadow-sm">
                售完
              </span>
            ) : (
              <span className="bg-white/75 backdrop-blur-sm text-tea-text-light text-xs px-3 py-1 rounded-full shadow-sm">
                {product.altitude}
              </span>
            )}
          </div>

          {/* 售完遮罩 */}
          {allSoldOut && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]" />}
        </div>

        {/* 卡片內容 */}
        <div className="p-5 flex flex-col flex-1">

          {/* 產地 */}
          <div className="flex items-center gap-1.5 mb-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-tea-green flex-shrink-0">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
            <p className="text-xs text-tea-green font-medium tracking-wide">{product.origin}</p>
          </div>

          {/* 茶名 */}
          <h3 className={`font-serif text-xl font-bold mb-1 group-hover:text-tea-green transition-colors leading-snug ${allSoldOut ? "text-tea-text/50" : "text-tea-text"}`}>
            {product.name}
          </h3>
          <p className="text-xs text-tea-text-light italic mb-3">{product.nameEn}</p>

          {/* 描述 */}
          <p className="text-sm text-tea-text-light leading-relaxed line-clamp-2 flex-1 mb-4">
            {product.description}
          </p>

          {/* 規格選擇 */}
          {variants.length > 1 && (
            <div className="mb-4">
              <p className="text-xs text-tea-text-light mb-2">選擇規格</p>
              <div className="flex gap-2 flex-wrap">
                {variants.map((v) => {
                  const variantSoldOut = v.stock === 0;
                  return (
                    <button
                      key={v.key}
                      onClick={(e) => { e.stopPropagation(); setSelectedKey(v.key); setAdded(false); }}
                      className={`flex flex-col items-center px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-150 min-w-[60px] relative ${
                        variantSoldOut
                          ? "border-gray-200 text-gray-300 cursor-default"
                          : selectedKey === v.key
                          ? "border-tea-green bg-tea-green-mist text-tea-green"
                          : "border-tea-green-pale text-tea-text-light hover:border-tea-green/50 hover:text-tea-text"
                      }`}
                    >
                      <span className="font-bold text-sm leading-tight">{v.label}</span>
                      <span className="text-[10px] opacity-70 leading-tight">
                        {variantSoldOut ? "售完" : v.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 價格 + 加入購物車 */}
          <div className="flex items-center justify-between pt-4 border-t border-tea-green-pale/60">
            <div className="flex flex-col">
              <span className={`font-bold text-xl leading-none transition-all ${selectedSoldOut ? "text-tea-text/40" : "text-tea-green"}`}>
                NT${selected.price.toLocaleString()}
              </span>
              <span className="text-tea-text-light text-xs mt-0.5">/ {selected.weight}</span>
            </div>

            {selectedSoldOut ? (
              <button disabled className="flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-full font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <line x1="8" y1="8" x2="16" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="16" y1="8" x2="8" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                暫時售完
              </button>
            ) : (
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
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    已加入
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    加入購物車
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

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
    </>
  );
}
