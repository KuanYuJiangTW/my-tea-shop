import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ContactClient from "./ContactClient";
import { langAlternates, openGraphFor } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contactPage.meta");
  const alternates = await langAlternates("/contact");
  return {
    title: t("title"),
    description: t("description"),
    keywords: t.raw("keywords") as string[],
    alternates,
    openGraph: await openGraphFor("/contact", {
      title: t("ogTitle"),
      description: t("ogDescription"),
    }),
  };
}

export default async function ContactPage() {
  const t = await getTranslations("contactPage");
  return (
    <div className="bg-tea-cream-light min-h-screen">
      {/* Page Header */}
      <section className="bg-tea-green-mist border-b border-tea-green-pale/50 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-tea-green-ink text-xs tracking-[0.3em] uppercase font-medium mb-3">
            {t("hero.sectionLabel")}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-normal text-tea-text mb-3 tracking-display">
            {t("hero.sectionLabel")}
          </h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-4" />
          <p className="text-tea-text-muted max-w-md mx-auto text-sm">
            {t("hero.tagline")}
          </p>
        </div>
      </section>

      <ContactClient />
    </div>
  );
}
