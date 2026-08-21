import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { getArticle, getArticles, pick, pickList } from "@/lib/articles";
import { jsonLdString, langAlternates, openGraphFor } from "@/lib/seo";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map(a => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article  = await getArticle(slug);
  if (!article) return {};

  const isEn = (await getLocale()) === "en";
  const title       = pick(article.title, article.titleEn, isEn);
  const description = pick(article.excerpt, article.excerptEn, isEn);
  const keywords    = pickList(article.keywords ?? [], article.keywordsEn, isEn);
  const image       = article.coverImage ?? "/images/gallery/tea-cup.jpg";
  const imageAlt    = pick(article.coverImageAlt ?? title, article.coverImageAltEn, isEn);

  return {
    // 品牌名交給 root layout 的 title.template 接，這裡不重複寫
    title,
    description,
    ...(keywords.length > 0 ? { keywords } : {}),
    alternates: await langAlternates(`/tea-guide/${slug}`),
    openGraph: await openGraphFor(`/tea-guide/${slug}`, {
      titleWithBrand: title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: imageAlt }],
    }),
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const [article, locale, t] = await Promise.all([
    getArticle(slug),
    getLocale(),
    getTranslations("teaGuide"),
  ]);
  if (!article) notFound();

  const isEn = locale === "en";
  const lp   = (path: string) => (isEn ? `/en${path}` : path);

  const title       = pick(article.title, article.titleEn, isEn);
  const description = pick(article.excerpt, article.excerptEn, isEn);
  const imageAlt    = pick(article.coverImageAlt ?? title, article.coverImageAltEn, isEn);

  const baseUrl  = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";
  const pagePath = `${isEn ? "/en" : ""}/tea-guide/${slug}`;
  const image    = article.coverImage ?? `${baseUrl}/images/gallery/tea-cup.jpg`;

  // author／publisher 指向首頁的 LocalBusiness（@id 由 seo-structured-data 規格定義），
  // 讓文章的權威性掛在同一個實體上，而不是各自宣告一個孤立的 Organization
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: image.startsWith("http") ? image : `${baseUrl}${image}`,
    datePublished: article.publishedAt,
    ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
    author:    { "@id": `${baseUrl}/#business` },
    publisher: { "@id": `${baseUrl}/#business` },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${baseUrl}${pagePath}` },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: isEn ? "Home" : "首頁", item: isEn ? `${baseUrl}/en` : baseUrl },
      { "@type": "ListItem", position: 2, name: t("breadcrumb"), item: `${baseUrl}${isEn ? "/en" : ""}/tea-guide` },
      { "@type": "ListItem", position: 3, name: title, item: `${baseUrl}${pagePath}` },
    ],
  };

  const published = new Intl.DateTimeFormat(isEn ? "en-US" : "zh-TW", {
    year: "numeric", month: isEn ? "long" : "numeric", day: "numeric",
  }).format(new Date(article.updatedAt ?? article.publishedAt));

  return (
    <div className="min-h-screen bg-tea-cream-light">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd) }} />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <p className="text-tea-green text-xs tracking-[0.3em] uppercase mb-3">{t("label")}</p>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-4">{title}</h1>
        <p className="text-body-lg text-tea-text-light mb-3">{description}</p>
        <p className="text-caption text-tea-text-light/80 mb-8">
          {article.updatedAt ? t("updatedOn", { date: published }) : t("publishedOn", { date: published })}
        </p>

        {article.coverImage && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-10">
            <Image src={article.coverImage} alt={imageAlt} fill priority sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
          </div>
        )}

        <div className="space-y-10">
          {article.sections.map((section, i) => (
            <section key={`${section.heading}-${i}`}>
              <h2 className="font-serif text-xl md:text-2xl font-bold text-tea-text mb-4">
                {pick(section.heading, section.headingEn, isEn)}
              </h2>
              <div className="space-y-4">
                {pickList(section.paragraphs, section.paragraphsEn, isEn).map((p, j) => (
                  <p key={j} className="text-body text-tea-text-light leading-relaxed">{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {article.relatedExperiences && article.relatedExperiences.length > 0 && (
          <div className="mt-14 bg-tea-cream rounded-2xl border border-tea-green-pale p-6 md:p-8">
            <h2 className="font-serif text-xl font-bold text-tea-text mb-2">{t("ctaTitle")}</h2>
            <p className="text-body text-tea-text-light mb-5">{t("ctaIntro")}</p>
            <div className="flex flex-wrap gap-3">
              {article.relatedExperiences.map(exp => (
                <Link
                  key={exp.slug}
                  href={lp(`/experiences/${exp.slug}`)}
                  className="text-label font-medium px-5 py-2.5 rounded-control bg-tea-green text-white hover:bg-tea-green-dark transition-colors duration-base ease-standard"
                >
                  {isEn ? (exp.nameEn || exp.name) : exp.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
