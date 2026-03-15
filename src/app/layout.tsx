import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://my-tea-shop.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "霧抉茶 | 台灣嘉義梅山高山茶",
    template: "%s | 霧抉茶",
  },
  description: "嘉義梅山一家三口40年堅持，自產自銷台灣高山烏龍茶、金萱茶、紅茶、四季春。從茶園到您手上，每一泡都由我們親手把關。",
  keywords: ["霧抉茶", "台灣高山茶", "嘉義梅山", "阿里山茶", "烏龍茶", "金萱茶", "四季春", "高山茶葉", "自產自銷", "台灣好茶"],
  authors: [{ name: "霧抉茶" }],
  creator: "霧抉茶",
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: baseUrl,
    siteName: "霧抉茶",
    title: "霧抉茶 | 台灣嘉義梅山高山茶",
    description: "嘉義梅山一家三口40年堅持，自產自銷台灣高山茶。從茶園到您手上，每一泡都由我們親手把關。",
  },
  twitter: {
    card: "summary_large_image",
    title: "霧抉茶 | 台灣嘉義梅山高山茶",
    description: "嘉義梅山一家三口40年堅持，自產自銷台灣高山茶。從茶園到您手上，每一泡都由我們親手把關。",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>
        <CartProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
