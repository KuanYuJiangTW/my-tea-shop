import { getLocale, getTranslations } from "next-intl/server";
import { summarizeReviews, type ProductReview } from "@/lib/product-review-core";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} viewBox="0 0 20 20" className={`w-4 h-4 ${i <= rating ? "fill-amber-400" : "fill-gray-200"}`}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

/**
 * 單一商品的評價區塊。版面比照 `experiences/[slug]/ExperienceReviews.tsx`。
 *
 * 兩條規則不要改：
 *   1. **沒有可見評價就整區不渲染**（回 null），不出現「暫無評價」——空狀態的
 *      社會證明是負分
 *   2. **未滿 3 則不顯示平均星等**，只顯示列表（`summarizeReviews` 的
 *      `showAverage`）。與體驗頁 `aggregateRating` 同一個門檻
 *
 * 非 `site` 來源會顯示來源標註。手動建檔的口碑若不標來源就是偽造站內評價，
 * 這行不是裝飾（design.md D2）。
 */
export default async function ProductReviews({
  productName,
  reviews,
}: {
  productName: string;
  reviews: ProductReview[];
}) {
  if (reviews.length === 0) return null;

  const [t, locale] = await Promise.all([
    getTranslations("products.reviews"),
    getLocale(),
  ]);

  const { count, average, showAverage } = summarizeReviews(reviews);
  const dateFmt = locale === "en" ? "en-US" : "zh-TW";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h3 className="font-serif text-lg font-bold text-tea-text">{productName}</h3>
        {showAverage && (
          <div className="flex items-center gap-1.5">
            <Stars rating={Math.round(average)} />
            <span className="text-sm font-medium text-tea-text">{average.toFixed(1)}</span>
          </div>
        )}
        <span className="text-sm text-tea-text-muted">{t("count", { count })}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.map(r => (
          <div key={r.id} className="bg-white rounded-2xl p-5 border border-tea-green-pale/50 shadow-resting">
            <div className="flex items-center justify-between gap-3 mb-2">
              <Stars rating={r.rating} />
              <span className="text-xs text-tea-text-muted">
                {new Date(r.reviewedAt).toLocaleDateString(dateFmt)}
              </span>
            </div>
            {r.comment && (
              <p className="text-sm text-tea-text-muted leading-relaxed">{r.comment}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {r.displayName && (
                <span className="text-xs text-tea-text">{r.displayName}</span>
              )}
              {r.source !== "site" && (
                <span className="text-[11px] text-tea-green-ink bg-tea-green-mist px-2 py-0.5 rounded-full">
                  {t(`source.${r.source}`)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
