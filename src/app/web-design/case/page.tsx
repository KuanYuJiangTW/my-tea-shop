import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { langAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("webDesignCase.meta");
  return {
    title: t("title"),
    description: t("description"),
    alternates: langAlternates("/web-design/case"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "/web-design/case",
    },
  };
}

export default async function WebDesignCasePage() {
  const locale = await getLocale();
  const t = await getTranslations("webDesignCase");
  const lineUrl = process.env.NEXT_PUBLIC_LINE_ADD_URL;
  const lp = (path: string) => (locale === "en" ? `/en${path}` : path);

  const startingItems = t.raw("starting.items") as string[];
  const whatWeDidItems = t.raw("whatWeDid.items") as { title: string; desc: string }[];
  const nowItems = t.raw("now.items") as string[];

  return (
    <div className="bg-tea-cream-light min-h-screen">
      {/* 標題區 */}
      <section className="bg-tea-green-mist border-b border-tea-green-pale/50 py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-tea-text mb-5 leading-tight">
            {t("hero.title")}
          </h1>
          <p className="text-tea-green-ink font-medium text-sm md:text-base mb-6">
            {t("hero.subtitle")}
          </p>
          <p className="text-tea-text-muted max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            {t("hero.intro")}
          </p>
        </div>
      </section>

      {/* 起點 */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-tea-text text-center mb-8">
          {t("starting.sectionTitle")}
        </h2>
        <p className="text-tea-text-muted leading-relaxed mb-6">{t("starting.intro")}</p>
        <ul className="space-y-3">
          {startingItems.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 text-sm text-tea-text bg-white rounded-xl px-5 py-4 border border-tea-green-pale/30"
            >
              <span className="text-tea-green-ink mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 我們做了什麼 */}
      <section className="bg-tea-green-mist/40 py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-tea-text text-center mb-12">
            {t("whatWeDid.sectionTitle")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {whatWeDidItems.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl border border-tea-green-pale/40 p-6"
              >
                <h3 className="font-serif font-bold text-tea-text mb-2">{item.title}</h3>
                <p className="text-sm text-tea-text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 現在的霧抉茶 */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-tea-text text-center mb-8">
          {t("now.sectionTitle")}
        </h2>
        <ul className="space-y-3">
          {nowItems.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 text-sm text-tea-text bg-white rounded-xl px-5 py-4 border border-tea-green-pale/30"
            >
              <span className="text-tea-green-ink mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 收尾 CTA */}
      <section className="bg-tea-text py-16 md:py-20 text-center px-4">
        <p className="font-serif text-2xl md:text-3xl font-bold text-tea-cream-light mb-8">
          {t("cta.text")}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={lp("/web-design")}
            className="bg-tea-green-ink hover:bg-tea-green-deep text-white px-8 py-3 rounded-full text-sm font-medium transition-colors"
          >
            {t("cta.pricingButton")}
          </Link>
          {lineUrl && (
            <a
              href={lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-tea-cream-light border border-tea-green-light text-tea-text px-8 py-3 rounded-full text-sm font-medium transition-colors"
            >
              {t("cta.lineButton")}
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
