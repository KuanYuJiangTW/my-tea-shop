import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { langAlternates, openGraphFor } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("returnPolicy.meta");
  const alternates = await langAlternates("/return-policy");
  return {
    title: t("title"),
    description: t("description"),
    alternates,
    openGraph: await openGraphFor("/return-policy", {
      titleWithBrand: t("title"),
      description: t("description"),
    }),
  };
}

const STEP_KEYS = ["s1", "s2", "s3", "s4"] as const;
const METHOD_KEYS = ["m1", "m2"] as const;
const EXCEPTION_KEYS = ["e1", "e2", "e3", "e4", "e5", "e6"] as const;

export default async function ReturnPolicyPage() {
  const t = await getTranslations("returnPolicy");

  return (
    <div>
      {/* Hero */}
      <section className="bg-tea-text py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-tea-green/10 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-tea-green/8 rounded-full" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <p className="text-tea-green text-xs tracking-[0.3em] uppercase mb-5">
            {t("hero.label")}
          </p>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-tea-cream-light mb-6">
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

          {/* 七天鑑賞期 */}
          <div className="bg-white rounded-2xl shadow-sm border border-tea-cream-dark/30 p-8 md:p-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-tea-green/20 flex items-center justify-center flex-shrink-0">
                <span className="text-tea-green font-bold text-sm">1</span>
              </div>
              <h2 className="font-serif text-lg font-bold text-tea-text">{t("section1.title")}</h2>
            </div>
            <p className="text-sm text-tea-text/70 leading-8">
              {t.rich("section1.content", {
                strong: (chunks) => <strong className="text-tea-text">{chunks}</strong>,
              })}
            </p>
            <div className="mt-4 p-4 bg-tea-cream rounded-xl border border-tea-cream-dark/30 text-sm text-tea-text/60 leading-7">
              <strong className="text-tea-text/80">{t("section1.noteLabel")}</strong>{t("section1.noteContent")}
            </div>
          </div>

          {/* 退貨流程 */}
          <div className="bg-white rounded-2xl shadow-sm border border-tea-cream-dark/30 p-8 md:p-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-tea-green/20 flex items-center justify-center flex-shrink-0">
                <span className="text-tea-green font-bold text-sm">2</span>
              </div>
              <h2 className="font-serif text-lg font-bold text-tea-text">{t("section2.title")}</h2>
            </div>
            <ol className="space-y-5">
              {STEP_KEYS.map((key, i) => (
                <li key={key} className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-tea-green/15 flex items-center justify-center mt-0.5">
                    <span className="text-xs font-bold text-tea-green">{i + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-tea-text mb-1">{t(`section2.steps.${key}.step`)}</p>
                    <p className="text-sm text-tea-text/65 leading-7">{t(`section2.steps.${key}.desc`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* 退款方式 */}
          <div className="bg-white rounded-2xl shadow-sm border border-tea-cream-dark/30 p-8 md:p-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-tea-green/20 flex items-center justify-center flex-shrink-0">
                <span className="text-tea-green font-bold text-sm">3</span>
              </div>
              <h2 className="font-serif text-lg font-bold text-tea-text">{t("section3.title")}</h2>
            </div>
            <div className="space-y-4 text-sm text-tea-text/70 leading-8">
              {METHOD_KEYS.map((key) => (
                <div key={key} className="flex items-start gap-3 p-4 rounded-xl bg-tea-cream/60 border border-tea-cream-dark/20">
                  <span className="text-tea-green font-bold flex-shrink-0 mt-0.5">●</span>
                  <div>
                    <p className="font-semibold text-tea-text mb-1">{t(`section3.methods.${key}.label`)}</p>
                    <p>{t(`section3.methods.${key}.desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 不接受退貨之例外 */}
          <div className="bg-white rounded-2xl shadow-sm border border-tea-cream-dark/30 p-8 md:p-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-tea-green/20 flex items-center justify-center flex-shrink-0">
                <span className="text-tea-green font-bold text-sm">4</span>
              </div>
              <h2 className="font-serif text-lg font-bold text-tea-text">{t("section4.title")}</h2>
            </div>
            <p className="text-sm text-tea-text/65 leading-7 mb-5">
              {t("section4.intro")}
            </p>
            <ul className="space-y-3">
              {EXCEPTION_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-3 text-sm text-tea-text/70 leading-7">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
                  </svg>
                  {t(`section4.exceptions.${key}`)}
                </li>
              ))}
            </ul>
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200/60 rounded-xl text-sm text-amber-800/80 leading-7">
              <strong>{t("section4.noteLabel")}</strong>{t("section4.noteContent")}
            </div>
          </div>

          {/* 聯絡我們 */}
          <div className="bg-tea-text rounded-2xl p-8 md:p-10 text-center">
            <h3 className="font-serif text-xl font-bold text-tea-cream-light mb-3">{t("contact.title")}</h3>
            <p className="text-tea-green-pale text-sm leading-7 mb-6 whitespace-pre-line">
              {t("contact.desc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="tel:0972619391"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-tea-green text-white rounded-full text-sm font-medium hover:bg-tea-green/90 transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.37 9.5 19.79 19.79 0 01.38 4.46 2 2 0 012.37 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.41 9.84a16 16 0 006.75 6.75l1.2-1.21a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
                0972-619-391
              </a>
              <a
                href="mailto:qdbzdt2846@gmail.com"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-tea-green-pale/40 text-tea-green-pale rounded-full text-sm font-medium hover:bg-white/5 transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                {t("contact.emailBtn")}
              </a>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
