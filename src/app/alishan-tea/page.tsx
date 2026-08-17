import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { langAlternates, jsonLdString } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const alternates = await langAlternates("/alishan-tea");
  return {
    title: "阿里山高山茶指南｜梅山太興茶區",
    description:
      "阿里山茶區在哪裡？梅山茶跟阿里山茶有什麼不同？大阿里山茶區涵蓋梅山、竹崎、番路、阿里山鄉，其中梅山鄉種植面積最大。霧抉茶位於梅山太興，40年自產自銷阿里山高山烏龍、金萱與蜜香紅茶，並提供茶園體驗預約。",
    keywords: [
      "嘉義阿里山", "阿里山高山茶", "阿里山茶區", "阿里山茶推薦", "阿里山茶園體驗",
      "梅山茶", "梅山鄉茶區", "太興村", "阿里山烏龍茶", "阿里山金萱",
    ],
    alternates,
    openGraph: {
      title: "阿里山高山茶指南｜梅山太興茶區 | 霧抉茶",
      description: "認識大阿里山茶區與梅山鄉——阿里山高山茶種植面積最大的產地。霧抉茶 40 年自產自銷，茶園體驗線上預約。",
      url: alternates.canonical,
      images: [{ url: "/images/gallery/picking2.jpg", width: 1200, height: 630, alt: "阿里山茶區梅山太興採茶實景" }],
    },
  };
}

// 雙語內容（比照 experiences 的 zh/en 欄位模式，長文不進 messages/）
const CONTENT = {
  zh: {
    label: "ALISHAN TEA GUIDE",
    title: "阿里山高山茶指南",
    tagline: "從產區地圖認識阿里山茶，以及梅山太興——我們的茶園所在",
    sections: [
      {
        heading: "阿里山茶區在哪裡？",
        paragraphs: [
          "「阿里山高山茶」不是單指阿里山森林遊樂區，而是嘉義縣大阿里山茶區的統稱——涵蓋梅山鄉、竹崎鄉、番路鄉、阿里山鄉等地的高海拔茶園，海拔大約在 800 到 1,600 公尺之間。這片山區終年雲霧繚繞、日夜溫差大，是台灣最具代表性的高山茶產地之一。",
        ],
      },
      {
        heading: "梅山鄉：阿里山茶區種植面積最大的產地",
        paragraphs: [
          "許多人不知道：在整個大阿里山茶區中，梅山鄉的茶園面積約 1,090 公頃，是所有鄉鎮中最大的。瑞里、碧湖、樟樹湖、太和、太興等知名茶區都在梅山。換句話說，喝到的阿里山高山茶，有相當高的機率就來自梅山的山頭。",
          "霧抉茶的茶園位於梅山鄉太興村，阿里山山脈北段。一家三口在這裡耕耘超過 40 年，從種植、採摘、製茶到銷售全程自己來——這就是我們敢說「每一泡都親手把關」的原因。",
        ],
      },
      {
        heading: "阿里山高山茶為什麼好喝？",
        paragraphs: [
          "高海拔的低溫與雲霧讓茶樹生長緩慢，葉片累積更多果膠質與茶胺酸，茶湯因此甘甜滑順、苦澀感低。霧抉茶的阿里山高山烏龍帶蘭花清香、金萱有自然奶香、蜜香紅茶則因小綠葉蟬著涎而有獨特蜜韻——三種風味，都是這片山林的味道。",
        ],
      },
      {
        heading: "在阿里山茶區可以體驗什麼？",
        paragraphs: [
          "我們把茶農的日常變成可以預約的體驗：跟著茶師品茶的茶席體驗、親手焙茶的古早工藝、走進茶園採茶菁、花三小時做一批自己的紅茶、調一瓶淺漬茶果酒，還有季節限定的黃頭鷺生態導覽。所有體驗都在太興村的茶園現場進行，線上即可預約。",
        ],
      },
    ],
    ctaProducts: "選購阿里山高山茶",
    ctaExperiences: "預約茶山體驗",
    breadcrumbHome: "首頁",
  },
  en: {
    label: "ALISHAN TEA GUIDE",
    title: "Alishan High Mountain Tea Guide",
    tagline: "Understand the Alishan tea region — and Taixing, Meishan, where our farm is",
    sections: [
      {
        heading: "Where is the Alishan tea region?",
        paragraphs: [
          "\"Alishan high mountain tea\" doesn't refer only to the Alishan Forest Recreation Area. It is the collective name for the Greater Alishan tea region in Chiayi County — high-elevation tea gardens across Meishan, Zhuqi, Fanlu and Alishan townships, roughly 800 to 1,600 meters above sea level. Year-round fog and large day-night temperature swings make this one of Taiwan's most celebrated high mountain tea origins.",
        ],
      },
      {
        heading: "Meishan: the largest tea-growing township in the Alishan region",
        paragraphs: [
          "A little-known fact: within the Greater Alishan tea region, Meishan Township has the largest tea acreage — about 1,090 hectares — more than any other township. Famous sub-regions like Ruili, Bihu, Zhangshuhu, Taihe and Taixing all sit in Meishan. In other words, much of the Alishan tea people drink actually comes from Meishan's slopes.",
          "Wu Jue Tea's gardens are in Taixing Village, Meishan, on the northern reaches of the Alishan range. Our family of three has farmed here for over 40 years, handling everything from growing and picking to crafting and selling — which is why we can say every cup is made by our own hands.",
        ],
      },
      {
        heading: "Why does Alishan high mountain tea taste so good?",
        paragraphs: [
          "Cool temperatures and persistent fog slow the tea trees' growth, letting leaves accumulate more pectin and theanine. The result is a smooth, naturally sweet liquor with little bitterness. Our Alishan High Mountain Oolong carries an orchid-like fragrance, Jin Xuan offers a natural milky note, and our Honey Black Tea gains its signature honey aroma from leafhopper-bitten leaves — three flavors, all from this mountain.",
        ],
      },
      {
        heading: "What can you experience in the Alishan tea region?",
        paragraphs: [
          "We turned a tea farmer's daily life into bookable experiences: a guided tea ceremony, traditional charcoal tea roasting, tea picking in the garden, a three-hour black tea making workshop, tea-infused fruit wine blending, and a seasonal cattle egret eco-tour. Everything happens on our farm in Taixing Village and can be booked online.",
        ],
      },
    ],
    ctaProducts: "Shop Alishan Tea",
    ctaExperiences: "Book a Tea Experience",
    breadcrumbHome: "Home",
  },
} as const;

