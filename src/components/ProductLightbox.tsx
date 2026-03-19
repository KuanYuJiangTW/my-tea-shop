"use client";

import { useEffect, useRef, useCallback } from "react";
import Image from "next/image";

export type LightboxPhoto = {
  src: string;
  productName: string;
  productNameEn: string;
};

type Props = {
  photos: LightboxPhoto[];
  index: number;           // 目前開啟的索引
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function ProductLightbox({ photos, index, onClose, onPrev, onNext }: Props) {
  const photo = photos[index];
  const total = photos.length;
  const touchStartX = useRef<number | null>(null);

  // 鎖定 body 捲動
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // 鍵盤操作
  const stableOnPrev  = useCallback(onPrev,  [onPrev]);
  const stableOnNext  = useCallback(onNext,  [onNext]);
  const stableOnClose = useCallback(onClose, [onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft")  stableOnPrev();
      if (e.key === "ArrowRight") stableOnNext();
      if (e.key === "Escape")     stableOnClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stableOnPrev, stableOnNext, stableOnClose]);

  // 滑動手勢
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? onNext() : onPrev();
    touchStartX.current = null;
  }

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 頂部：產品名稱 + 計數 + 關閉 */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 flex-shrink-0">
        <div className="min-w-0">
          <p className="text-white font-medium text-sm sm:text-base truncate leading-tight">
            {photo.productName}
          </p>
          <p className="text-white/40 text-xs truncate">{photo.productNameEn}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          {total > 1 && (
            <span className="text-white/50 text-xs tabular-nums">
              {index + 1} / {total}
            </span>
          )}
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
            aria-label="關閉"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 圖片區 */}
      <div className="relative flex-1 flex items-center justify-center min-h-0 px-12 sm:px-16">
        {/* 上一張 */}
        {total > 1 && (
          <button
            onClick={onPrev}
            className="absolute left-1 sm:left-3 z-10 text-white/60 hover:text-white transition-colors p-2 sm:p-3 rounded-full hover:bg-white/10"
            aria-label="上一張"
          >
            <svg className="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}

        <div className="relative w-full h-full">
          <Image
            key={photo.src}
            src={photo.src}
            alt={photo.productName}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 85vw, 75vw"
            className="object-contain"
            priority
          />
        </div>

        {/* 下一張 */}
        {total > 1 && (
          <button
            onClick={onNext}
            className="absolute right-1 sm:right-3 z-10 text-white/60 hover:text-white transition-colors p-2 sm:p-3 rounded-full hover:bg-white/10"
            aria-label="下一張"
          >
            <svg className="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
      </div>

      {/* 底部導覽 */}
      {total > 1 && (
        <div className="flex-shrink-0 py-3 px-4">
          {/* 桌機：縮圖列 */}
          <div className="hidden sm:flex justify-center gap-2 overflow-x-auto pb-1 max-w-2xl mx-auto">
            {photos.map((p, i) => (
              <button
                key={`thumb-${i}`}
                onClick={() => {
                  const diff = i - index;
                  if (diff > 0) for (let j = 0; j < diff; j++) onNext();
                  else if (diff < 0) for (let j = 0; j < -diff; j++) onPrev();
                }}
                className={`relative flex-shrink-0 rounded-lg overflow-hidden transition-all duration-200 ${
                  i === index
                    ? "w-14 h-14 ring-2 ring-tea-green opacity-100 scale-110"
                    : "w-12 h-12 opacity-40 hover:opacity-70"
                }`}
                aria-label={`跳到第 ${i + 1} 張`}
              >
                <Image src={p.src} alt={p.productName} fill sizes="56px" className="object-cover" />
              </button>
            ))}
          </div>
          {/* 手機：點狀指示 */}
          <div className="flex sm:hidden justify-center gap-1.5">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`inline-block rounded-full transition-all duration-200 ${
                  i === index ? "w-4 h-1.5 bg-tea-green" : "w-1.5 h-1.5 bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 工具函式：從 products 建立 lightbox 照片陣列 ────────────────────────────
export function buildLightboxPhotos(
  products: { image?: string; image2?: string; name: string; nameEn: string }[]
): LightboxPhoto[] {
  return products.flatMap((p) => {
    const entries: LightboxPhoto[] = [];
    if (p.image)  entries.push({ src: p.image,  productName: p.name, productNameEn: p.nameEn });
    if (p.image2) entries.push({ src: p.image2, productName: p.name, productNameEn: p.nameEn });
    return entries;
  });
}

// ── 工具函式：取得某產品第 n 張圖在 lightboxPhotos 中的全域索引 ──────────────
export function getPhotoIndex(
  products: { image?: string; image2?: string }[],
  productIndex: number,
  isSecond: boolean
): number {
  let idx = 0;
  for (let i = 0; i < productIndex; i++) {
    if (products[i].image)  idx++;
    if (products[i].image2) idx++;
  }
  if (isSecond) idx++;
  return idx;
}
