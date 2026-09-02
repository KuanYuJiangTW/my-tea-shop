"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useCart } from "@/context/CartContext";
import { calcBundleAvailable, bundleToCartProduct } from "@/lib/bundle-core";
import { DOMESTIC_FREE_THRESHOLD } from "@/lib/shipping-constants";
import type { Bundle } from "@/types";

/**
 * 組合商品卡（品飲組）。
 *
 * **刻意不重用 `ProductCard`**：那張卡的骨架是「規格選擇 ＋ 數量 ＋ 單一商品」，
 * 而組合沒有規格可選、卻要列出成分。硬塞進去會讓 `ProductCard` 長出一堆
 * `if (isBundle)` 分支，而它已經被三種規格撐得很滿了（那支檔案的註解也寫著
 * 卡片總高 632px 是業主指定值，動間距前要先量）。
 *
 * 售完時**顯示但不可加入**，不隱藏——客人以為商品消失比看到售完更糟。
 */
export default function BundleCard({ bundle }: { bundle: Bundle }) {
  const t = useTranslations("products.bundle");
  const locale = useLocale();
  const isEn = locale === "en";
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const available = calcBundleAvailable(bundle.items);
  const soldOut = available === 0;
  // 只在真的快沒了才出聲。充足庫存標數字等於告訴客人「不用急」——
  // 與 ProductCard 的規格 chip 同一條判準
  const lowStock = available !== undefined && available > 0 && available <= 10;

  const gap = DOMESTIC_FREE_THRESHOLD - bundle.price;

  function handleAdd() {
    if (soldOut) return;
    addToCart(bundleToCartProduct(bundle));
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="bg-white rounded-card overflow-hidden shadow-resting hover:shadow-raised transition-shadow duration-base ease-standard border border-tea-green-pale/40 flex flex-col">
      <div className="p-card flex flex-col flex-1">
        <p className="text-tea-green-ink font-medium tracking-[0.2em] text-caption uppercase mb-2">
          {t("eyebrow")}
        </p>
        <h3 className="font-serif text-2xl font-semibold text-tea-text mb-2">
          {isEn ? bundle.nameEn || bundle.name : bundle.name}
        </h3>
        <p className="text-label text-tea-text-muted mb-4 flex-1">
          {isEn ? bundle.descriptionEn || bundle.description : bundle.description}
        </p>

        <p className="text-caption text-tea-text-muted mb-1">{t("contains")}</p>
        <ul className="mb-4 space-y-1">
          {bundle.items.map((i) => (
            <li key={`${i.productId}-${i.spec}`} className="text-label text-tea-text flex items-baseline gap-2">
              <span aria-hidden className="text-tea-green-ink">・</span>
              {t("perItem", { name: isEn ? i.productNameEn || i.productName : i.productName })}
            </li>
          ))}
        </ul>

        {/* 差額提示：650 ＋ 金萱 150g 350 ＝ 1,000，正好命中免運門檻 */}
        {gap > 0 && !soldOut && (
          <p className="text-caption text-tea-green-ink bg-tea-green-mist rounded-inline px-3 py-2 mb-4">
            {t("freeShippingHint")}
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-tea-green-pale/60">
          <div className="flex flex-col">
            <span className={`font-bold text-xl leading-none ${soldOut ? "text-tea-text/40" : "text-tea-text"}`}>
              NT${bundle.price.toLocaleString()}
            </span>
            {lowStock && (
              <span className="text-[10px] leading-tight mt-1 text-amber-500 font-semibold">
                {t("lowStock", { count: available as number })}
              </span>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={soldOut}
            className={`flex items-center gap-1.5 text-label px-5 py-2.5 rounded-pill font-medium transition-all duration-base ease-standard shadow-resting ${
              soldOut
                ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                : added
                ? "bg-tea-green-pale text-tea-green-dark scale-95"
                : "bg-cta-tea hover:bg-cta-tea-dark text-white hover:shadow-raised active:scale-95"
            }`}
          >
            {soldOut ? t("soldOut") : added ? t("added") : t("addToCart")}
          </button>
        </div>
      </div>
    </div>
  );
}
