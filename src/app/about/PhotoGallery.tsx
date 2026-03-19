"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

type Photo = {
  src: string;
  alt: string;
  caption: string;
  desc: string;
};

// 全部照片依序排列（用於 lightbox 導覽）
const PHOTOS: Photo[] = [
  { src: "/images/gallery/farm2.jpg",    alt: "嘉義梅山高山茶園全景", caption: "嘉義梅山高山茶園",   desc: "終年雲霧環繞的高山茶園" },
  { src: "/images/gallery/picking2.jpg", alt: "清晨手工採摘茶葉",     caption: "清晨採摘嫩芽",       desc: "一心二葉，品質的起點" },
  { src: "/images/gallery/wilting.jpg",  alt: "日光萎凋製程",         caption: "日光萎凋",           desc: "讓茶葉在陽光中舒展" },
  { src: "/images/gallery/wilting2.jpg", alt: "室內萎凋製程",         caption: "室內萎凋",           desc: "室內靜置，讓茶葉緩慢發酵" },
  { src: "/images/gallery/rolling.jpg",  alt: "手工揉捻茶葉",         caption: "揉捻成形",           desc: "手工揉出茶葉的形與韻" },
  { src: "/images/gallery/roasting.jpg", alt: "精控焙火烘焙",         caption: "精控焙火烘焙",       desc: "40年累積的火候手感" },
  { src: "/images/gallery/tea-cup.jpg",  alt: "沖泡完成的茶湯",       caption: "一杯好茶",           desc: "從茶園到您手中的完整旅程" },
  { src: "/images/gallery/farm.jpeg",    alt: "茶園景色",             caption: "茶園景色",           desc: "" },
  { src: "/images/gallery/picking.jpeg", alt: "採摘過程",             caption: "採摘過程",           desc: "" },
  { src: "/images/gallery/wilting3.jpg", alt: "室內萎凋細節",         caption: "室內萎凋",           desc: "" },
  { src: "/images/gallery/rolling2.jpg", alt: "揉捻細節",             caption: "揉捻細節",           desc: "" },
  { src: "/images/gallery/tea-cup2.jpg", alt: "茶湯特寫",             caption: "茶湯特寫",           desc: "" },
];

const TOTAL = PHOTOS.length;

// ── 縮圖格子 ────────────────────────────────────────────────────────────────
function GalleryCell({
  photo,
  index,
  className,
  onOpen,
  labelCaption,
  labelDesc,
  hideLabelDescOnMobile = false,
}: {
  photo: Photo;
  index: number;
  className: string;
  onOpen: (i: number) => void;
  labelCaption?: string;
  labelDesc?: string;
  hideLabelDescOnMobile?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      className={`relative overflow-hidden group cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-tea-green ${className}`}
      aria-label={`開啟大圖：${photo.caption}`}
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover group-hover:scale-105 transition-transform duration-500"
      />
      {labelCaption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-tea-text/70 to-transparent p-4 md:p-6">
          <p className="text-white font-bold text-sm md:text-base">{labelCaption}</p>
          {labelDesc && (
            <p className={`text-tea-green-pale text-xs mt-0.5 ${hideLabelDescOnMobile ? "hidden sm:block" : ""}`}>
              {labelDesc}
            </p>
          )}
        </div>
      )}
      {/* 放大提示 */}
      <div className="absolute inset-0 bg-tea-text/0 group-hover:bg-tea-text/20 transition-colors duration-300 flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/20 backdrop-blur-sm rounded-full p-2">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </div>
      </div>
    </button>
  );
}

// ── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({
  index,
  onClose,
  onPrev,
  onNext,
}: {
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const photo = PHOTOS[index];
  const touchStartX = useRef<number | null>(null);

  // 鎖定 body 捲動
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // 鍵盤操作
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft")  onPrev();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "Escape")     onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPrev, onNext, onClose]);

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

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 頂部列：計數 + 關閉 */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <span className="text-white/60 text-sm tabular-nums">
          {index + 1} / {TOTAL}
        </span>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
          aria-label="關閉"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* 圖片區 */}
      <div className="relative flex-1 flex items-center justify-center px-12 sm:px-16 min-h-0">
        {/* 上一張 */}
        <button
          onClick={onPrev}
          className="absolute left-2 sm:left-4 z-10 text-white/70 hover:text-white transition-colors p-2 sm:p-3 rounded-full hover:bg-white/10"
          aria-label="上一張"
        >
          <svg className="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {/* 圖片 */}
        <div className="relative w-full h-full">
          <Image
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
        </div>

        {/* 下一張 */}
        <button
          onClick={onNext}
          className="absolute right-2 sm:right-4 z-10 text-white/70 hover:text-white transition-colors p-2 sm:p-3 rounded-full hover:bg-white/10"
          aria-label="下一張"
        >
          <svg className="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* 底部說明 */}
      <div className="flex-shrink-0 px-4 py-4 text-center">
        <p className="text-white font-medium text-sm sm:text-base">{photo.caption}</p>
        {photo.desc && (
          <p className="text-white/50 text-xs sm:text-sm mt-1">{photo.desc}</p>
        )}
        {/* 縮圖導覽列（桌機顯示） */}
        <div className="hidden sm:flex justify-center gap-1.5 mt-3 overflow-x-auto pb-1">
          {PHOTOS.map((p, i) => (
            <button
              key={p.src + i}
              onClick={() => i !== index && (i < index ? onPrev() : onNext()) }
              className={`relative flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden transition-all ${
                i === index
                  ? "ring-2 ring-tea-green opacity-100 scale-110"
                  : "opacity-40 hover:opacity-70"
              }`}
              aria-label={`跳到第 ${i + 1} 張`}
            >
              <Image src={p.src} alt={p.alt} fill sizes="40px" className="object-cover" />
            </button>
          ))}
        </div>
        {/* 點狀導覽（手機顯示） */}
        <div className="flex sm:hidden justify-center gap-1.5 mt-3">
          {PHOTOS.map((_, i) => (
            <span
              key={i}
              className={`inline-block rounded-full transition-all ${
                i === index ? "w-4 h-1.5 bg-tea-green" : "w-1.5 h-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 主元件 ───────────────────────────────────────────────────────────────────
export default function PhotoGallery() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const open  = useCallback((i: number) => setLightboxIndex(i), []);
  const close = useCallback(() => setLightboxIndex(null), []);
  const prev  = useCallback(() => setLightboxIndex(i => i === null ? 0 : (i - 1 + TOTAL) % TOTAL), []);
  const next  = useCallback(() => setLightboxIndex(i => i === null ? 0 : (i + 1) % TOTAL), []);

  return (
    <>
      {/* ── 主圖 + 兩格側欄 ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <GalleryCell
          photo={PHOTOS[0]}
          index={0}
          onOpen={open}
          className="md:col-span-2 rounded-3xl aspect-[4/3] md:aspect-auto md:min-h-[400px]"
          labelCaption={PHOTOS[0].caption}
          labelDesc={PHOTOS[0].desc}
        />
        <div className="grid grid-cols-2 md:grid-cols-1 md:grid-rows-2 gap-4">
          <GalleryCell
            photo={PHOTOS[1]}
            index={1}
            onOpen={open}
            className="rounded-3xl aspect-[4/3]"
            labelCaption={PHOTOS[1].caption}
            labelDesc={PHOTOS[1].desc}
            hideLabelDescOnMobile
          />
          <GalleryCell
            photo={PHOTOS[2]}
            index={2}
            onOpen={open}
            className="rounded-3xl aspect-[4/3]"
            labelCaption={PHOTOS[2].caption}
            labelDesc={PHOTOS[2].desc}
            hideLabelDescOnMobile
          />
        </div>
      </div>

      {/* ── 下排四格 ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {([3, 4, 5, 6] as const).map((idx) => (
          <GalleryCell
            key={PHOTOS[idx].src}
            photo={PHOTOS[idx]}
            index={idx}
            onOpen={open}
            className="rounded-3xl aspect-square"
            labelCaption={PHOTOS[idx].caption}
            labelDesc={PHOTOS[idx].desc}
          />
        ))}
      </div>

      {/* ── 六宮格 ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {([7, 8, 9, 10, 11, 3] as const).map((idx, pos) => (
          <GalleryCell
            key={`six-${pos}`}
            photo={PHOTOS[idx]}
            index={idx}
            onOpen={open}
            className="rounded-2xl aspect-square"
          />
        ))}
      </div>

      {/* ── Lightbox ─────────────────────────────────── */}
      {lightboxIndex !== null && (
        <Lightbox
          index={lightboxIndex}
          onClose={close}
          onPrev={prev}
          onNext={next}
        />
      )}
    </>
  );
}
