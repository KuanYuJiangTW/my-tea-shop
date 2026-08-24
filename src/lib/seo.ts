import { getLocale, getTranslations } from "next-intl/server";

const EN_PREFIX = "/en";

// 把「不含語言前綴的路徑」轉成指定語言的實際路徑。
// zh-TW 是預設語言、無前綴；en 走 /en 前綴（首頁是 /en 而非 /en/）。
export function pathForLocale(path: string, locale: string): string {
  if (locale !== "en") return path;
  return path === "/" ? EN_PREFIX : `${EN_PREFIX}${path}`;
}

// 供各頁 metadata 產生 canonical + hreflang alternates。
//
// **canonical 必須跟著當前語言走**（2026-08-17 修）：`/en/*` 是由 src/proxy.ts
// 內部 rewrite 到無前綴路徑的，兩個語言共用同一份 metadata。原本寫死
// `canonical: path` 等於讓每個英文頁宣告「我的正式版本是中文頁」，
// 而 sitemap 又同時要求收錄那 16 個 /en 網址——訊號互相打架，Google Search
// Console 把英文頁全歸到「替代頁面（有適當的標準標記）」而排除在索引外。
// hreflang 叢集的正確做法是每個語言版本各自 self-canonical。
//
// x-default 指向 zh-TW：語言未命中時的 fallback 版本。
export async function langAlternates(path: string) {
  const locale = await getLocale();
  const zhPath = path;
  const enPath = pathForLocale(path, "en");

  return {
    canonical: pathForLocale(path, locale),
    languages: {
      "zh-TW": zhPath,
      "en": enPath,
      "x-default": zhPath,
    },
  };
}

interface OgImage {
  url:    string;
  width:  number;
  height: number;
  alt:    string;
}

// **每個要宣告 openGraph 的頁面都必須用這個組**，不要自己寫 openGraph 物件。
//
// Next 的 metadata 是**淺層合併**：子頁一旦宣告 `openGraph`，root layout 那一整個
// openGraph 物件就被取代，`type`／`locale`／`site_name` 會一起消失。
// 2026-08-17 實測 production build，全站 `og:locale` 與 `og:site_name` 都不存在——
// 有設 og 的 9 個頁面早就掉了，沒設的（首頁、FAQ）才靠繼承留著。
//
// 預設圖是品牌 OG 圖（app/opengraph-image.tsx）。**這裡一定要明確帶 images**：
// 否則會退回 file convention，而那支檔案的 `export const alt` 是模組層常數、
// 寫死中文，英文頁的 og:image:alt 就會是中文。
// `title` 原樣使用；`titleWithBrand` 會接上當前語言的品牌名。
// og:title 不吃 root layout 的 title.template，所以短標題（「FAQ」、「Privacy Policy」）
// 直接當 og:title 會讓分享卡片看不出是誰的網站——這種頁面用 titleWithBrand。
export async function openGraphFor(
  path: string,
  extra?: { title?: string; titleWithBrand?: string; description?: string; images?: OgImage[] },
) {
  const t = await getTranslations("siteMeta");
  const locale = await getLocale();
  const { titleWithBrand, ...rest } = extra ?? {};

  const title = rest.title ?? (titleWithBrand ? `${titleWithBrand} | ${t("brand")}` : undefined);

  return {
    type: "website" as const,
    locale: t("ogLocale"),
    siteName: t("ogSiteName"),
    // 與 canonical 同一個推導方式，兩者不會分岔
    url: pathForLocale(path, locale),
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: t("ogImageAlt") }],
    ...rest,
    ...(title ? { title } : {}),
  };
}

// JSON-LD 安全序列化：轉義 < 避免 </script> 突破標籤（見 docs/security-assessment-2026-07.md）
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

// ── FAQPage：把攻略文裡的問答小標升級成結構化資料 ─────────────────────────

export interface QaSection {
  heading:    string;
  paragraphs: string[];
}

/** 小標是不是一個問句。全形「？」與半形「?」都算，允許結尾有空白 */
function isQuestionHeading(heading: string): boolean {
  return /[？?]\s*$/.test(heading.trim());
}

