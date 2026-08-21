import { getLocale, getTranslations } from "next-intl/server";
import { Check } from "lucide-react";

import type { AdmissionTier } from "@/lib/experiences";

/**
 * 同一個地點的多種參加方式與價格。
 *
 * 為什麼要有這一區：萬鷺朝鳳實際上有三層——免費停車自己看、入園 150 元含茶
 * 與點心、導覽 450 元——但在此之前**線上一層都查不到**，只有走到現場的人才
 * 知道。中間那層是最容易成交的：不必預約、決定成本低，而且把「站著看完就走」
 * 變成「坐下來喝過茶」，後續買茶與再訪的機率完全不同。
 *
 * 內容全部來自 Sanity（`admissionTiers`），價格改了不用改程式。沒填就不顯示。
 */
interface Props {
  tiers?: AdmissionTier[];
  /** 這款體驗本身的價格，用來標出哪一層是「線上可預約」的那個 */
  bookablePrice: number;
}

export default async function AdmissionTiers({ tiers, bookablePrice }: Props) {
  if (!tiers || tiers.length === 0) return null;

  const [t, locale] = await Promise.all([
    getTranslations("experiences.admission"),
    getLocale(),
  ]);
  const isEn = locale === "en";

  return (
    <div className="bg-white rounded-2xl p-6 border border-tea-green-pale/50 shadow-sm">
      <h2 className="font-serif text-xl font-bold text-tea-text mb-1">{t("title")}</h2>
      <p className="text-body text-tea-text-light mb-5">{t("intro")}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tiers.map((tier, i) => {
          const name = isEn ? (tier.nameEn || tier.name) : tier.name;
          const desc = isEn ? (tier.descriptionEn || tier.description) : tier.description;
          const isBookable = tier.price === bookablePrice;
          return (
            <div
              key={`${tier.name}-${i}`}
              className={`rounded-control p-4 border ${
                isBookable
                  ? "border-tea-green bg-tea-green-mist"
                  : "border-tea-green-pale/60 bg-tea-cream-light"
              }`}
            >
              <p className="text-label font-medium text-tea-text mb-1">{name}</p>
              <p className="text-xl font-bold text-tea-text mb-2">
                {tier.price === 0 ? t("free") : `NT$ ${tier.price.toLocaleString()}`}
                {tier.price > 0 && (
                  <span className="text-caption font-normal text-tea-text-light ml-1">{t("perPerson")}</span>
                )}
              </p>
              {desc && (
                <p className="text-caption text-tea-text-light leading-relaxed flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-tea-green mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{desc}</span>
                </p>
              )}
              {isBookable && (
                <p className="text-caption text-tea-green font-medium mt-2">{t("bookableOnline")}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* 交易條件，依設計原則 2 用可讀的內文級距，不縮成附註 */}
      <p className="text-body text-tea-text-light mt-4">{t("onSiteNote")}</p>
    </div>
  );
}
