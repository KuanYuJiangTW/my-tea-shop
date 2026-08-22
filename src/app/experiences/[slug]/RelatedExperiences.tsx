import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { getExperienceContents, getExperienceTypes } from "@/lib/experiences";
import { seasonState, taipeiToday } from "@/lib/experience-ordering";

/**
 * 同日加購的交叉銷售。
 *
 * 為什麼放在詳細頁而不是列表頁：客人上山一趟佔住的是**半天的接待**，不是體驗
 * 那兩小時——同一個半天塞兩個體驗，接待成本完全不變、營收翻倍。而會看到這一
 * 區的人已經決定要來了，這時候的交叉銷售命中率最高（見
 * openspec/changes/experience-open-class-request/proposal.md 的定價一節）。
 *
 * **刻意不推銷不能訂的東西**：季節還沒開始或已結束的體驗會被濾掉。推一個
 * 客人點進去只看到「9/15 開放」的體驗，比不推還糟。
 */
interface Props {
  currentSlug: string;
  /** 最多顯示幾張 */
  limit?: number;
}

export default async function RelatedExperiences({ currentSlug, limit = 3 }: Props) {
  const [types, contents, t, tc, locale] = await Promise.all([
    getExperienceTypes(),          // 已依「釘選 → 季節 → sort_order → id」排好
    getExperienceContents(),
    getTranslations("experiences.crossSell"),
    getTranslations("experiences"),
    getLocale(),
  ]);

  const today = taipeiToday();
  const isEn  = locale === "en";
  const lp    = (path: string) => (isEn ? `/en${path}` : path);
  const contentMap = Object.fromEntries(contents.map(c => [c.slug, c]));

  const others = types
    .filter(e => e.slug !== currentSlug)
    .filter(e => {
      // 現在訂得到的才推：不分季節（none）或正在季節中（in-season）
      const kind = seasonState(e.windows, today).kind;
      return kind === "none" || kind === "in-season";
    })
    .filter(e => contentMap[e.slug])
    .slice(0, limit);

  if (others.length === 0) return null;

  const lineUrl = process.env.NEXT_PUBLIC_LINE_TEA_URL;

  return (
    <section className="mt-16 md:mt-20">
      <div className="bg-tea-cream rounded-2xl border border-tea-green-pale p-6 md:p-8">
        <h2 className="font-serif text-xl md:text-2xl font-bold text-tea-text mb-2">
          {t("title")}
        </h2>
        {/* text-body 而非 label：這是交易條件（折扣與怎麼取得），
            依設計原則 2「交易時刻，清晰壓倒氣氛」不能塞成附註級距 */}
        <p className="text-body text-tea-text-light mb-6 max-w-2xl">
          {t("intro")}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {others.map(exp => {
            const content = contentMap[exp.slug];
            const imgSrc = content.coverImage ?? "/images/gallery/tea-cup.jpg";
            const name = isEn ? (exp.nameEn || exp.name) : exp.name;
            return (
              <Link
                key={exp.id}
                href={lp(`/experiences/${exp.slug}`)}
                className="group bg-white rounded-card overflow-hidden border border-tea-green-pale/60 hover:shadow-raised transition-shadow duration-base ease-standard"
              >
                <div className="relative h-32 overflow-hidden">
                  <Image
                    src={imgSrc}
                    alt={name}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-tea-text mb-1 group-hover:text-tea-green transition-colors">
                    {name}
                  </h3>
                  <div className="flex items-center gap-3 text-caption text-tea-text-light">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-tea-green" />
                      {tc("duration", { hours: exp.durationHours })}
                    </span>
                    <span>NT$ {exp.price.toLocaleString()}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {lineUrl && (
          <a
            href={lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 text-label font-medium px-5 py-2.5 rounded-control bg-tea-green text-white hover:bg-tea-green-dark transition-colors duration-base ease-standard"
          >
            {t("askLine")}
          </a>
        )}
      </div>
    </section>
  );
}
