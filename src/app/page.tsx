import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Mountain, Flame, Sprout, Clock, Users } from "lucide-react";
import HeroBackground from "./HeroBackground";
import FeaturedSection from "./FeaturedSection";
import BrandStats from "./BrandStats";
import TrustRow from "@/components/TrustRow";
import { getFeaturedProducts } from "@/lib/products";
import { getExperienceTypes, getExperienceContents } from "@/lib/experiences";
import { getArticlesForExperience } from "@/lib/articles";
import { currentWindow, taipeiToday } from "@/lib/experience-ordering";
import SeasonBadge from "@/components/SeasonBadge";
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

  // ── 季節限定條帶 ─────────────────────────────────────────────────────
  // 首頁是全站權重最高的一頁，而季節限定體驗每年只有幾十天可賣——把它擺在
  // 首屏下方，同時解決兩件事：從「阿里山高山茶」搜進來的人不知道現在有鳥可看，
  // 以及攻略文除了體驗頁之外沒有任何站內連結指向它。
  //
  // 只在**正在季節中**時顯示：`upcoming`（還沒開始）放首頁會變成一則常設廣告，
  // 而條帶的說服力全部來自「現在就在發生」。季節一過自動消失，不必記得撤掉。
  const seasonalExp = experiences.find(e => currentWindow(e.windows, taipeiToday()) !== null);
  // 攻略文從關聯查，不寫死 slug——換一款季節體驗時這一段不用改
  const seasonalGuide = seasonalExp
    ? (await getArticlesForExperience(seasonalExp.slug))[0] ?? null
    : null;
  const seasonalContent = seasonalExp ? contentMap[seasonalExp.slug] : undefined;

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
        {/* 背景不是輪播，是**交叉淡入**：文案與 CTA 完全不動，只換底圖。
            傳統 hero carousel 每張帶各自的標題與 CTA，訊息互相稀釋才傷轉換；
            這裡照片不承載訊息（訊息在 h1 與 CTA），所以那組問題不成立。
            節奏、延後載入與 prefers-reduced-motion 的取捨見 HeroBackground.tsx。

            設計原則 1「產地即證據，介面是茶席」：實景是這個品牌的信任資產，
            均勻壓深會把它變成背景紋理，所以只有左半壓住、右半漸淡到 20% 露出照片。

            **每張配自己的遮罩，不共用**。實測（1440×900 裁切下，文字區對
            tea-cream-light 的對比，取最亮 5% 區域——文字最可能糊掉的地方）：
              picking2 @55% → avg 6.43 / 最差 3.87   ← 維持不動
              wilting4 @55% → avg 5.23 / 最差 3.16   ← 比現況差一截
              wilting4 @65% → avg 5.90 / 最差 3.88   ← 與 picking2 現況等值
            共用一組 alpha 會讓文字在輪替時忽清忽糊，比穩定的偏暗更難受。

            2026-08-26 第二張的取景繞了一圈，最後**維持這一版 2560x1732**。
            試過的兩個方向都由業主看實機後否決：
              未裁切原檔 `20260427_103350`（4:3）→ 頂部那條深色遮陽網會跟公告條、
                sticky header 疊成三層壓在頂端，白色轎車又正好落在遮罩最淡的右側
              重裁 `left0 top1000 3200x2000`（16:10）→ 上述兩者都切掉了，但業主
                比較過實機畫面後仍選這一版
            結論寫在這裡是為了**擋住下一次「換完整檔案比較好」的直覺**：滿版 hero
            由 object-cover 決定可視範圍，4:3 原檔在 1440×900 反而多切垂直方向
            （16.7% vs 本版 8.3%）。要真的少裁切得改版面，不是換檔案。

            **遮罩不能拿掉**（2026-08-26 實測，量測框與上表不同，只能組內比）：
              @0%  最差5% 1.17 / 單點 1.00　← 文字直接消失
              @40% 最差5% 2.26
              @65% 最差5% 3.75　← 採用
              手機（均勻遮罩）@0% 最差5% 1.17、@65% 3.76
            原因是這張的文字區**同時**有米白帆布與深色茶菁：改用深字
            （tea-text）在無遮罩下量到 1.08，一樣不合格。沒有任何單一文字色
            能同時活過這兩種底，遮罩在這裡是必要條件，不是裝飾。

            2026-08-26 加入第三張 `tea-ceremony`（業主自辦活動的宣傳照）。
            輪播因此成為一條敘事線：採茶（產地）→ 曬青（製程）→ 茶席（品飲），
            第三張同時是茶藝體驗預約的入口視覺。三件事值得記住：
              **已水平鏡像**（`sharp().flop()`）。原圖的手與壺在左半，正好被
                遮罩壓住，而遮罩最淡的右側只剩白瓷杯——精華被壓掉、露出配角。
                鏡像後主體落在右側亮區，暖光才活得下來。改動這張前先想清楚
                「主體在哪一半」，那是它能不能用的關鍵，不是構圖偏好。
              **遮罩取 60% 不是 65%**：@60% 最差5% 3.55，正好等於 picking2
                現況的 3.55；@65% 是 3.93。這張的價值在暖光，而遮罩是冷灰綠，
                壓越重越濁——在「與其他兩張同一可讀性水準」的前提下取最淡的一檔。
              **只有 2000x1332**（業主無原檔）。Next 不會放大，桌機 1440 CSS px
                在 DPR 2 下拿不到 2880，焦平面會略軟。三張裡唯一撐不住 retina
                的一張，日後拿得到原檔應該換掉。
            另記：picking2 @65% 量到 4.58，會跨過正文 AA 4.5——但加深左側是
            2026-08-13 業主看實物後否決過的方向（commit 2eb3abf），未經他再
            確認不要動。

            漸層寫法：給第一個色階一個**位置**（`md:from-50%`），漸層在該位置
            之前維持該色，所以 0–50% 是平的、50–100% 才降到 20%。
            **不要改用 `via-*` 寫三色階**——`via` 產生的 `--tw-gradient-stops`
            會被斷點上的 `to-*` 覆寫掉，實測 computed 只剩兩個色階、變成整條
            線性下降，文字區右緣（43%）會掉到約 40%，比改版前還淡。

            **手機刻意不做漸層**：`from`／`to` 同值且沒有位置，等同均勻遮罩。
            手機文字區幾乎滿版，拉開左右落差會讓文字右緣壓在亮處；
            落差只在 md 以上才有意義，因為那裡文字只佔 max-w-2xl。 */}
        <HeroBackground
          labels={{ prev: tc("a11y.prevPhoto"), next: tc("a11y.nextPhoto") }}
          slides={[
            {
              src: "/images/gallery/picking2.jpg",
              alt: t("heroImageAlt"),
              mask: "bg-gradient-to-r from-tea-text/55 to-tea-text/55 md:from-50% md:to-tea-text/20",
            },
            {
              src: "/images/gallery/wilting4.jpg",
              alt: t("heroImageAlt2"),
              mask: "bg-gradient-to-r from-tea-text/65 to-tea-text/65 md:from-50% md:to-tea-text/20",
            },
            {
              src: "/images/gallery/tea-ceremony.jpg",
              alt: t("heroImageAlt3"),
              mask: "bg-gradient-to-r from-tea-text/60 to-tea-text/60 md:from-50% md:to-tea-text/20",
            },
          ]}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-section md:py-section-lg relative z-10 w-full">
          {/* 手機的 `pb-12` 只為了**把文案整塊往上推**，不是要在下面放東西。
              section 是 `flex items-center`，所以加在這裡的下內距會讓內容
              往上移「一半」的量——48px 換到約 38px 的上移（實測斜率 0.75，不是直覺的 0.5——section 的 100svh 不等於 innerHeight）。
              為什麼要上移：輪播控制項錨在視窗底（見 HeroBackground 的
              --hero-chrome），375×812 實測主 CTA 底邊到控制項只有 39px，
              兩組互動元件擠在一起。加完是 77px。
              sm 以上不需要——那裡版面高、文案只佔 max-w-2xl，本來就不會撞。 */}
          <div className="max-w-2xl pb-12 sm:pb-0">
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

      {/* 季節限定條帶 —— 只在季節中出現，見上方 seasonalExp 的說明 */}
      {seasonalExp && (
        <section className="bg-tea-green-mist border-y border-tea-green-pale">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
              <div className="flex-1 min-w-0">
                <p className="text-tea-green-ink text-xs tracking-[0.25em] uppercase mb-3 font-medium">
                  {t("seasonal.label")}
                </p>
                {/* 名稱與倒數徽章並排：稀缺性要跟商品名一起被讀到才有作用 */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
                  <h2 className="font-serif text-2xl md:text-3xl font-bold text-tea-text">
                    {isEn ? seasonalExp.nameEn : seasonalExp.name}
                  </h2>
                  <SeasonBadge
                    windows={seasonalExp.windows}
                    name={isEn ? seasonalExp.nameEn : seasonalExp.name}
                  />
                </div>
                {seasonalContent && (
                  <p className="text-body text-tea-text-muted max-w-2xl">
                    {isEn ? (seasonalContent.taglineEn || seasonalContent.tagline) : seasonalContent.tagline}
                  </p>
                )}
              </div>

              {/* 攻略在前、預約在後：從搜尋進來的人多數還在「今天值不值得上山」
                  的階段，先給答案再給價目，順序反過來會把人推走 */}
              <div className="flex flex-wrap gap-3 shrink-0">
                {seasonalGuide && (
                  <Link
                    href={lp(`/tea-guide/${seasonalGuide.slug}`)}
                    className="border-2 border-tea-green-ink text-tea-green-ink hover:bg-tea-green-ink hover:text-white px-6 py-3 rounded-pill font-medium transition-colors duration-base ease-standard"
                  >
                    {t("seasonal.guideBtn")}
                  </Link>
                )}
                <Link
                  href={lp(`/experiences/${seasonalExp.slug}`)}
                  className="bg-tea-green-ink hover:bg-tea-green-dark text-white px-6 py-3 rounded-pill font-medium transition-colors duration-base ease-standard shadow-resting"
                >
                  {t("seasonal.bookBtn")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

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
                  alt={t("craftImageAlt")}
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
                      {/* 首頁只顯示前 3 張，而季節中的體驗會被排到最前——
                          也就是說季節一開始，它自己就會出現在首頁 */}
                      <SeasonBadge
                        windows={exp.windows}
                        name={isEn ? exp.nameEn : exp.name}
                        className="absolute top-3 left-3 shadow-sm"
                      />
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
