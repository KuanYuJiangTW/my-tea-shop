import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ContactClient from "./ContactClient";
import { langAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "聯絡我們",
  description: "歡迎聯絡霧抉茶！有產品詢問、訂單問題或批量採購需求，請填寫表單或致電 0972-619-391，我們將盡快回覆。",
  keywords: ["霧抉茶聯絡", "台灣茶葉批發", "嘉義茶葉採購", "霧抉茶電話"],
  alternates: langAlternates("/contact"),
  openGraph: {
    title: "聯絡我們 | 霧抉茶",
    description: "有任何問題或批量採購需求，歡迎聯絡霧抉茶。",
    url: "/contact",
  },
};

export default async function ContactPage() {
  const t = await getTranslations("contactPage");
  return (
    <div className="bg-tea-cream-light min-h-screen">
      {/* Page Header */}
      <section className="bg-tea-green-mist border-b border-tea-green-pale/50 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-tea-green text-xs tracking-[0.3em] uppercase font-medium mb-3">
            {t("hero.sectionLabel")}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-tea-text mb-3">
            {t("hero.sectionLabel")}
          </h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-4" />
          <p className="text-tea-text-light max-w-md mx-auto text-sm">
            {t("hero.tagline")}
          </p>
        </div>
      </section>

      <ContactClient />
    </div>
  );
}
