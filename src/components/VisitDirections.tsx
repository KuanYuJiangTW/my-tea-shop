import { getLocale, getTranslations } from "next-intl/server";

import {
  DRIVE_TIMES, ROAD_NOTE, ROAD_NOTE_EN, ROAD_NOTE_SHORT, ROAD_NOTE_SHORT_EN,
  STREET_ADDRESS, STREET_ADDRESS_EN,
  TEA_HOUSE, VIEWING_PLATFORM, directionsUrl, type VenueDestination,
} from "@/lib/venue";

/**
 * 「怎麼來」——兩個地點的導航、車程與路況。
 *
 * 為什麼是兩顆按鈕而不是一顆：**要導航去哪裡取決於客人選了哪一種**。
 * 免費賞鳥去景觀平台停車場，茶位與導覽去信淳茶居。而且茶居只有 7 個車位，
 * 賞鳥旺季的假日會停滿——那時候的備案也需要一個可以按的目的地。
 *
 * 為什麼不放進浮動 CTA：導航是**出發當天**的動作，不是決策當下的動作。
 * 第一次讀文章的人還在決定要不要來，把導航塞進浮動條只會稀釋掉「打電話」
 * 與「看導覽」這兩顆真正在轉換的按鈕。真的在路上迷路的人，那顆電話已經接得到。
 *
 * ## compact
 *
 * 兩個頁面的讀者處境不同，需要的份量也不同（業主 2026-08-31 回報體驗頁「太佔空間」）：
 *
 * - **攻略文**：讀者在規劃行程、還沒決定要不要來 → 完整版（車程表、路況、地址）
 * - **體驗頁**：讀者已經在看這款要不要訂 → 精簡版，只要知道開去哪
 *
 * 體驗頁本來就有「注意事項」寫了集合地點與停車，上方還有一塊「第一次來？」
 * 直接連到攻略文——完整版擺在那裡等於把同一件事講第三次。
 * 精簡版把 371px（桌機）壓到約 190px。
 */
export default async function VisitDirections({ compact = false }: { compact?: boolean } = {}) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("visit")]);
  const isEn = locale === "en";

  const label = (d: VenueDestination) =>
    compact ? (isEn ? d.shortNameEn : d.shortName) : (isEn ? d.nameEn : d.name);

  const card = (d: VenueDestination, primary: boolean) => (
    <li key={d.name} className="flex-1">
      <a
        href={directionsUrl(d)}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-start gap-3 h-full px-4 py-3.5 rounded-2xl border transition-colors duration-base ease-standard ${
          primary
            ? "bg-tea-green-ink text-white border-tea-green-ink hover:bg-tea-green-dark"
            : "bg-white text-tea-green-ink border-tea-green-pale hover:border-tea-green-ink"
        }`}
      >
        <svg
          width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
          fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          className="shrink-0 mt-0.5"
        >
          <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z" />
          <circle cx="12" cy="10" r="2.6" />
        </svg>
        <span className="min-w-0">
          <span className="block text-label font-medium">
            {t("navigateTo", { place: label(d) })}
          </span>
          <span className={`block text-caption mt-0.5 ${primary ? "text-white/85" : "text-tea-text-muted"}`}>
            {isEn ? d.forWhoEn : d.forWho}
          </span>
        </span>
      </a>
    </li>
  );

  const driveLine = DRIVE_TIMES
    .map(d => `${isEn ? d.fromEn : d.from} ${t("driveMinutes", { minutes: d.minutes })}`)
    .join(isEn ? " · " : "・");

  return (
    <section className="rounded-2xl border border-tea-green-pale bg-tea-cream/60 p-5 md:p-6">
      <h3 className="font-serif text-body-lg font-bold text-tea-text mb-1.5">{t("title")}</h3>
      {!compact && <p className="text-body text-tea-text-muted mb-4">{t("intro")}</p>}

      {/* 茶居排前面：它是集合點，也是三種方式裡有兩種要去的地方 */}
      <ul className={`flex flex-col sm:flex-row gap-3 ${compact ? "mt-3" : ""}`}>
        {card(TEA_HOUSE, true)}
        {card(VIEWING_PLATFORM, false)}
      </ul>

      {compact ? (
        <>
          <p className="text-caption text-tea-text-muted mt-3">{driveLine}</p>
          <p className="text-caption text-tea-text-muted mt-1">
            {(isEn ? ROAD_NOTE_SHORT_EN : ROAD_NOTE_SHORT)}
            {isEn ? " · " : "・"}
            {isEn ? STREET_ADDRESS_EN : STREET_ADDRESS}
          </p>
        </>
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2">
            {DRIVE_TIMES.map(d => (
              <div key={d.from} className="flex items-baseline justify-between sm:block gap-2">
                <dt className="text-caption text-tea-text-muted">{isEn ? d.fromEn : d.from}</dt>
                <dd className="text-body font-medium text-tea-text sm:mt-0.5">
                  {t("driveMinutes", { minutes: d.minutes })}
                </dd>
              </div>
            ))}
          </dl>

          <p className="text-body text-tea-text-muted mt-4">{isEn ? ROAD_NOTE_EN : ROAD_NOTE}</p>
          <p className="text-caption text-tea-text-muted mt-2">{isEn ? STREET_ADDRESS_EN : STREET_ADDRESS}</p>
        </>
      )}
    </section>
  );
}
