"use client";

import Image from "next/image";
import type { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import ProductLightbox, { type LightboxPhoto } from "@/components/ProductLightbox";
import { useTranslations, useLocale } from "next-intl";

type VariantKey = "150g" | "75g" | "teabag";

interface Variant {
  key:      VariantKey;
  label:    string;
  hint:     string;
  unit:     string;
  price:    number;
  weight:   string;
  cartId:   number;
  cartName: string;
  stock?:   number;   // undefined = 不限；0 = 售完
}

interface VariantLabels {
  loose: string;
  teaBag: string;
  teaBagHint: string;
  unitServing: string;
  unitBox: string;
  teaBagSet: string;
}

function buildVariants(p: Product, labels: VariantLabels): Variant[] {
  const variants: Variant[] = [
    {
      key:      "150g",
      label:    "150g",
      hint:     labels.loose,
      unit:     labels.unitServing,
      price:    p.price,
      weight:   "150g",
      cartId:   p.id,
      cartName: p.name,
      stock:    p.stockQuantity,
    },
  ];
  if (p.price75g) {
    variants.push({
      key:      "75g",
      label:    "75g",
      hint:     labels.loose,
      unit:     labels.unitServing,
      price:    p.price75g,
      weight:   "75g",
      cartId:   p.id + 10000,
      cartName: p.name,
      stock:    p.stock75g,
    });
  }
  if (p.priceTeaBag) {
    variants.push({
      key:      "teabag",
      label:    labels.teaBag,
      hint:     labels.teaBagHint,
      unit:     labels.unitBox,
      price:    p.priceTeaBag,
      weight:   "15包 × 3g",
      cartId:   p.id + 20000,
      cartName: `${p.name} ${labels.teaBagSet}`,
      stock:    p.stockTeaBag,
    });
  }
  return variants;
}

export default function ProductCard({ product }: { product: Product }) {
  const t             = useTranslations("products");
  const locale        = useLocale();
  const isEn          = locale === "en";
  const { addToCart } = useCart();
  const { user }      = useAuth();
  const router        = useRouter();
  const pathname      = usePathname();
  const [added,         setAdded]         = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [quantity,      setQuantity]      = useState(1);

  const variants    = buildVariants(product, {
    loose:       t("variantLoose"),
    teaBag:      t("variantTeaBag"),
    teaBagHint:  t("teaBagHint"),
    unitServing: t("unitServing"),
    unitBox:     t("unitBox"),
    teaBagSet:   t("teaBagSet"),
  });
  const [selectedKey, setSelectedKey] = useState<VariantKey>(variants[0].key);
  const selected    = variants.find((v) => v.key === selectedKey) ?? variants[0];

  const selectedSoldOut = selected.stock === 0;
  const allSoldOut      = variants.every((v) => v.stock === 0);
  const maxQty          = selected.stock !== undefined ? Math.min(selected.stock, 99) : 99;

  // 圖片的 alt／aria-label 用當前語言的品名。**不要用 product.name**：
  // 卡片標題本來就是雙語（英文當標題、中文當斜體副標），但 alt 是給 Google 圖片
  // 搜尋與螢幕閱讀器讀的單一字串，英文頁塞中文品名等於這兩者都拿到錯的語言。
  // 購物車的商品名另有合成規則（見 lessons.md 2026-08-11），這裡刻意不碰。
  const altName = locale === "en" ? (product.nameEn || product.name) : product.name;

  // Lightbox
  const photos: LightboxPhoto[] = [];
  if (product.image)  photos.push({ src: product.image,  productName: product.name, productNameEn: product.nameEn });
  if (product.image2) photos.push({ src: product.image2, productName: product.name, productNameEn: product.nameEn });
  const total = photos.length;

  const open  = useCallback(() => setLightboxIndex(0), []);
  const close = useCallback(() => setLightboxIndex(null), []);
  const prev  = useCallback(() => setLightboxIndex(i => i === null ? 0 : (i - 1 + total) % total), [total]);
  const next  = useCallback(() => setLightboxIndex(i => i === null ? 0 : (i + 1) % total), [total]);

  function selectVariant(key: VariantKey) {
    setSelectedKey(key);
    setQuantity(1);
    setAdded(false);
  }

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedSoldOut) return;
    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    addToCart(
      { ...product, id: selected.cartId, price: selected.price, weight: selected.weight, name: selected.cartName },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <>
      <div className="bg-white rounded-card overflow-hidden shadow-resting hover:shadow-raised transition-all duration-slow ease-standard group flex flex-col border border-tea-green-pale/40 hover:scale-[1.03] hover:-translate-y-1">

        {/* 圖片區 */}
        <div
          className={`h-56 bg-gradient-to-br ${product.color} relative overflow-hidden flex-shrink-0 ${product.image ? "cursor-zoom-in" : ""}`}
          onClick={() => product.image && open()}
          role={product.image ? "button" : undefined}
          aria-label={product.image ? t("zoomLabel", { name: altName }) : undefined}
        >
          {product.image ? (
            <>
              <Image
                src={product.image}
                alt={altName}
                fill
                className={`object-cover transition-opacity duration-reveal ease-standard ${product.image2 ? "group-hover:opacity-0" : ""}`}
              />
              {product.image2 && (
                <Image
                  src={product.image2}
                  alt={t("imageAltSecond", { name: altName })}
                  fill
                  className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-reveal ease-standard"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-slow ease-standard pointer-events-none">
                <div className="bg-black/30 backdrop-blur-sm rounded-pill p-2.5">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {/* 無圖時的佔位茶葉。顏色走 fill-/stroke- utility，不寫死 hex——
                  SVG 屬性上的 hex 是色盤遷移時最容易漏掉的一種 */}
              <svg width="100" height="100" viewBox="0 0 100 100" fill="none"
                className="opacity-25 group-hover:opacity-35 transition-opacity duration-slow ease-standard group-hover:scale-110 transform">
                <path d="M50 10C50 10 22 30 22 55C22 70.46 34.54 83 50 83C65.46 83 78 70.46 78 55C78 30 50 10 50 10Z" className="fill-tea-text"/>
                <path d="M50 24C50 24 34 40 34 55C34 61.63 41.37 69 50 69C58.63 69 66 61.63 66 55C66 40 50 24 50 24Z" className="fill-tea-green"/>
                <line x1="50" y1="83" x2="50" y2="94" className="stroke-tea-text" strokeWidth="4" strokeLinecap="round"/>
                <path d="M50 55 Q38 45 30 35" className="stroke-tea-text" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
                <path d="M50 55 Q62 45 70 35" className="stroke-tea-text" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
              </svg>
            </div>
          )}

          {/* 類別標籤 */}
          <div className="absolute top-3 left-3">
            <span className="bg-white/75 backdrop-blur-sm text-tea-text text-caption px-3 py-1 rounded-pill font-medium shadow-resting">
              {product.category === "烏龍茶" ? t("categoryOolong") : t("categoryBlack")}
            </span>
          </div>

          {/* 海拔 / 售完 */}
          <div className="absolute top-3 right-3">
            {allSoldOut ? (
              <span className="bg-gray-800/80 backdrop-blur-sm text-white text-caption px-3 py-1 rounded-pill font-medium shadow-resting">{t("outOfStock")}</span>
            ) : (
              <span className="bg-white/75 backdrop-blur-sm text-tea-text-light text-caption px-3 py-1 rounded-pill shadow-resting">{product.altitude}</span>
            )}
          </div>

          {allSoldOut && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]" />}
        </div>

        {/* 卡片內容 */}
        <div className="p-5 flex flex-col flex-1">

          {/* 產地 */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-tea-green flex-shrink-0">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
            <p className="text-caption text-tea-green font-medium tracking-wide">{isEn ? (product.originEn || product.origin) : product.origin}</p>
          </div>

          {/* 茶名 */}
          <h3 className={`font-serif text-xl font-bold mb-1 group-hover:text-tea-green transition-colors leading-snug ${allSoldOut ? "text-tea-text/50" : "text-tea-text"}`}>
            {isEn ? product.nameEn : product.name}
          </h3>
          <p className="text-caption text-tea-text-light italic mb-2">{isEn ? product.name : product.nameEn}</p>

          {/* 描述 */}
          {/* 字級用 label(14px) 而不是 body(16px)，行數給 3 行而不是 2 行。
              手機 375px 下內容區約 303px，14px 中文約 21 字/行——2 行只有 43 字容量，
              而實際描述有 48 字，**上線版就會截掉 5 字**（16px 更慘，截 11 字）。
              3 行給到 64 字容量才真的讀得完。
              **卡片內的固定行數容器，字級與行數要一起算，只看內容型態會截字。**

              `min-h-[3lh]` 是必要的，不是保險：手機是單欄堆疊、沒有 grid 的等高機制，
              描述行數不同卡片就會高矮不齊。實測 414px（iPhone Plus）下 2 行容量剛好
              49 字，48/46 字的茶塞得進 2 行、50 字的金萱要 3 行——金萱整張卡就高了 22px。
              固定 3 行後，任何螢幕寬度、任何字數都等高。`lh` = 當前行高，跟著字級走。

              ⚠️ 描述多出的那一行（+22px）是靠**本卡片內 6 處間距各縮 2–4px** 換回來的
              （產地 mb-1.5、英文名 mb-2、描述 mb-3、規格 mb-3、數量 mb-3、價格列 pt-3），
              好讓卡片維持上線版的 632px。**動這些間距或描述行數前，先量總高**——
              632 是業主指定的值，不是巧合。 */}
          {/* ⚠️ 星等列試過了，放不下：加一行星等（含 mb-2）在 1280／768／375 三個
              斷點都讓總高從 632 變成 664（+32px，2026-08-15 實測，五張卡一致）。
              632 是業主指定值、且卡內間距已經為了描述那第三行各縮過 2–4px，
              再擠 32px 會動到已經拍板的排版，所以依 design.md D4 退回
              「商品卡不顯示星等，只在 /products 的顧客回饋區呈現」。
              要改回來的前提是業主同意卡片變高，不是重排間距。 */}
          <p className="text-label text-tea-text-light line-clamp-3 min-h-[3lh] flex-1 mb-3">
            {isEn ? (product.descriptionEn || product.description) : product.description}
          </p>

          {/* 規格選擇 */}
          {variants.length > 1 && (
            <div className="mb-3">
              <p className="text-caption text-tea-text-light mb-2">{t("selectVariant")}</p>
              <div className="flex gap-2 flex-wrap">
                {variants.map((v) => {
                  const variantSoldOut = v.stock === 0;
                  return (
                    <button
                      key={v.key}
                      onClick={(e) => { e.stopPropagation(); if (!variantSoldOut) selectVariant(v.key); }}
                      disabled={variantSoldOut}
                      className={`flex flex-col items-center justify-center px-3 py-2 rounded-control border text-caption font-medium transition-all duration-fast ease-standard min-w-[60px] ${
                        variantSoldOut
                          ? "border-gray-200 text-gray-300 cursor-not-allowed"
                          : selectedKey === v.key
                          ? "border-tea-green bg-tea-green-mist text-tea-green"
                          : "border-tea-green-pale text-tea-text-light hover:border-tea-green/50 hover:text-tea-text"
                      }`}
                    >
                      <span className="font-bold text-label leading-tight">{v.label}</span>
                      <span className="text-[10px] opacity-70 leading-tight">
                        {variantSoldOut ? t("outOfStock") : v.hint}
                      </span>
                      {/* 只在真的稀缺時出聲。>10 顯示數字等於告訴客人「不用急」，
                          而且九個 chip 都有數字時，唯一該搶眼的那個橘字要對抗的是
                          八個同位置同字級的兄弟——彩度要有效，前提是周圍安靜。
                          充足庫存改由數量旁的 stockCount 揭露（那裡是操作上限，語意不同）。 */}
                      {/* 這一行**永遠佔位**（`min-h-[1lh]`，同 L241 描述容器的手法）。
                          條件式渲染會讓「沒有低庫存規格」的卡片矮 15px——實測 /products
                          出現 632 與 617 兩種高度，正是 L232-235 在防的不等高。 */}
                      <span className="text-[10px] leading-tight mt-0.5 min-h-[1lh] text-amber-500 font-semibold">
                        {!variantSoldOut && v.stock !== undefined && v.stock <= 10
                          ? t("stockLeft", { count: v.stock })
                          : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 數量選擇 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col">
              <span className="text-caption text-tea-text-light font-medium">{t("quantity")}</span>
              {!selectedSoldOut && selected.stock !== undefined && (
                <span className={`text-[10px] mt-0.5 ${selected.stock <= 10 ? "text-amber-500 font-semibold" : "text-tea-text-light"}`}>
                  {t("stockCount", { count: selected.stock })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setQuantity((q) => Math.max(1, q - 1)); }}
                disabled={selectedSoldOut || quantity <= 1}
                className="w-7 h-7 rounded-pill border border-tea-green-pale flex items-center justify-center text-tea-text-light hover:border-tea-green hover:text-tea-green transition-colors duration-base ease-standard disabled:opacity-30 disabled:cursor-default"
                aria-label="減少數量"
              >
                −
              </button>
              <span className="w-7 text-center text-label font-semibold text-tea-text tabular-nums">
                {quantity}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setQuantity((q) => Math.min(maxQty, q + 1)); }}
                disabled={selectedSoldOut || quantity >= maxQty}
                className="w-7 h-7 rounded-pill border border-tea-green-pale flex items-center justify-center text-tea-text-light hover:border-tea-green hover:text-tea-green transition-colors duration-base ease-standard disabled:opacity-30 disabled:cursor-default"
                aria-label="增加數量"
              >
                +
              </button>
              <span className="text-caption text-tea-text-light">{selected.unit}</span>
            </div>
          </div>

          {/* 價格 + 加入購物車 */}
          <div className="flex items-center justify-between pt-3 border-t border-tea-green-pale/60">
            <div className="flex flex-col">
              <span className={`font-bold text-xl leading-none ${selectedSoldOut ? "text-tea-text/40" : "text-tea-green"}`}>
                NT${selected.price.toLocaleString()}
              </span>
              <span className="text-tea-text-light text-caption mt-0.5">/ {selected.weight}</span>
            </div>

            {selectedSoldOut ? (
              <button disabled className="flex items-center gap-1.5 text-label px-5 py-2.5 rounded-pill font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <line x1="8" y1="8" x2="16" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="16" y1="8" x2="8" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {t("outOfStock")}
              </button>
            ) : (
              <button
                onClick={handleAdd}
                className={`flex items-center gap-1.5 text-label px-5 py-2.5 rounded-pill font-medium transition-all duration-base ease-standard shadow-resting ${
                  added
                    ? "bg-tea-green-pale text-tea-green-dark scale-95"
                    : "bg-tea-green hover:bg-tea-green-dark text-white hover:shadow-raised active:scale-95"
                }`}
              >
                {added ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {quantity > 1 ? t("addedWithCount", { count: quantity }) : t("addedToCart")}
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {t("addToCart")}
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
