import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import InquiryFormClient from "./InquiryFormClient";
import { langAlternates, openGraphFor } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("webDesign.meta");
  const alternates = await langAlternates("/web-design");
  return {
    title: t("title"),
    description: t("description"),
    alternates,
    openGraph: await openGraphFor("/web-design", {
      title: t("title"),
      description: t("description"),
    }),
  };
}

export default async function WebDesignPage() {
  const locale = await getLocale();
  const t = await getTranslations("webDesign");
  const lineUrl = process.env.NEXT_PUBLIC_LINE_TERROIR_URL;
  const lp = (path: string) => (locale === "en" ? `/en${path}` : path);

  const heroChips = t.raw("hero.chips") as string[];

  const tierKeys = ["starter", "growth", "flagship"] as const;
  const faqItems = t.raw("faq.items") as { q: string; a: string }[];
  const addonItems = t.raw("addons.items") as string[];
  const maintenanceItems = t.raw("maintenance.items") as string[];
  const termsItems = t.raw("terms.items") as string[];
  const painPointItems = t.raw("painPoints.items") as { scenario: string; note: string }[];
  const outcomeItems = t.raw("outcomes.items") as { title: string; desc: string }[];

  return (
    <div className="bg-tea-cream-light min-h-screen">
      {/* Hero */}
      <section className="bg-tea-green-mist border-b border-tea-green-pale/50 py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-tea-green-ink text-xs tracking-[0.3em] uppercase font-medium mb-4">
            {t("hero.eyebrow")}
          </p>
          <h1 className="font-serif text-3xl md:text-5xl font-normal text-tea-text mb-5 leading-tight tracking-display">
            {t("hero.title")}
          </h1>
          <p className="text-tea-text-muted max-w-2xl mx-auto text-sm md:text-base leading-relaxed mb-6">
            {t("hero.subtitle")}
          </p>
          <p className="font-serif text-tea-green-ink text-base md:text-lg italic mb-8">
            {t("hero.quote")}
          </p>

          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {heroChips.map((chip) => (
              <span
                key={chip}
                className="bg-white/70 border border-tea-green-pale text-tea-text text-xs font-medium px-3 py-1.5 rounded-full"
              >
                {chip}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="#tiers"
              className="bg-tea-text hover:bg-tea-text-deep text-white px-8 py-3 rounded-full text-sm font-medium transition-colors"
            >
              {t("hero.ctaPrimary")}
            </a>
            <a
              href="#inquiry"
              className="bg-white hover:bg-tea-cream-light border border-tea-green text-tea-green-ink px-8 py-3 rounded-full text-sm font-medium transition-colors"
            >
              {t("hero.ctaSecondary")}
            </a>
          </div>
        </div>
      </section>

      {/* 痛點區塊 */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <h2 className="font-serif text-2xl md:text-3xl font-normal text-tea-text text-center mb-12 tracking-display">
          {t("painPoints.sectionTitle")}
        </h2>
        <div className="space-y-4 mb-10">
          {painPointItems.map((item) => (
            <div
              key={item.scenario}
              className="bg-white rounded-xl border border-tea-green-pale/40 p-6"
            >
              <p className="text-tea-text-muted italic text-body mb-2">{item.scenario}</p>
              <p className="text-tea-green-ink font-semibold text-sm">{item.note}</p>
            </div>
          ))}
        </div>
        <p className="text-center font-serif text-tea-text text-base md:text-lg">
          {t("painPoints.turn")}
        </p>
      </section>

      {/* 成果區塊 */}
      <section className="bg-tea-green-mist/40 py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl md:text-3xl font-normal text-tea-text text-center mb-12 tracking-display">
            {t("outcomes.sectionTitle")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {outcomeItems.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl border border-tea-green-pale/40 p-6"
              >
                <h3 className="font-serif font-semibold text-tea-text mb-2">{item.title}</h3>
                <p className="text-sm text-tea-text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-tea-text text-white rounded-2xl p-8 md:p-10 text-center">
            <h3 className="font-serif text-xl font-semibold text-tea-green-light mb-4">
              {t("outcomes.roi.title")}
            </h3>
            <p className="text-sm text-tea-green-pale leading-relaxed mb-6 max-w-2xl mx-auto">
              {t("outcomes.roi.body")}
            </p>
            <p className="text-sm italic text-tea-green-pale/90 leading-relaxed mb-6 max-w-2xl mx-auto border-t border-white/10 pt-6">
              {t("outcomes.roi.caseLine")}
            </p>
            <Link
              href={lp("/web-design/case")}
              className="inline-block text-tea-green-light hover:text-white font-medium text-sm underline underline-offset-4"
            >
              {t("outcomes.roi.caseLinkText")}
            </Link>
          </div>
        </div>
      </section>

      {/* 三階報價卡 */}
      <section id="tiers" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <h2 className="font-serif text-2xl md:text-3xl font-normal text-tea-text text-center mb-12 tracking-display">
          {t("tiers.sectionTitle")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
          {tierKeys.map((key) => {
            const isGrowth = key === "growth";
            const features = t.raw(`tiers.${key}.features`) as string[];
            return (
              <div
                key={key}
                className={`relative rounded-2xl p-8 flex flex-col h-full ${
                  isGrowth
                    ? "bg-tea-text text-white shadow-xl border-2 border-tea-green md:-translate-y-3"
                    : "bg-white text-tea-text border border-tea-green-pale/40 shadow-sm"
                }`}
              >
                {isGrowth && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-tea-green-dark text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-wide">
                    {t("tiers.growth.badge")}
                  </span>
                )}
                <h3 className={`font-serif text-xl font-semibold mb-1 ${isGrowth ? "text-white" : "text-tea-text"}`}>
                  {t(`tiers.${key}.name`)}
                </h3>
                <p className={`text-2xl font-bold mb-3 ${isGrowth ? "text-tea-green-light" : "text-tea-green-ink"}`}>
                  {t(`tiers.${key}.price`)}
                </p>
                {key === "flagship" && (
                  <p className="text-xs text-amber-500 font-medium mb-3">{t("tiers.flagship.note")}</p>
                )}
                <p className={`text-sm mb-6 ${isGrowth ? "text-tea-green-pale" : "text-tea-text-muted"}`}>
                  {t(`tiers.${key}.suitFor`)}
                </p>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke={isGrowth ? "#C8DDD0" : "#7D9B84"}
                        strokeWidth="2.5"
                        className="mt-0.5 flex-shrink-0"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className={isGrowth ? "text-tea-green-pale" : "text-tea-text-muted"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <p className={`text-xs font-medium ${isGrowth ? "text-tea-green-pale" : "text-tea-text-muted"}`}>
                  {t(`tiers.${key}.timeline`)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 加購項目 */}
      <section className="bg-tea-green-mist/40 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-tea-text text-center mb-8 tracking-display">
            {t("addons.sectionTitle")}
          </h2>
          <div className="bg-white rounded-2xl border border-tea-green-pale/40 divide-y divide-tea-green-pale/30">
            {addonItems.map((item) => (
              <p key={item} className="px-6 py-4 text-sm text-tea-text">{item}</p>
            ))}
          </div>
        </div>
      </section>

      {/* 維護方案 */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-serif text-2xl font-normal text-tea-text text-center mb-3 tracking-display">
          {t("maintenance.sectionTitle")}
        </h2>
        <p className="text-center text-tea-text-muted text-sm mb-8">{t("maintenance.intro")}</p>
        <div className="bg-tea-text text-white rounded-2xl p-8 text-center">
          <p className="text-2xl font-bold text-tea-green-light mb-6">{t("maintenance.price")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {maintenanceItems.map((item) => (
              <p key={item} className="text-xs text-tea-green-pale">{item}</p>
            ))}
          </div>
        </div>
      </section>

      {/* 商業條款 */}
      <section className="bg-tea-green-mist/40 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-normal text-tea-text text-center mb-8 tracking-display">
            {t("terms.sectionTitle")}
          </h2>
          <ul className="space-y-3">
            {termsItems.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-tea-text bg-white rounded-xl px-5 py-4 border border-tea-green-pale/30">
                <span className="text-tea-green-ink mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-serif text-2xl font-normal text-tea-text text-center mb-8 tracking-display">
          {t("faq.sectionTitle")}
        </h2>
        <div className="space-y-4">
          {faqItems.map((item) => (
            <div key={item.q} className="bg-white rounded-xl border border-tea-green-pale/40 p-6">
              <p className="font-serif font-semibold text-tea-text mb-2">{item.q}</p>
              <p className="text-sm text-tea-text-muted leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 諮詢表單 */}
      <section id="inquiry" className="bg-tea-green-mist/40 py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl md:text-3xl font-normal text-tea-text text-center mb-2 tracking-display">
            {t("form.sectionTitle")}
          </h2>
          <p className="text-center text-tea-text-muted text-sm mb-10">{t("form.subtitle")}</p>
          <InquiryFormClient lineUrl={lineUrl} />
        </div>
      </section>

      {/* 課程籌備 */}
      <section className="py-10 text-center px-4">
        <p className="text-xs text-tea-text-muted">{t("coursePreview")}</p>
      </section>
    </div>
  );
}
