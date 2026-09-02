import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { langAlternates, openGraphFor } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacyPolicy.meta");
  const alternates = await langAlternates("/privacy");
  return {
    title: t("title"),
    description: t("description"),
    alternates,
    openGraph: await openGraphFor("/privacy", {
      titleWithBrand: t("title"),
      description: t("description"),
    }),
  };
}

const SECTION_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const;

export default async function PrivacyPage() {
  const t = await getTranslations("privacyPolicy");

  return (
    <div>
      {/* Hero */}
      <section className="bg-tea-text py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-tea-green/10 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-tea-green/8 rounded-full" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <p className="text-tea-green-pale text-xs tracking-[0.3em] uppercase mb-5">
            {t("hero.label")}
          </p>
          <h1 className="font-serif text-3xl md:text-5xl font-normal text-tea-cream-light mb-6 tracking-display">
            {t("hero.title")}
          </h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-6" />
          <p className="text-tea-green-pale text-base max-w-xl mx-auto leading-relaxed whitespace-pre-line">
            {t("hero.tagline")}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="bg-tea-cream py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-sm border border-tea-cream-dark/30 p-8 md:p-12 space-y-10">
            {SECTION_KEYS.map((key) => (
              <div key={key}>
                <h2 className="font-serif text-lg font-normal text-tea-text mb-4 pb-2 border-b border-tea-cream-dark/40 tracking-display">
                  {t(`sections.${key}.title`)}
                </h2>
                <p className="text-sm text-tea-text/70 leading-8 whitespace-pre-line">
                  {t(`sections.${key}.content`)}
                </p>
              </div>
            ))}

            <div className="mt-8 p-5 bg-tea-cream rounded-xl border border-tea-cream-dark/30 text-sm text-tea-text/60 leading-7">
              {t("contact.prefix")}<br />
              {t("contact.phone")}<strong className="text-tea-text/80">0972-619-391</strong>
              {" "}{t("contact.email")}<strong className="text-tea-text/80">qdbzdt2846@gmail.com</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
