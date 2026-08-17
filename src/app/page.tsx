import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Mountain, Flame, Sprout, Clock, Users } from "lucide-react";
import FeaturedSection from "./FeaturedSection";
import BrandStats from "./BrandStats";
import TrustRow from "@/components/TrustRow";
import { getFeaturedProducts } from "@/lib/products";
import { getExperienceTypes, getExperienceContents } from "@/lib/experiences";
import { getTranslations, getLocale } from "next-intl/server";
import { langAlternates, openGraphFor, jsonLdString } from "@/lib/seo";

export const revalidate = 3600;

// canonical 與文案都需跟著當前語言，而 locale 只有在 request 期間才拿得到，
// 因此不能用靜態 metadata 物件（見 src/lib/seo.ts 的說明）。
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home.meta");
  const alternates = await langAlternates("/");
  return {
    title: t("title"),
    description: t("description"),
    alternates,
    openGraph: await openGraphFor("/", { title: t("title"), description: t("description") }),
  };
}

export default async function HomePage() {
  const [featuredProducts, experiences, contents, t, locale] = await Promise.all([
    getFeaturedProducts(),
    getExperienceTypes(),
    getExperienceContents(),
    getTranslations("home"),
    getLocale(),
  ]);
  const tc = await getTranslations("common");
  const isEn = locale === "en";
  const lp = (path: string) => isEn ? `/en${path}` : path;
  const contentMap = Object.fromEntries(contents.map(c => [c.slug, c]));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${baseUrl}/#business`,
    "name": "霧抉茶 Wu Jue Tea",
    "alternateName": "信淳茶居",
    "image": `${baseUrl}/images/gallery/picking2.jpg`,
    "url": baseUrl,
    "telephone": "+886-972-619-391",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "太興村8鄰溪頭19號之2",
      "addressLocality": "梅山鄉",
      "addressRegion": "嘉義縣",
      "postalCode": "603",
      "addressCountry": "TW",
    },
    "description": "嘉義阿里山梅山，一家三口40年堅持，自產自銷台灣高山烏龍茶、金萱茶、紅茶、四季春。",
    "priceRange": "$$",
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 23.5537537,
      "longitude": 120.6324229,
    },
    "hasMap": "https://maps.google.com/?cid=8366059333847730032",
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "08:00",
        "closes": "18:00",
      },
    ],
    "sameAs": [
      "https://www.instagram.com/mist.decider.tea/",
      "https://www.facebook.com/choose.mist.tea",
      "https://line.me/R/ti/p/@976jhznk",
    ],
  };

  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "霧抉茶",
    "alternateName": "Wu Jue Tea",
    "url": baseUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(webSiteJsonLd) }}
      />
      <div>
      {/* Hero */}
      {/* 100svh 不是 100vh：手機瀏覽器的 100vh 不扣工具列，實測 375×812 時
          主 CTA 底邊在 y=689，而 iOS Safari 的實際可視高約 650px——CTA 會被切掉。
          svh 用的是「工具列展開時」的高度，桌機與 vh 等值 */}
      <section className="relative min-h-[100svh] flex items-center overflow-hidden">
        <Image
          src="/images/gallery/picking2.jpg"
          alt="阿里山梅山採茶實景"
          fill
          priority
          className="object-cover"
        />
        {/* 方向性漸層取代全幅均勻遮罩。設計原則 1「產地即證據，介面是茶席」：
            採茶實景是這個品牌的信任資產，均勻壓 55% 會把它變成背景紋理。

            **左半維持 55%**，也就是改版前的那個程度；只有右半從 55% 漸淡到 20%，
            把照片露出來。初版把左側加深到 80%，業主看實物後覺得太重，退回原深度。

            手法是給第一個色階一個**位置**（`md:from-50%`）：漸層在第一個色階的位置
            之前會維持該色，所以 0–50% 是平的 55%、50–100% 才降到 20%。
            **不要改用 `via-*` 寫三色階**——`via` 產生的 `--tw-gradient-stops` 會被
            斷點上的 `to-*` 覆寫掉，實測 computed 只剩兩個色階、變成整條線性下降，
            文字區右緣（43%）會掉到約 40%，比改版前還淡。

            **手機刻意不做漸層**：`from`／`to` 同為 55% 且沒有位置，等同原本的均勻遮罩。
            手機文字區幾乎滿版，拉開左右落差會讓文字右緣壓在亮處；
            落差只在 md 以上才有意義，因為那裡文字只佔 max-w-2xl。 */}
        <div className="absolute inset-0 bg-gradient-to-r from-tea-text/55 to-tea-text/55 md:from-50% md:to-tea-text/20" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-section md:py-section-lg relative z-10 w-full">
          <div className="max-w-2xl">
            <p className="text-tea-green-pale font-medium tracking-[0.3em] text-xs mb-6 uppercase">
              {t("hero.subtitle")}
            </p>
            <h1 className="font-serif text-5xl sm:text-7xl md:text-9xl font-bold text-tea-cream-light mb-6 leading-none">
              {t("hero.title")}
            </h1>
            <div className="w-16 h-0.5 bg-tea-green-pale mb-7" />
            <p className="text-tea-cream font-serif text-xl md:text-3xl mb-3">
              {t("hero.tagline")}
            </p>
            <p className="text-tea-cream text-body md:text-body-lg mb-10 max-w-lg">
              {t("hero.description")}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href={lp("/products")}
                className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3.5 rounded-pill font-medium transition-colors duration-base ease-standard shadow-resting"
              >
                {t("hero.exploreBtn")}
              </Link>
              <Link
                href={lp("/about")}
                className="border-2 border-tea-cream/70 text-tea-cream hover:bg-tea-cream hover:text-tea-text px-8 py-3.5 rounded-pill font-medium transition-colors"
              >
                {t("hero.storyBtn")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 品茶哲學 */}
      {/* 慢段：品茶哲學是敘事不是商品，留白讓它慢下來。
          **只在桌機加大**（手機 64px、桌機 128px）。第九波原本手機也給 96px，
          但業主實測手機時指出滑不完一張卡——節奏感在大螢幕才看得出來，
          小螢幕一屏只裝得下一張卡，多 32px 就是「還要再滑一次」。
          快慢交替見 globals.css --space-section-xl 的註解 */}
      {/* 底色是 cream -> cream-light -> white 漸進的第一階，見 docs/design-system.md 2.1.1 */}
      <section className="py-section md:py-section-xl bg-tea-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="flex flex-col justify-center">
              <p className="text-tea-green font-medium tracking-[0.3em] text-xs uppercase mb-4">
                {t("philosophy.sectionLabel")}
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-3">
                {t("philosophy.title")}
              </h2>
              <p className="text-tea-text-light text-body-lg mb-10 max-w-md">
                {t("philosophy.tagline")}
              </p>

              <div className="divide-y divide-tea-green-pale">
                {[
                  { number: "01", Icon: Mountain, key: "mountain" },
                  { number: "02", Icon: Flame,    key: "handcraft" },
                  { number: "03", Icon: Sprout,   key: "direct" },
                ].map(({ number, Icon, key }) => (
                  <div key={number} className="flex items-start gap-6 py-8 group">
                    <div className="flex-shrink-0 flex flex-col items-center gap-2 w-8">
                      <span className="text-xs font-medium text-tea-green tracking-widest">{number}</span>
                      <Icon className="w-4 h-4 text-tea-green-light" />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-bold text-tea-text mb-2 group-hover:text-tea-green transition-colors">
                        {t(`philosophy.items.${key}.title`)}
                      </h3>
                      <p className="text-tea-text-light text-body">
                        {t(`philosophy.items.${key}.desc`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="relative h-64 sm:h-80 md:h-[420px] lg:h-full lg:min-h-[480px] rounded-card overflow-hidden">
                <Image
                  src="/images/gallery/flipped.jpg"
                  alt="做茶實景"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {/* 快段：商業區塊要效率，維持原節奏 */}
      {/* 漸進第二階。商品卡是 bg-white，壓在 cream-light 上只差 2%——
          但那是刻意的，三段累積起來才是漸層，見 docs/design-system.md 2.1.1 */}
      <section className="py-section md:py-section-lg bg-tea-cream-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-2">
                {t("featured.title")}
              </h2>
              <p className="text-tea-text-light text-body-lg">{t("featured.tagline")}</p>
            </div>
            <Link
              href={lp("/products")}
              className="text-tea-green hover:text-tea-green-dark font-medium text-sm flex items-center gap-1 py-2 transition-colors"
            >
              {tc("buttons.viewAll")}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <FeaturedSection products={featuredProducts} />
          {/* 情緒段（品牌故事）之後沒有接證據，客人讀完「一家三口 40 年」
              也不知道運費多少、能不能退。信任列收在商品區內部，見 TrustRow 的註解 */}
          <TrustRow locale={locale} />
        </div>
      </section>

      {/* 茶山體驗 */}
      {/* 漸進第三階：最亮，接著才落到品牌故事的深色 */}
      {experiences.length > 0 && (
        <section className="py-section md:py-section-lg bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="text-tea-green text-xs tracking-[0.3em] uppercase mb-3">{t("experiences.sectionLabel")}</p>
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-2">{t("experiences.title")}</h2>
                <p className="text-tea-text-light text-body-lg">{t("experiences.tagline")}</p>
              </div>
              <Link
                href={lp("/experiences")}
                className="text-tea-green hover:text-tea-green-dark font-medium text-sm flex items-center gap-1 py-2 transition-colors"
              >
                {tc("buttons.viewAll")}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {experiences.slice(0, 3).map((exp) => {
                const content = contentMap[exp.slug];
                if (!content) return null;
                const imgSrc = content.coverImage ?? "/images/gallery/tea-cup.jpg";
                return (
                  <Link
                    key={exp.id}
                    href={lp(`/experiences/${exp.slug}`)}
                    className="group bg-white rounded-card overflow-hidden shadow-resting hover:shadow-raised transition-shadow duration-base ease-standard border border-tea-green-pale/50"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={imgSrc}
                        alt={isEn ? exp.nameEn : exp.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {exp.requiresAdult && (
                        <span className="absolute top-3 right-3 bg-tea-text text-tea-cream text-xs px-3 py-1 rounded-pill">
                          {tc("adultOnly")}
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-serif text-xl font-bold text-tea-text mb-1.5 group-hover:text-tea-green transition-colors">
                        {isEn ? (exp.nameEn || exp.name) : exp.name}
                      </h3>
                      {/* 與商品卡同理：14px + 3 行才讀得完，見 ProductCard 的註解 */}
                      <p className="text-tea-text-light text-label mb-4 line-clamp-3">
                        {isEn ? (content.taglineEn || content.tagline) : content.tagline}
                      </p>
                      <div className="flex items-center justify-between text-sm text-tea-text-light">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-tea-green" />
                            {exp.durationHours}h
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-tea-green" />
                            {exp.minParticipants}–{exp.maxParticipants}{isEn ? "" : "人"}
                          </span>
                        </div>
                        <span className="font-semibold text-tea-text">NT$ {exp.price.toLocaleString()}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {experiences.length > 3 && (
              <div className="text-center mt-8">
                <Link
                  href={lp("/experiences")}
                  className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3 rounded-pill font-medium transition-colors inline-block"
                >
                  {t("experiences.viewAllCount", { count: experiences.length })}
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Brand Story */}
      {/* 慢段：品牌故事是情緒高點，也是唯一的深色錨點 */}
      <section className="py-section md:py-section-xl bg-tea-text">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <p className="text-tea-green text-xs tracking-[0.3em] uppercase mb-5">
              {t("brandStory.sectionLabel")}
            </p>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-tea-cream-light mb-7 leading-snug whitespace-pre-line">
              {t("brandStory.title")}
            </h2>
            {/* 品牌故事是整站最重要的一段敘事——四十年、一家三口。
                原本用 text-sm(14px) 講，語氣與內容不相稱，升到 body-lg(18px/1.85) */}
            <p className="text-tea-green-pale text-body-lg mb-4">
              {t("brandStory.p1")}
            </p>
            <p className="text-tea-green-pale text-body-lg mb-10">
              {t("brandStory.p2")}
            </p>
            <Link
              href={lp("/about")}
              className="border border-tea-green-light text-tea-green-light hover:bg-tea-green-light hover:text-tea-text px-8 py-3.5 rounded-pill font-medium transition-colors inline-block"
            >
              {tc("buttons.learnMore")}
            </Link>
          </div>

          <BrandStats />
        </div>
      </section>

      {/* Process Teaser */}
      <section className="py-section md:py-section-lg bg-tea-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-3">
            {t("process.title")}
          </h2>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-5" />
          <p className="text-tea-text-light text-body-lg mb-14 max-w-lg mx-auto">
            {t("process.tagline")}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10 md:mb-14">
            {(["pick", "wither", "roll", "roast"] as const).map((key, i) => (
              <div
                key={key}
                className="bg-white rounded-card p-5 md:p-7 text-center shadow-resting hover:shadow-raised transition-shadow duration-base ease-standard"
              >
                <div className="text-xs text-tea-green font-medium tracking-widest mb-3">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="font-serif text-xl font-bold text-tea-text mb-2">
                  {t(`process.steps.${key}.name`)}
                </div>
                <div className="text-label text-tea-text-light">{t(`process.steps.${key}.desc`)}</div>
              </div>
            ))}
          </div>
          <Link
            href={lp("/process")}
            className="bg-tea-green hover:bg-tea-green-dark text-white px-9 py-3.5 rounded-pill font-medium transition-colors duration-base ease-standard shadow-resting"
          >
            {t("process.exploreBtn")}
          </Link>
        </div>
      </section>
    </div>
    </>
  );
}
