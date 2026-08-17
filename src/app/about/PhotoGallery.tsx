"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

type Photo = {
  src: string;
  alt: string;
  caption: string;
  desc: string;
};

const PHOTO_KEYS = [
  "farm2", "picking2", "wilting", "wilting2", "rolling",
  "roasting", "teaCup", "farm", "picking", "wilting3",
  "rolling2", "teaCup2",
] as const;

const PHOTO_SRCS = [
  "/images/gallery/farm2.jpg",
  "/images/gallery/picking2.jpg",
  "/images/gallery/wilting.jpg",
  "/images/gallery/wilting2.jpg",
  "/images/gallery/rolling.jpg",
  "/images/gallery/roasting.jpg",
  "/images/gallery/tea-cup.jpg",
  "/images/gallery/farm.jpeg",
  "/images/gallery/picking.jpeg",
  "/images/gallery/wilting3.jpg",
  "/images/gallery/rolling2.jpg",
  "/images/gallery/tea-cup2.jpg",
];

function usePhotos(): Photo[] {
  const t = useTranslations("about.galleryPhotos");
  return PHOTO_KEYS.map((key, i) => ({
    src:     PHOTO_SRCS[i],
    alt:     t(`${key}.alt`),
    caption: t(`${key}.caption`),
    desc:    t(`${key}.desc`),
  }));
}

// TOTAL is constant (12 photos)

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
  const ta = useTranslations("common.a11y");
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      className={`relative overflow-hidden group cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-tea-green ${className}`}
      aria-label={ta("openLargeImage", { caption: photo.caption })}
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
  photos,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const photo = photos[index];
  const TOTAL = photos.length;
  const ta = useTranslations("common.a11y");
  const tb = useTranslations("common.buttons");
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
          aria-label={tb("close")}
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
          aria-label={ta("prevPhoto")}
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
          aria-label={ta("nextPhoto")}
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
          {photos.map((p, i) => (
            <button
              key={p.src + i}
              onClick={() => i !== index && (i < index ? onPrev() : onNext()) }
              className={`relative flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden transition-all ${
                i === index
                  ? "ring-2 ring-tea-green opacity-100 scale-110"
                  : "opacity-40 hover:opacity-70"
              }`}
              aria-label={ta("goToPhoto", { index: i + 1 })}
            >
              <Image src={p.src} alt={p.alt} fill sizes="40px" className="object-cover" />
            </button>
          ))}
        </div>
        {/* 點狀導覽（手機顯示） */}
        <div className="flex sm:hidden justify-center gap-1.5 mt-3">
          {photos.map((_, i) => (
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
  const photos = usePhotos();
  const total = photos.length;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const open  = useCallback((i: number) => setLightboxIndex(i), []);
  const close = useCallback(() => setLightboxIndex(null), []);
  const prev  = useCallback(() => setLightboxIndex(i => i === null ? 0 : (i - 1 + total) % total), [total]);
  const next  = useCallback(() => setLightboxIndex(i => i === null ? 0 : (i + 1) % total), [total]);

  return (
    <>
      {/* ── 主圖 + 兩格側欄 ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <GalleryCell
          photo={photos[0]}
          index={0}
          onOpen={open}
          className="md:col-span-2 rounded-3xl aspect-[4/3] md:aspect-auto md:min-h-[400px]"
          labelCaption={photos[0].caption}
          labelDesc={photos[0].desc}
        />
        <div className="grid grid-cols-2 md:grid-cols-1 md:grid-rows-2 gap-4">
          <GalleryCell
            photo={photos[1]}
            index={1}
            onOpen={open}
            className="rounded-3xl aspect-[4/3]"
            labelCaption={photos[1].caption}
            labelDesc={photos[1].desc}
            hideLabelDescOnMobile
          />
          <GalleryCell
            photo={photos[2]}
            index={2}
            onOpen={open}
            className="rounded-3xl aspect-[4/3]"
            labelCaption={photos[2].caption}
            labelDesc={photos[2].desc}
            hideLabelDescOnMobile
          />
        </div>
      </div>

      {/* ── 下排四格 ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {([3, 4, 5, 6] as const).map((idx) => (
          <GalleryCell
            key={photos[idx].src}
            photo={photos[idx]}
            index={idx}
            onOpen={open}
            className="rounded-3xl aspect-square"
            labelCaption={photos[idx].caption}
            labelDesc={photos[idx].desc}
          />
        ))}
      </div>

      {/* ── 六宮格 ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {([7, 8, 9, 10, 11, 3] as const).map((idx, pos) => (
          <GalleryCell
            key={`six-${pos}`}
            photo={photos[idx]}
            index={idx}
            onOpen={open}
            className="rounded-2xl aspect-square"
          />
        ))}
      </div>

      {/* ── Lightbox ─────────────────────────────────── */}
      {lightboxIndex !== null && (
        <Lightbox
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
