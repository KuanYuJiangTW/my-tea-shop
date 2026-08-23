import type { Metadata, Viewport } from "next";
import "./globals.css";
import { headers } from "next/headers";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import LineTag from "@/components/LineTag";
import SiteChrome from "@/components/SiteChrome";
import ChatWidget from "@/components/ChatWidget";
import { Geist, Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";
import { cn } from "@/lib/utils";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { openGraphFor } from "@/lib/seo";

// 字體單一來源：三支都走 next/font（自架 + 自動 preload），globals.css 不再定義字體變數。
// 拉丁字排在 font-sans 最前面走 Geist，中文由 Noto Sans TC 接手——這是既有的視覺結果，
// 過去靠 tailwind fallback 鏈碰巧成立，現在改為明確宣告。
const geist = Geist({ subsets: ["latin"], variable: "--font-latin", display: "swap" });
// 字重依實際用量而定（`grep font-medium` 等統計）：
//   300 全站 0 處 → 拿掉（舊 @import 白載）
//   600 全站 81 處，但舊 @import 沒載 → 補上，中文 semibold 先前是瀏覽器假造的
const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const notoSerifTC = Noto_Serif_TC({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const viewport: Viewport = {
  viewportFit: "cover",
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";

// 全站 metadata 的預設值。**必須是 generateMetadata 而非靜態物件**：
// title.template、og:locale、og:site_name 等都要跟著語言換，而 locale 只有在
// request 期間才拿得到（/en 是 proxy 內部 rewrite，沒有 [locale] 路由段）。
// 這裡的 openGraph／twitter 會被「沒有自己宣告 og」的頁面繼承，所以不雙語化
// 的話，那些英文頁分享出去仍是中文卡片。
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("siteMeta");
  const brand = t("brand");
  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: t("defaultTitle"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    keywords: t.raw("keywords") as string[],
    authors: [{ name: brand }],
    creator: brand,
    // 全站預設值。各頁一律用同一個 openGraphFor() 覆寫（見 src/lib/seo.ts 的說明）。
    openGraph: await openGraphFor("/", {
      title: t("ogTitle"),
      description: t("ogDescription"),
    }),
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
      images: ["/opengraph-image"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    verification: {
      google: "KeiUxoKScCoDWTyzLMF-tXp_qLuIfFsKxX0L-977Mik",
    },
    // 注意：canonical 由各頁自行宣告（src/lib/seo.ts 的 langAlternates），
    // 不在 root layout 設全站 canonical，避免未宣告的頁面被誤標為首頁的重複內容。
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale === "en" ? "en" : "zh-TW"}
      className={cn("font-sans", geist.variable, notoSansTC.variable, notoSerifTC.variable)}
    >
      <body>
        <GoogleAnalytics nonce={nonce} />
        <LineTag nonce={nonce} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <CartProvider>
              <SiteChrome>{children}</SiteChrome>
              <ChatWidget />
            </CartProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
