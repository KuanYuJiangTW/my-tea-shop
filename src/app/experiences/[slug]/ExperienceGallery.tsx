"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import ProductLightbox, { type LightboxPhoto } from "@/components/ProductLightbox";

export default function ExperienceGallery({
  name,
  nameEn,
  gallery,
}: {
  name: string;
  nameEn: string;
  gallery: string[];
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const t = useTranslations("experiences");
  const locale = useLocale();

  // galleryAlt 的模板本身是雙語的，但塞進去的 name 也得跟著語言換——
  // 否則英文頁會輸出「茶藝體驗 Gallery 1」這種半中半英的 alt。
  const altName = locale === "en" ? (nameEn || name) : name;

  const photos: LightboxPhoto[] = gallery.map((src) => ({
    src,
    productName: name,
    productNameEn: nameEn,
  }));
  const total = photos.length;

  const open  = useCallback((i: number) => setLightboxIndex(i), []);
  const close = useCallback(() => setLightboxIndex(null), []);
  const prev  = useCallback(() => setLightboxIndex((i) => i === null ? 0 : (i - 1 + total) % total), [total]);
  const next  = useCallback(() => setLightboxIndex((i) => i === null ? 0 : (i + 1) % total), [total]);

  if (gallery.length === 0) return null;

  return (
    <>
      <div>
        <h2 className="font-serif text-xl font-normal text-tea-text mb-4 tracking-display">{t("gallery")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {gallery.map((url, idx) => (
            <button
              key={url}
              type="button"
              onClick={() => open(idx)}
              className="relative aspect-square rounded-xl overflow-hidden cursor-zoom-in hover:opacity-90 transition-opacity"
              aria-label={t("galleryAriaLabel", { index: idx + 1 })}
            >
              <Image
                src={url}
                alt={t("galleryAlt", { name: altName, index: idx + 1 })}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 160px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
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
