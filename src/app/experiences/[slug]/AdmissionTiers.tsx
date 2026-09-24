import { getLocale, getTranslations } from "next-intl/server";
import { Check } from "lucide-react";

import type { AdmissionTier } from "@/lib/experiences";

/**
 * 同一個地點的多種參加方式與價格。
 *
 * 為什麼要有這一區：萬鷺朝鳳實際上有三層——免費停車自己看、看鳥茶位、導覽。
 * 只寫最貴的那層會出事：2026-08-22 的 Google AI 模式把信淳茶居列在「需低消或
 * 住宿」，只顯示導覽價，旁邊競品是「低消 200」與「自備小吃不加價」——看起來
 * 最貴，而且像是不付錢進不去。事實上旁邊的免費觀景平台也是他們家的。
 *
 * 所以這一區的第一件事是**打掉「不付錢進不去」的印象**（標題就是「看鳥不用
 * 錢」），第二件事才是把付費選項講成「要不要坐下來、要不要有人解說」。
 * 最貴的那層加上推薦標記與視覺重量，讓選擇從「三選一比價」變成「要不要升級」。
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
      <h2 className="font-serif text-xl font-normal text-tea-text mb-1 tracking-display">{t("title")}</h2>
      <p className="text-body text-tea-text-muted mb-5">{t("intro")}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tiers.map((tier, i) => {
          const name = isEn ? (tier.nameEn || tier.name) : tier.name;
          const desc = isEn ? (tier.descriptionEn || tier.description) : tier.description;
          const isBookable = tier.price === bookablePrice;
          return (
            <div
              key={`${tier.name}-${i}`}
              className={`relative rounded-control p-4 border ${
                isBookable
                  ? "border-tea-green bg-tea-green-mist ring-2 ring-tea-green/40 shadow-sm"
                  : "border-tea-green-pale/60 bg-tea-cream-light"
              }`}
            >
              {isBookable && (
                <span className="absolute -top-2.5 right-3 bg-tea-green-dark text-white text-caption font-medium px-2 py-0.5 rounded-pill">
                  {t("recommended")}
                </span>
              )}
              <p className="text-label font-medium text-tea-text mb-1">{name}</p>
              <p className="text-xl font-bold text-tea-text mb-2">
                {tier.price === 0 ? t("free") : `NT$ ${tier.price.toLocaleString()}`}
                {tier.price > 0 && (
                  <span className="text-caption font-normal text-tea-text-muted ml-1">{t("perPerson")}</span>
                )}
              </p>
              {desc && (
                <p className="text-caption text-tea-text-muted leading-relaxed flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-tea-green-ink mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{desc}</span>
                </p>
              )}
              {isBookable && (
                <p className="text-caption text-tea-green-ink font-medium mt-2">{t("bookableOnline")}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* 交易條件，依設計原則 2 用可讀的內文級距，不縮成附註 */}
      <p className="text-body text-tea-text-muted mt-4">{t("onSiteNote")}</p>
    </div>
  );
}
