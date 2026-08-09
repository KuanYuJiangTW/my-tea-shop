import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { getExperienceTypes, getExperienceContents } from "@/lib/experiences";
import { getTranslations, getLocale } from "next-intl/server";
import { langAlternates } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "茶山體驗 | 霧抉茶",
  description: "親身走入嘉義阿里山梅山茶園，體驗茶藝、烤茶、採茶、紅茶製作與淺漬茶果酒，感受從茶葉到生活的每一個細節。",
  alternates: langAlternates("/experiences"),
  openGraph: {
    title:       "茶山體驗 | 霧抉茶",
    description: "親身走入嘉義阿里山梅山茶園，體驗茶藝、烤茶、採茶、紅茶製作與淺漬茶果酒，感受從茶葉到生活的每一個細節。",
    url:         "/experiences",
    images: [{ url: "/images/gallery/tea-cup.jpg", width: 1200, height: 630, alt: "霧抉茶茶山體驗" }],
  },
};

export default async function ExperiencesPage() {
  const [experiences, contents, t, locale] = await Promise.all([
    getExperienceTypes(),
    getExperienceContents(),
    getTranslations("experiences"),
    getLocale(),
  ]);
  const lp = (path: string) => locale === "en" ? `/en${path}` : path;
  const isEn = locale === "en";
  const contentMap = Object.fromEntries(contents.map(c => [c.slug, c]));

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-tea-green-mist py-12 md:py-20 border-b border-tea-green-pale">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-tea-green text-xs tracking-[0.3em] uppercase mb-4">{t("sectionLabel")}</p>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-tea-text mb-4">{t("pageTitle")}</h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-5" />
          <p className="text-tea-text-light text-body-lg max-w-lg mx-auto">{t("pageTagline")}</p>
        </div>
      </div>

      {/* 體驗卡片列表 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {experiences.map((exp) => {
            const content = contentMap[exp.slug];
            if (!content) return null;
            const imgSrc = content.coverImage ?? "/images/gallery/tea-cup.jpg";
            const isExternal = imgSrc.startsWith("https://");

            return (
              <Link
                key={exp.id}
                href={lp(`/experiences/${exp.slug}`)}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-tea-green-pale/50"
              >
                <div className="relative h-56 md:h-64 overflow-hidden">
                  <Image
                    src={imgSrc}
                    alt={exp.name}
                    fill
                    {...(isExternal ? {} : {})}
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {exp.requiresAdult && (
                    <span className="absolute top-3 right-3 bg-tea-text text-tea-cream text-xs px-3 py-1 rounded-full">
                      {t("adultOnly")}
                    </span>
                  )}
                </div>

                <div className="p-6">
                  <p className="text-tea-green text-xs tracking-widest uppercase mb-2">{exp.nameEn}</p>
                  <h2 className="font-serif text-2xl font-bold text-tea-text mb-3 group-hover:text-tea-green transition-colors">
                    {isEn ? exp.nameEn : exp.name}
                  </h2>
                  <p className="text-tea-text-light text-body mb-5">
                    {(isEn && content.taglineEn) ? content.taglineEn : content.tagline}
                  </p>
                  <div className="flex items-center gap-5 text-sm text-tea-text-light mb-5">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-tea-green" />
                      {t("duration", { hours: exp.durationHours })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-tea-green" />
                      {t("participants", { min: exp.minParticipants, max: exp.maxParticipants })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-tea-text-light">{t("perPersonLabel")}</span>
                      <span className="text-2xl font-bold text-tea-text ml-1">
                        NT$ {exp.price.toLocaleString()}
                      </span>
                    </div>
                    <span className="bg-tea-green text-white text-sm px-5 py-2 rounded-full group-hover:bg-tea-green-dark transition-colors">
                      {t("viewSessions")}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 注意事項 */}
        <div className="mt-16 bg-tea-cream rounded-2xl p-8 border border-tea-green-pale">
          <h3 className="font-serif text-xl font-bold text-tea-text mb-4">{t("noticeTitle")}</h3>
          {/* 預約前必讀——依設計原則 2「交易時刻，清晰壓倒氣氛」，這類內容不該用 14px */}
          <ul className="space-y-2 text-body text-tea-text-light">
            <li>• {t("notice1")}</li>
            <li>• {t("notice2")}</li>
            <li>• {t("notice3")}</li>
            <li>• {t("notice4")}</li>
          </ul>
          <div className="mt-5 pt-5 border-t border-tea-green-pale flex items-center justify-between">
            <p className="text-sm text-tea-text-light">{t("hasQuestions")}</p>
            <Link
              href={lp("/faq")}
              className="text-tea-green hover:text-tea-green-dark text-sm font-medium flex items-center py-2 gap-1 transition-colors"
            >
              {t("viewFAQ")}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
