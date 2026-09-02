import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { getArticlesForExperience, pick } from "@/lib/articles";

/**
 * 體驗頁通往相關攻略文章的入口。
 *
 * 文章原本只有 sitemap 找得到——站上沒有任何一個地方點得進去，而**體驗頁的
 * 訪客正是最該讀它的人**：他在猶豫值不值得跑一趟，而文章講的正是幾點來、
 * 停哪、會看到什麼。
 *
 * 關聯只在文章那一邊維護（文章的「文末推薦的體驗」），這裡反查。兩邊各記
 * 一份遲早會不同步。沒有相關文章就完全不顯示。
 */
export default async function GuideLink({ slug }: { slug: string }) {
  const [articles, t, locale] = await Promise.all([
    getArticlesForExperience(slug),
    getTranslations("experiences.guideLink"),
    getLocale(),
  ]);
  if (articles.length === 0) return null;

  const isEn = locale === "en";
  const lp = (path: string) => (isEn ? `/en${path}` : path);

  return (
    <div className="space-y-3">
      {articles.slice(0, 2).map(a => (
        <Link
          key={a.slug}
          href={lp(`/tea-guide/${a.slug}`)}
          className="group flex items-start gap-3 bg-tea-cream rounded-2xl border border-tea-green-pale p-5 hover:border-tea-green transition-colors duration-base ease-standard"
        >
          <BookOpen className="w-5 h-5 text-tea-green-ink mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-caption text-tea-green-ink font-medium mb-1">{t("title")}</p>
            <p className="text-body font-medium text-tea-text group-hover:text-tea-green-ink transition-colors">
              {pick(a.title, a.titleEn, isEn)}
            </p>
            <p className="text-caption text-tea-text-muted mt-1 line-clamp-2">
              {pick(a.excerpt, a.excerptEn, isEn)}
            </p>
            <span className="inline-flex items-center gap-1 text-caption text-tea-green-ink font-medium mt-2">
              {t("cta")}
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