/**
 * 從文章小標產生 FAQPage 結構化資料。
 *
 * **判斷規則只有一條：小標以問號結尾。** 不看關鍵字、不猜語意——
 * 規則要能被寫文章的人預測，否則「為什麼這段沒進 FAQ」會變成每次都要來翻程式碼。
 * 反過來也成立：想把某一段排除在 FAQ 之外，把小標的問號拿掉就好，
 * 不必改程式（`萬鷺朝鳳完整攻略` 的「想親眼看看？」就是這種——它是行動呼籲，
 * 不是問答，Google 的 FAQPage 政策要的是真的在回答問題）。
 *
 * 段落全空的小標會被跳過：宣告一個沒有答案的 Question 會被判定為無效標記，
 * 連帶讓整組 FAQPage 失效，比不宣告更糟。
 *
 * 呼叫端負責先挑好語言（`pick`／`pickList`），這裡不碰 i18n——
 * 中英兩頁各自輸出自己語言的 FAQPage，混語言會讓 Google 兩邊都不採用。
 */
export function faqPageJsonLd(sections: QaSection[], pageUrl: string) {
  const questions = sections
    .filter(s => isQuestionHeading(s.heading))
    .map(s => ({ heading: s.heading.trim(), text: s.paragraphs.join("\n").trim() }))
    .filter(q => q.text.length > 0);

  if (questions.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    "mainEntity": questions.map(q => ({
      "@type": "Question",
      "name": q.heading,
      "acceptedAnswer": { "@type": "Answer", "text": q.text },
    })),
  };
}

// ── Event：季節限定體驗才有的「這件事什麼時候發生」 ──────────────────────

interface SeasonalEventInput {
  name:        string;
  description: string;
  image:       string;
  url:         string;
  /** YYYY-MM-DD，含當天 */
  startDate:   string;
  endDate:     string;
  /** HH:MM，每天的出發時間。空陣列代表沒有固定時段，就不輸出 eventSchedule */
  startTimes:  string[];
  price:       number;
  baseUrl:     string;
}

/**
 * 季節限定體驗的 Event 結構化資料。
 *
 * **只有設了季節區間的體驗才該有這個。** 全年供應的茶藝體驗不是 Event，
 * 是 Product——把不會結束的東西宣告成 Event，Google 會拿不到「何時發生」
 * 這個 Event 存在的唯一理由。呼叫端用 `hasSeason()` 判斷，不要在這裡猜。
 *
 * 與同一頁的 Product 節點並存是有意的：對想買的人它是商品（價格、評價），
 * 對想安排行程的人它是活動（日期、地點）。兩種搜尋意圖各有各的富摘要，
 * 而 `offers` 兩邊給同一個價格與網址，不會出現互相矛盾的說法。
 *
 * 時間一律標 +08:00：伺服器可能在任何時區，用不帶時區的字串等於讓 Google
 * 自己猜，而猜錯的後果是活動時間整個位移。
 */
export function seasonalEventJsonLd(input: SeasonalEventInput) {
  const { name, description, image, url, startDate, endDate, startTimes, price, baseUrl } = input;
  const firstTime = startTimes[0];

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": name,
    "description": description,
    "image": image,
    "url": url,
    // 帶時段的話連時間一起給，Google 才排得出「下午 2 點」這種資訊
    "startDate": firstTime ? `${startDate}T${firstTime}:00+08:00` : startDate,
    "endDate":   firstTime ? `${endDate}T${firstTime}:00+08:00`   : endDate,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    // 季節限定體驗是「期間內每天重複」，不是一次性活動。Schedule 是 schema.org
    // 表達重複活動的正解，startDate/endDate 則留給不支援 Schedule 的消費端當退路
    ...(firstTime ? {
      "eventSchedule": {
        "@type": "Schedule",
        "startDate": startDate,
        "endDate": endDate,
        "startTime": firstTime,
        "repeatFrequency": "P1D",
        "scheduleTimezone": "Asia/Taipei",
      },
    } : {}),
    "location": {
      "@type": "Place",
      "name": "信淳茶居",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "太興村8鄰溪頭19號之2",
        "addressLocality": "梅山鄉",
        "addressRegion": "嘉義縣",
        "postalCode": "603",
        "addressCountry": "TW",
      },
      "geo": { "@type": "GeoCoordinates", "latitude": 23.5537537, "longitude": 120.6324229 },
    },
    "organizer": { "@type": "Organization", "@id": `${baseUrl}/#business`, "name": "霧抉茶 Wu Jue Tea", "url": baseUrl },
    "offers": {
      "@type": "Offer",
      "price": price,
      "priceCurrency": "TWD",
      "url": url,
      "availability": "https://schema.org/InStock",
      "validFrom": startDate,
    },
  };
}
