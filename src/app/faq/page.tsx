import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { sanityFetch } from "@/sanity/client";
import { ALL_FAQS_QUERY } from "@/sanity/queries";
import FaqClient from "./FaqClient";
import { langAlternates, openGraphFor, jsonLdString } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("faq.meta");
  const alternates = await langAlternates("/faq");
  return {
    // 不要在頁面 title 寫品牌名：root layout 的 title.template 會接上「| 霧抉茶」，
    // 自己再寫一次會變成「常見問題 | 霧抉茶 | 霧抉茶」。openGraph.title 不吃 template，
    // 那裡才需要自己帶品牌名。
    title: t("title"),
    description: t("description"),
    alternates,
    openGraph: await openGraphFor("/faq", { titleWithBrand: t("title"), description: t("description") }),
  };
}

interface Faq {
  _id:         string;
  question:    string;
  question_en: string | null;
  answer:      unknown[];
  answer_en:   unknown[] | null;
  category:    string;
  order:       number;
}

export default async function FaqPage() {
  const [faqs, locale, t] = await Promise.all([
    sanityFetch<Faq[]>(ALL_FAQS_QUERY).catch(() => [] as Faq[]),
    getLocale(),
    getTranslations("faq"),
  ]);
  const lp = (path: string) => locale === "en" ? `/en${path}` : path;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";

  // 將 PortableText block 轉純文字供 JSON-LD 使用
  const toPlain = (blocks: unknown[]): string =>
    (blocks as Array<{ _type?: string; children?: Array<{ text?: string }> }>)
      .filter(b => b._type === "block")
      .map(b => (b.children ?? []).map(c => c.text ?? "").join(""))
      .join("\n");

  const faqJsonLd = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": toPlain(faq.answer),
      },
    })),
  } : null;

  return (
    <>
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(faqJsonLd) }}
        />
      )}
      <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-tea-green-mist py-12 md:py-20 border-b border-tea-green-pale">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-tea-green-ink text-xs tracking-[0.3em] uppercase mb-4">FAQ</p>
          <h1 className="font-serif text-3xl md:text-5xl font-normal text-tea-text mb-4 tracking-display">{t("pageTitle")}</h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-5" />
          <p className="text-tea-text-muted">{t("pageTagline")}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {faqs.length === 0 ? (
          <p className="text-center text-tea-text-muted py-16">{t("loading")}</p>
        ) : (
          <FaqClient faqs={faqs} locale={locale} />
        )}

        {/* 聯絡我們 */}
        <div className="mt-12 bg-tea-cream rounded-2xl p-8 text-center border border-tea-green-pale">
          <p className="font-serif text-xl font-bold text-tea-text mb-2">{t("moreQuestions")}</p>
          <p className="text-tea-text-muted text-sm mb-5">{t("moreQuestionsDesc")}</p>
          <Link
            href={lp("/contact")}
            className="bg-tea-green-dark hover:bg-tea-green-ink text-white px-7 py-2.5 rounded-full text-sm font-medium transition-colors inline-block"
          >
            {t("contactBtn")}
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
