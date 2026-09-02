import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { getArticles, pick } from "@/lib/articles";
import { langAlternates, openGraphFor } from "@/lib/seo";

export const revalidate = 3600;

/**
 * 茶知識文章列表。
 *
 * **這一頁本來不存在，但全站早就當它存在了**（2026-08-25 發現）：每篇文章的
 * BreadcrumbList JSON-LD 第二層都指向 `/tea-guide`，而那個網址回 404。
 * 送 Search Console 建立索引時被擋下來才浮出水面——麵包屑指向 404 不會有任何
 * 錯誤訊息，只會讓 Google 收到一組指向死路的結構化資料。
 *
 * 所以這頁的第一個責任是讓那個麵包屑成立，第二個才是當文章入口：沒有它，
 * 新文章只能靠零星的內文連結被發現。
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teaGuide.meta");
  return {
    // 品牌名交給 root layout 的 title.template 接（見 faq/page.tsx 註解）
    title:       t("title"),
    description: t("description"),
    alternates:  await langAlternates("/tea-guide"),
    openGraph: await openGraphFor("/tea-guide", {
      titleWithBrand: t("title"),
      description:    t("description"),
    }),
  };
}

export default async function TeaGuidePage() {
  const [articles, t, locale] = await Promise.all([
    getArticles(),
    getTranslations("teaGuide"),
    getLocale(),
  ]);
  const isEn = locale === "en";
  const lp = (path: string) => (isEn ? `/en${path}` : path);

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(isEn ? "en-US" : "zh-TW", {
      year: "numeric", month: isEn ? "long" : "numeric", day: "numeric",
    }).format(new Date(iso));

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-tea-green-mist py-12 md:py-20 border-b border-tea-green-pale">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-tea-green-ink text-xs tracking-[0.3em] uppercase mb-4">{t("label")}</p>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-tea-text mb-4">{t("pageTitle")}</h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-5" />
          <p className="text-tea-text-muted text-body-lg max-w-lg mx-auto">{t("pageTagline")}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {articles.length === 0 ? (
          // Sanity 掛掉時 getArticles 回空陣列（見 src/lib/articles.ts）——
          // 顯示空狀態而不是讓頁面看起來壞掉
          <p className="text-center text-body text-tea-text-faint">{t("empty")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {articles.map(article => {
              const title   = pick(article.title, article.titleEn, isEn);
              const excerpt = pick(article.excerpt, article.excerptEn, isEn);
              const alt     = pick(article.coverImageAlt ?? title, article.coverImageAltEn, isEn);
              const date    = article.updatedAt ?? article.publishedAt;
              return (
                <Link
                  key={article.slug}
                  href={lp(`/tea-guide/${article.slug}`)}
                  className="group block bg-white rounded-2xl overflow-hidden border border-tea-green-pale/60 shadow-sm hover:shadow-resting transition-shadow duration-base ease-standard"
                >
                  {article.coverImage && (
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <Image
                        src={article.coverImage}
                        alt={alt}
                        fill
                        sizes="(max-width: 768px) 100vw, 480px"
                        className="object-cover group-hover:scale-105 transition-transform duration-slow ease-standard"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <p className="text-caption text-tea-text-faint mb-2">
                      {article.updatedAt ? t("updatedOn", { date: fmt(date) }) : t("publishedOn", { date: fmt(date) })}
                    </p>
                    <h2 className="font-serif text-xl font-bold text-tea-text mb-2 group-hover:text-tea-green-ink transition-colors duration-base ease-standard">
                      {title}
                    </h2>
                    {/* 摘要截三行：列表頁的工作是讓人選一篇，不是讓人讀完 */}
                    <p className="text-body text-tea-text-muted line-clamp-3">{excerpt}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
