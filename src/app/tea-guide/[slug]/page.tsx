import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { linkifyParagraph } from "@/lib/article-links";
import { getArticle, getArticles, pick, pickList } from "@/lib/articles";
import { faqPageJsonLd, jsonLdString, langAlternates, openGraphFor } from "@/lib/seo";

export const revalidate = 3600;

// 全站唯一對外電話。目前各處（Footer、退換貨、帳戶頁）都各自寫死，沒有共用常數；
// 這裡沿用該慣例而不順手抽一個 lib——抽的話要一併改 6 個檔，超出這次的範圍。
const CONTACT_PHONE      = "0972-619-391";
const CONTACT_PHONE_HREF = "tel:0972619391";

// 內文連結：用 green-ink（#58745F）而不是 tea-green（#7D9B84）。
// 後者當文字在米白上只有 2.85，讀者根本看不出那是連結。
const INLINE_LINK =
  "text-tea-green-ink underline underline-offset-2 decoration-tea-green-pale " +
  "hover:decoration-tea-green-ink transition-colors duration-base ease-standard";

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

  // 小標與段落先挑好語言，JSON-LD 與畫面共用同一份——兩邊各自 pick 一次的話，
  // 只要哪天挑法改了就會出現「頁面顯示中文、結構化資料是英文」
  const localizedSections = article.sections.map(s => ({
    heading:    pick(s.heading, s.headingEn, isEn),
    paragraphs: pickList(s.paragraphs, s.paragraphsEn, isEn),
  }));

  // 內文自動連結：電話 → tel:、體驗名稱 → 體驗頁（全文只連第一次）。
  // `linked` 要在所有段落之間共用，所以在這裡建、往下傳。
  // JSON-LD 仍吃上面那份純文字的 localizedSections——結構化資料不該帶 <a>
  const linkableNames = (article.relatedExperiences ?? []).map(exp => ({
    name: isEn ? (exp.nameEn || exp.name) : exp.name,
    href: lp(`/experiences/${exp.slug}`),
  }));
  const linked = new Set<string>();
  const renderedSections = localizedSections.map(s => ({
    heading:    s.heading,
    paragraphs: s.paragraphs.map(text => linkifyParagraph(text, linkableNames, linked)),
  }));

  // 問句小標 → FAQPage。攻略型文章的小標本來就是讀者的問句（「什麼時候來最好？」），
  // 宣告出來 Google 才有機會把問答直接展開在搜尋結果裡。沒有問句小標就回 null，
  // 一般敘事型文章不會被硬套上 FAQ 標記
  const faqJsonLd = faqPageJsonLd(localizedSections, `${baseUrl}${pagePath}`);

  const published = new Intl.DateTimeFormat(isEn ? "en-US" : "zh-TW", {
    year: "numeric", month: isEn ? "long" : "numeric", day: "numeric",
  }).format(new Date(article.updatedAt ?? article.publishedAt));

  return (
    <div className="min-h-screen bg-tea-cream-light">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd) }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faqJsonLd) }} />
      )}

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <p className="text-tea-green text-xs tracking-[0.3em] uppercase mb-3">{t("label")}</p>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-4">{title}</h1>
        {/* 內文一律用 tea-text-muted 而不是 tea-text-light：後者在米白上只有 3.43，
            低於 WCAG AA 的 4.5。這頁手機版 5,968px 高、常在山上戶外強光下讀，
            對比是能不能讀完的問題。層次改由字級與字重承擔，不再靠淡化文字 */}
        <p className="text-body-lg text-tea-text-muted mb-3">{description}</p>
        <p className="text-caption text-tea-text-muted mb-8">
          {article.updatedAt ? t("updatedOn", { date: published }) : t("publishedOn", { date: published })}
        </p>

        {article.coverImage && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-10">
            <Image src={article.coverImage} alt={imageAlt} fill priority sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
          </div>
        )}

        <div className="space-y-10">
          {renderedSections.map((section, i) => (
            <section key={`${section.heading}-${i}`}>
              <h2 className="font-serif text-xl md:text-2xl font-bold text-tea-text mb-4">
                {section.heading}
              </h2>
              <div className="space-y-4">
                {section.paragraphs.map((segments, j) => (
                  <p key={j} className="text-body text-tea-text-muted leading-relaxed">
                    {segments.map((seg, k) =>
                      typeof seg === "string" ? (
                        seg
                      ) : seg.href.startsWith("tel:") ? (
                        // tel: 不走 next/link——它不是路由，Link 的預抓與攔截毫無意義
                        <a key={k} href={seg.href} className={INLINE_LINK}>{seg.text}</a>
                      ) : (
                        <Link key={k} href={seg.href} className={INLINE_LINK}>{seg.text}</Link>
                      ),
                    )}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {article.relatedExperiences && article.relatedExperiences.length > 0 && (
          <div className="mt-14 bg-tea-cream rounded-2xl border border-tea-green-pale p-6 md:p-8">
            <h2 className="font-serif text-xl font-bold text-tea-text mb-2">{t("ctaTitle")}</h2>
            <p className="text-body text-tea-text-muted mb-5">{t("ctaIntro")}</p>

            {/* 手機整寬直排、桌機並排。原本是 166×42 的靠左小藥丸，是全頁唯一的出口
                卻長得像次要按鈕；白字壓 tea-green 又只有 3.05 對比，是全頁最不清楚的元素。
                改用 green-ink（白字 5.15）並拉到最小點擊尺寸以上 */}
            <div className="flex flex-col sm:flex-row gap-3">
              {article.relatedExperiences.map(exp => (
                <Link
                  key={exp.slug}
                  href={lp(`/experiences/${exp.slug}`)}
                  className="flex-1 text-center text-label font-medium px-6 py-3.5 rounded-pill bg-tea-green-ink text-white hover:bg-tea-green-dark transition-colors duration-base ease-standard shadow-resting"
                >
                  {isEn ? (exp.nameEn || exp.name) : exp.name}
                </Link>
              ))}

              {/* 打電話是這裡轉換最高的一條路：接電話的就是寫這篇文章的人。
                  做成次要樣式而不是第三個綠塊，讓「預約」仍然是視覺主角 */}
              <a
                href={CONTACT_PHONE_HREF}
                className="flex-1 text-center text-label font-medium px-6 py-3.5 rounded-pill border-2 border-tea-green-ink text-tea-green-ink hover:bg-tea-green-ink hover:text-white transition-colors duration-base ease-standard"
              >
                {t("ctaCall", { phone: CONTACT_PHONE })}
              </a>
            </div>

            <p className="text-caption text-tea-text-muted mt-4">{t("ctaCallNote")}</p>
          </div>
        )}
      </article>
    </div>
  );
}
