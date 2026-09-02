import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Clock, Users, CheckCircle, AlertCircle } from "lucide-react";
import { getExperienceBySlug, getExperienceTypes, getExperienceContent } from "@/lib/experiences";
import { supabase } from "@/lib/supabase";
import ExperienceCalendar from "./ExperienceCalendar";
import ExperienceReviews from "./ExperienceReviews";
import ExperienceGallery from "./ExperienceGallery";
import SeasonBadge from "@/components/SeasonBadge";
import { currentWindow, daysBetween, nextWindow, taipeiToday } from "@/lib/experience-ordering";
import {
  MAX_LEAD_DAYS,
  allowedStartTimes,
  calcRequestSlots,
  calcRequestTotal,
  nextAvailableWindow,
} from "@/lib/experience-requests";
import RelatedExperiences from "./RelatedExperiences";
import BirdReport from "@/components/BirdReport";
import VisitDirections from "@/components/VisitDirections";
import StickyBookingBar from "@/components/StickyBookingBar";
import AdmissionTiers from "./AdmissionTiers";
import GuideLink from "./GuideLink";
import InterestForm from "./InterestForm";
import OpenClassRequest from "./OpenClassRequest";
import { getTranslations, getLocale } from "next-intl/server";
import { langAlternates, openGraphFor, jsonLdString, seasonalEventJsonLd } from "@/lib/seo";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

// 體驗頁的描述文字，metadata 與 JSON-LD 共用同一份（兩邊不一致會讓爬蟲看到兩種說法）。
//
// **英文版必須優先讀英文欄位**：`seoDescription` 只有中文版，`seoDescriptionEn` 是
// 2026-08-17 才加進 Sanity schema 的，舊資料多半留空。原本的寫法是
// `content.seoDescription ?? (...)`，於是只要中文 SEO 欄位有填，英文頁的
// description 就是中文——用 `||` 而非 `??` 是為了讓 Sanity 的空字串也往下退。
function localizedDescription(
  content: { seoDescription?: string; seoDescriptionEn?: string; tagline: string; taglineEn?: string },
  isEn: boolean,
): string {
  return isEn
    ? (content.seoDescriptionEn || content.taglineEn || content.tagline)
    : (content.seoDescription || content.tagline);
}

export async function generateStaticParams() {
  const types = await getExperienceTypes();
  return types.map(t => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug }    = await params;
  const content     = await getExperienceContent(slug);
  if (!content) return {};
  const locale      = await getLocale();
  const isEn        = locale === "en";
  // root layout 的 title.template 已經會接上「| 霧抉茶」，這裡再寫一次
  // 會變成「茶藝體驗 | 霧抉茶體驗 | 霧抉茶」，品牌名重複佔掉標題長度。
  // 體驗名稱本身已含「體驗」二字，交給 template 收尾即可。
  const name        = (isEn && content.nameEn) ? content.nameEn : content.name;
  const description = localizedDescription(content, isEn);
  const ogImage     = content.coverImage ?? "/images/gallery/tea-cup.jpg";
  const alternates  = await langAlternates(`/experiences/${slug}`);
  return {
    title:       name,
    description,
    alternates,
    openGraph: await openGraphFor(`/experiences/${slug}`, {
      // og:title 不吃 title.template，品牌名由 openGraphFor 依語言接上
      titleWithBrand: name,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: name }],
    }),
  };
}

