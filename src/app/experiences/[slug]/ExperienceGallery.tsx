"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
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
        <h2 className="font-serif text-xl font-bold text-tea-text mb-4">{t("gallery")}</h2>
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
                alt={t("galleryAlt", { name, index: idx + 1 })}
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