export default async function AlishanTeaPage() {
  const locale = await getLocale();
  const isEn = locale === "en";
  const c = isEn ? CONTENT.en : CONTENT.zh;
  const lp = (path: string) => isEn ? `/en${path}` : path;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";
  const pagePath = `${isEn ? "/en" : ""}/alishan-tea`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": c.title,
    "description": isEn
      ? "Where the Alishan tea region is, why Meishan Township is its largest growing area, and how Wu Jue Tea farms in Taixing, Meishan."
      : "阿里山茶區範圍、梅山鄉為何是最大產地，以及霧抉茶在梅山太興的茶園故事。",
    "inLanguage": isEn ? "en" : "zh-TW",
    "image": `${baseUrl}/images/gallery/picking2.jpg`,
    "mainEntityOfPage": `${baseUrl}${pagePath}`,
    "author": { "@id": `${baseUrl}/#business` },
    "publisher": { "@id": `${baseUrl}/#business` },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": c.breadcrumbHome, "item": isEn ? `${baseUrl}/en` : baseUrl },
      { "@type": "ListItem", "position": 2, "name": c.title, "item": `${baseUrl}${pagePath}` },
    ],
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd) }}
      />

      {/* Hero */}
      <div className="bg-tea-green-mist py-12 md:py-20 border-b border-tea-green-pale">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-tea-green text-xs tracking-[0.3em] uppercase mb-4">{c.label}</p>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-tea-text mb-4">{c.title}</h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-5" />
          <p className="text-tea-text-light">{c.tagline}</p>
        </div>
      </div>

      {/* 內文 */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="space-y-12">
          {c.sections.map(section => (
            <section key={section.heading}>
              <h2 className="font-serif text-2xl font-bold text-tea-text mb-4">{section.heading}</h2>
              <div className="space-y-4">
                {section.paragraphs.map(p => (
                  <p key={p.slice(0, 20)} className="text-tea-text-light leading-relaxed">{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-4 justify-center mt-14">
          <Link
            href={lp("/products")}
            className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3.5 rounded-full font-medium transition-colors shadow-sm"
          >
            {c.ctaProducts}
          </Link>
          <Link
            href={lp("/experiences")}
            className="border-2 border-tea-green text-tea-green hover:bg-tea-green hover:text-white px-8 py-3.5 rounded-full font-medium transition-colors"
          >
            {c.ctaExperiences}
          </Link>
        </div>
      </div>
    </div>
  );
}