export default async function ExperienceDetailPage({ params }: Props) {
  const { slug }   = await params;
  const [experience, content, t, tb, locale] = await Promise.all([
    getExperienceBySlug(slug),
    getExperienceContent(slug),
    getTranslations("experiences"),
    getTranslations("experienceBooking"),
    getLocale(),
  ]);
  const isEn = locale === "en";

  if (!experience || !content) notFound();

  const imgSrc = content.coverImage ?? "/images/gallery/tea-cup.jpg";

  // ── JSON-LD 結構化資料（AI 搜尋 / Google 富摘要）───────────────────────────
  // 評價數 ≥ 3 才輸出 aggregateRating，樣本太少反而減分
  const { data: ratingRows } = await supabase
    .from("experience_reviews")
    .select("rating")
    .eq("experience_type_id", experience.id)
    .eq("is_visible", true);
  const ratings = (ratingRows ?? []).map(r => r.rating as number);
  const aggregateRating = ratings.length >= 3
    ? {
        "@type": "AggregateRating",
        "ratingValue": Number((ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1)),
        "reviewCount": ratings.length,
        "bestRating": 5,
        "worstRating": 1,
      }
    : undefined;

  const baseUrl     = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";
  const pagePath    = `${isEn ? "/en" : ""}/experiences/${slug}`;
  const ldName      = isEn ? experience.nameEn : experience.name;
  const ldDesc      = localizedDescription(content, isEn);
  const ldImage     = imgSrc.startsWith("http") ? imgSrc : `${baseUrl}${imgSrc}`;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": ldName,
    "alternateName": isEn ? experience.name : experience.nameEn,
    "description": ldDesc,
    "image": ldImage,
    "url": `${baseUrl}${pagePath}`,
    "brand": { "@type": "Brand", "name": "霧抉茶 Wu Jue Tea" },
    "aggregateRating": aggregateRating,
    "offers": {
      "@type": "Offer",
      "price": experience.price,
      "priceCurrency": "TWD",
      "availability": "https://schema.org/InStock",
      "url": `${baseUrl}${pagePath}`,
      // 光給 @id 是懸空參照（LocalBusiness 節點定義在首頁），補上 @type 與 name
      "seller": { "@type": "Organization", "@id": `${baseUrl}/#business`, "name": "霧抉茶 Wu Jue Tea" },
    },
  };

  // 開課請求入口要顯示的成交條件。與後端驗證共用同一份計算，
  // 免得「頁面說 3,200、結帳收 3,800」
  const requestShape = {
    price:             experience.price,
    maxParticipants:   experience.maxParticipants,
    requestMinSlots:   experience.requestMinSlots,
    requestLeadDays:   experience.requestLeadDays,
    requestStartTimes: experience.requestStartTimes,
  };
  const today     = taipeiToday();
  const leadDays  = experience.requestLeadDays ?? 7;
  const minSlots  = calcRequestSlots(requestShape, 1);
  const shift     = (d: number) => {
    const [y, m, dd] = today.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, dd + d)).toISOString().slice(0, 10);
  };
  const minDate = shift(leadDays);
  const requestInfo = {
    minSlots,
    minTotal:   calcRequestTotal(requestShape, minSlots),
    // 超過最低名額之後照人頭加，所以單價與人數上限也要讓前台算得出來
    unitPrice:  requestShape.price,
    maxPeople:  requestShape.maxParticipants,
    leadDays,
    startTimes: allowedStartTimes(requestShape),
    minDate,
    maxDate:    shift(MAX_LEAD_DAYS),
    nextWindowStart:
      (experience.windows?.length ?? 0) > 0 && daysBetween(today, minDate) >= 0
        ? nextAvailableWindow(experience.windows, today)?.startDate ?? null
        : null,
  };

  // 季節限定體驗才輸出 Event。挑「正在進行的那一季」，沒有就挑「下一季」——
  // **兩者都沒有時不輸出**：季節已經結束還宣告 Event，Google 會拿它去顯示一個
  // 過期的活動，比沒有結構化資料更傷。全年供應的體驗（windows 為空）本來就
  // 不是 Event，走不到這裡
  const eventWindow = currentWindow(experience.windows, today) ?? nextWindow(experience.windows, today);
  const eventJsonLd = eventWindow
    ? seasonalEventJsonLd({
        name:        ldName,
        description: ldDesc,
        image:       ldImage,
        url:         `${baseUrl}${pagePath}`,
        startDate:   eventWindow.startDate,
        endDate:     eventWindow.endDate,
        startTimes:  requestInfo.startTimes,
        price:       experience.price,
        baseUrl,
      })
    : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": isEn ? "Home" : "首頁", "item": isEn ? `${baseUrl}/en` : baseUrl },
      { "@type": "ListItem", "position": 2, "name": isEn ? "Tea Experiences" : "茶山體驗", "item": `${baseUrl}${isEn ? "/en" : ""}/experiences` },
      { "@type": "ListItem", "position": 3, "name": ldName, "item": `${baseUrl}${pagePath}` },
    ],
  };

  return (
    <div className="min-h-screen bg-tea-cream-light" style={{ paddingBottom: "var(--floating-cta-h, 0px)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd) }}
      />
      {eventJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(eventJsonLd) }}
        />
      )}
      {/* Hero */}
      <div className="relative h-64 md:h-96 overflow-hidden">
        <Image src={imgSrc} alt={ldName} fill priority className="object-cover" />
        <div className="absolute inset-0 bg-tea-text/45" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full">
            <p className="text-tea-green-pale text-xs tracking-[0.3em] uppercase mb-2">{experience.nameEn}</p>
            <h1 className="font-serif text-4xl md:text-5xl font-normal text-white tracking-display">{isEn ? experience.nameEn : experience.name}</h1>
            <SeasonBadge windows={experience.windows} name={ldName} className="mt-3 shadow-sm" />
          </div>
        </div>
      </div>

      {/* 主內容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

          {/* 左側：體驗資訊 */}
          <div className="lg:col-span-2 space-y-8">

            {/* 快速資訊 */}
            <div className="bg-white rounded-2xl p-6 border border-tea-green-pale/50 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs text-tea-text-muted">{t("perCostLabel")}</span>
                  <div className="text-3xl font-bold text-tea-text">NT$ {experience.price.toLocaleString()}</div>
                </div>
                {experience.requiresAdult && (
                  <span className="bg-tea-text text-tea-cream text-xs px-3 py-1 rounded-full">{t("adultOnly")}</span>
                )}
              </div>
              <div className="border-t border-tea-green-pale pt-4 space-y-2.5 text-sm text-tea-text-muted">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-tea-green-ink shrink-0" />
                  {t("durationLabel", { hours: experience.durationHours })}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-tea-green-ink shrink-0" />
                  {t("participantsLabel", { min: experience.minParticipants, max: experience.maxParticipants })}
                </div>
              </div>
            </div>

            {/* 簡介 */}
            {content.tagline && (
              <p className="text-tea-text-muted leading-relaxed">{(isEn && content.taglineEn) ? content.taglineEn : content.tagline}</p>
            )}

            {/* 包含項目 */}
            {content.includes?.length > 0 && (() => {
              const items = (isEn && content.includesEn?.length) ? content.includesEn : content.includes;
              return (
                <div>
                  <h2 className="font-serif text-xl font-normal text-tea-text mb-4 tracking-display">{t("includes")}</h2>
                  <ul className="space-y-2.5">
                    {items.map(item => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-tea-text-muted">
                        <CheckCircle className="w-4 h-4 text-tea-green-ink mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {/* 注意事項 */}
            {content.notes?.length > 0 && (() => {
              const items = (isEn && content.notesEn?.length) ? content.notesEn : content.notes;
              return (
                <div>
                  <h2 className="font-serif text-xl font-normal text-tea-text mb-4 tracking-display">{t("notes")}</h2>
                  <ul className="space-y-2.5">
                    {items.map(note => (
                      <li key={note} className="flex items-start gap-2.5 text-sm text-tea-text-muted">
                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {/* 相簿 */}
            {content.gallery && content.gallery.length > 0 && (
              <ExperienceGallery
                name={experience.name}
                nameEn={experience.nameEn}
                gallery={content.gallery}
              />
            )}

            {/* 退款政策 */}
            <div className="bg-tea-cream rounded-2xl p-5 border border-tea-green-pale text-sm">
              <h3 className="font-medium text-tea-text mb-3">{tb("refundPolicy.title")}</h3>
              <ul className="space-y-1.5 text-tea-text-muted">
                <li className="flex justify-between"><span>{tb("refundPolicy.items.7days.label")}</span><span className="text-tea-green-ink font-medium">{tb("refundPolicy.items.7days.value")}</span></li>
                <li className="flex justify-between"><span>{tb("refundPolicy.items.3to6days.label")}</span><span className="text-amber-600 font-medium">{tb("refundPolicy.items.3to6days.value")}</span></li>
                <li className="flex justify-between"><span>{tb("refundPolicy.items.1to2days.label")}</span><span className="text-amber-600 font-medium">{tb("refundPolicy.items.1to2days.value")}</span></li>
                <li className="flex justify-between"><span>{tb("refundPolicy.items.under24h.label")}</span><span className="text-red-500 font-medium">{tb("refundPolicy.items.under24h.value")}</span></li>
              </ul>
              <p className="mt-3 text-xs text-tea-text-muted/70">{tb("refundPolicy.changeNote")}</p>
            </div>
          </div>

          {/* 右側：日曆（手機版優先顯示） */}
          <div className="lg:col-span-3 order-first lg:order-last space-y-6">
            {/* 價格層級放在月曆之前：看到「450 才能看鳥」就走掉的人，
                應該先知道還有免費賞鳥與看鳥茶位兩種選擇 */}
            <AdmissionTiers tiers={content.admissionTiers} bookablePrice={experience.price} />

            {/* 鳥況擺在三階方案與月曆之間：它直接影響「這幾天值不值得跑一趟」，
                是訂位前的決策資訊。沒有回報時整塊不算繪，版面不會留洞 */}
            <BirdReport />

            <div id="booking" className="scroll-mt-20 bg-white rounded-2xl p-6 border border-tea-green-pale/50 shadow-sm">
              <h2 className="font-serif text-xl font-normal text-tea-text mb-6 tracking-display">{t("selectSession")}</h2>
              <ExperienceCalendar experience={experience} />
            </div>

            {/* 找不到日期的兩個出口，緊接月曆——那正是客人發現「沒有我要的
                日期」的當下。原本這裡是死路，除了關掉分頁沒有第二個動作可做。

                開課請求（完整版）在該款體驗 accepts_requests = true 時顯示；
                關著的時候退回 Phase 0 的輕量登記，兩者不會同時出現。 */}
            {experience.acceptsRequests ? (
              <OpenClassRequest
                experienceTypeId={experience.id}
                locale={locale}
                minSlots={requestInfo.minSlots}
                minTotal={requestInfo.minTotal}
                unitPrice={requestInfo.unitPrice}
                maxParticipants={requestInfo.maxPeople}
                leadDays={requestInfo.leadDays}
                startTimes={requestInfo.startTimes}
                minDate={requestInfo.minDate}
                maxDate={requestInfo.maxDate}
                nextWindowStart={requestInfo.nextWindowStart}
                lineUrl={process.env.NEXT_PUBLIC_LINE_TEA_URL}
              />
            ) : (
              <InterestForm experienceTypeId={experience.id} locale={locale} />
            )}

            {/* 相關攻略放月曆下方：看完場次還沒按預約的人就是還在猶豫的人，
                而攻略正好回答他在猶豫的事（幾點來、會不會白跑、停哪）。
                刻意不放月曆上方——它是把人帶離本頁的連結，不該擋在預約前面。
                原本放在左欄的注意事項之後，手機要捲 2.5 個螢幕才看得到。 */}
            <GuideLink slug={slug} />

            {/* 導航放在整個預約流程之後。原本擺在月曆上方，是想著「客人剛選完
                要去哪一個地點，下一步就想知道怎麼開過去」——那個推論錯了：
                選完方案的下一步是**訂位**，不是出發。它在手機版把月曆往下推了
                586px，業主回報「要滑很久才看到選擇場次」。

                導航是出發當天才用得到的東西。放在這裡既不擋預約，又還在
                「看完場次」的視線範圍內，不必捲到左欄最底。 */}
            <VisitDirections compact />
          </div>

        </div>

        {/* 預約懸浮條。整頁 8.5 個螢幕，滑過月曆之後預約入口就消失了——
            這條讓它隨時一鍵可達，月曆本身露出時會自動收起 */}
        <StickyBookingBar price={experience.price} anchorId="booking" />

        {/* 同日加購：放在看完場次之後——這時客人已經決定要來了 */}
        <RelatedExperiences currentSlug={slug} />

        {/* 評價區塊 */}
        <ExperienceReviews experienceTypeId={experience.id} />
      </div>
    </div>
  );
}
