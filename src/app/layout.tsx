import type { Metadata, Viewport } from "next";
import "./globals.css";
import { headers } from "next/headers";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import SiteChrome from "@/components/SiteChrome";
import ChatWidget from "@/components/ChatWidget";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const viewport: Viewport = {
  viewportFit: "cover",
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://my-tea-shop.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "霧抉茶 | 台灣嘉義阿里山梅山高山茶",
    template: "%s | 霧抉茶",
  },
  description: "嘉義阿里山梅山，一家三口40年堅持，自產自銷台灣高山烏龍茶、金萱茶、紅茶、四季春。從茶園到您手上，每一泡都由我們親手把關。",
  keywords: ["霧抉茶", "台灣茶", "台灣高山茶", "Taiwanese tea", "Taiwan tea", "阿里山高山茶", "嘉義阿里山", "梅山茶", "阿里山茶", "烏龍茶", "金萱茶", "四季春", "高山茶葉", "自產自銷", "嘉義茶葉"],
  authors: [{ name: "霧抉茶" }],
  creator: "霧抉茶",
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: baseUrl,
    siteName: "霧抉茶",
    title: "霧抉茶 | 台灣嘉義阿里山梅山高山茶",
    description: "嘉義阿里山梅山，一家三口40年堅持，自產自銷台灣高山茶。從茶園到您手上，每一泡都由我們親手把關。",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "霧抉茶 | 台灣嘉義阿里山梅山高山茶",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "霧抉茶 | 台灣嘉義阿里山梅山高山茶",
    description: "嘉義阿里山梅山，一家三口40年堅持，自產自銷台灣高山茶。從茶園到您手上，每一泡都由我們親手把關。",
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
  alternates: {
    canonical: baseUrl,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale === "en" ? "en" : "zh-TW"} className={cn("font-sans", geist.variable)}>
      <body>
        <GoogleAnalytics nonce={nonce} />
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
