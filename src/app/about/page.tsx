import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PhotoGallery from "./PhotoGallery";
import { getLocale, getTranslations } from "next-intl/server";
import { langAlternates, openGraphFor } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about.meta");
  const alternates = await langAlternates("/about");
  return {
    title: t("title"),
    description: t("description"),
    keywords: t.raw("keywords") as string[],
    alternates,
    openGraph: await openGraphFor("/about", {
      title: t("ogTitle"),
      description: t("ogDescription"),
    }),
  };
}

const valueKeys = ["selfGrown", "heritage", "region", "delivery"] as const;
const teaKeys   = ["oolong", "jinxuan", "black", "redOolong", "sijichun"] as const;
const teaColors = [
  "from-green-100 to-emerald-200",
  "from-yellow-100 to-amber-200",
  "from-amber-200 to-orange-300",
  "from-red-100 to-rose-200",
  "from-lime-100 to-green-200",
] as const;

export default async function AboutPage() {
  const locale = await getLocale();
  const t = await getTranslations("about");
  const lp = (path: string) => locale === "en" ? `/en${path}` : path;
  return (
    <div>
      {/* Hero */}
      <section className="bg-tea-text py-16 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-tea-green/10 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-tea-green/8 rounded-full" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <p className="text-tea-green-pale text-xs tracking-[0.3em] uppercase mb-5">
            {t("hero.sectionLabel")}
          </p>
          <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-bold text-tea-cream-light mb-6">
            {t("hero.title")}
          </h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-6" />
        </div>
      </section>

      {/* Brand Story */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Decorative visual */}
            <div className="relative">
              <div className="bg-tea-green-mist rounded-3xl aspect-square flex items-center justify-center">
                <svg width="260" height="260" viewBox="0 0 300 300" fill="none">
                  {/* Stylized mountain + tea */}
                  <circle cx="150" cy="150" r="120" fill="white" opacity="0.5" />
                  <path d="M60 220L150 80L240 220Z" fill="#C8DDD0" />
                  <path d="M90 220L150 120L210 220Z" fill="#A3BFA8" />
                  <path d="M110 220L150 150L190 220Z" fill="#7D9B84" />
                  {/* Tea cup */}
                  <rect x="120" y="230" width="60" height="35" rx="5" fill="#EDE8DC" />
                  <path d="M115 230Q150 215 185 230" stroke="#7D9B84" strokeWidth="2" fill="none" />
                  <line x1="180" y1="240" x2="195" y2="248" stroke="#A3BFA8" strokeWidth="8" strokeLinecap="round" />
                  {/* Steam */}
                  <path d="M135 225Q130 215 135 205" stroke="#C8DDD0" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M150 222Q145 212 150 202" stroke="#C8DDD0" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M165 225Q160 215 165 205" stroke="#C8DDD0" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-tea-green-dark text-white px-6 py-4 rounded-2xl shadow-lg">
                <div className="font-serif text-3xl font-bold">40+</div>
                <div className="text-white text-xs mt-1">{t("story.yearsLabel")}</div>
              </div>
            </div>

            {/* Text */}
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-6">
                {t("story.title")}
              </h2>
              <div className="w-10 h-0.5 bg-tea-green mb-7" />
              <p className="text-tea-text-muted leading-relaxed mb-5">
                {t("story.p1")}
              </p>
              <p className="text-tea-text-muted leading-relaxed mb-5">
                {t("story.p2")}
              </p>
              <p className="text-tea-text-muted leading-relaxed mb-8">
                {t("story.p3")}
              </p>
              <Link
                href={lp("/products")}
                className="bg-tea-green-dark hover:bg-tea-green-ink text-white px-8 py-3.5 rounded-full font-medium transition-colors"
              >
                {t("story.shopCta")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Photo Gallery */}
      <section className="py-16 md:py-24 bg-tea-cream-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-tea-green-ink text-xs tracking-[0.3em] uppercase font-medium mb-3">
              {t("gallery.sectionLabel")}
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-3">
              {t("gallery.sectionLabel")}
            </h2>
            <div className="w-10 h-0.5 bg-tea-green mx-auto mb-4" />
            <p className="text-tea-text-muted max-w-md mx-auto text-sm">
              {t("gallery.tagline")}
            </p>
          </div>

          <PhotoGallery />
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold text-tea-text mb-3">
              {t("values.sectionLabel")}
            </h2>
            <div className="w-10 h-0.5 bg-tea-green mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {valueKeys.map((key, i) => (
              <div
                key={key}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-tea-green-ink font-bold text-sm tracking-widest mb-3">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="font-serif text-2xl font-bold text-tea-text mb-4">
                  {t(`values.${key}.title`)}
                </h3>
                <p className="text-tea-text-muted leading-relaxed">
                  {t(`values.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tea Varieties */}
      <section className="py-16 md:py-24 bg-tea-cream-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold text-tea-text mb-3">
              {t("teas.title")}
            </h2>
            <div className="w-10 h-0.5 bg-tea-green mx-auto mb-5" />
            <p className="text-tea-text-muted max-w-md mx-auto">
              {t("teas.tagline")}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
            {teaKeys.map((key, i) => (
              <div
                key={key}
                className={`bg-gradient-to-br ${teaColors[i]} rounded-2xl p-6 text-center`}
              >
                <span className="text-xs text-tea-green-ink bg-white/70 px-3 py-1 rounded-full font-medium">
                  {t(`teas.${key}.flavor`)}
                </span>
                <h3 className="font-serif text-lg font-bold text-tea-text mt-4 mb-3">
                  {t(`teas.${key}.name`)}
                </h3>
                <p className="text-tea-text-muted text-xs leading-relaxed">
                  {t(`teas.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 md:py-24 bg-tea-text">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-4xl font-bold text-tea-cream-light mb-6">
            {t("contact.sectionLabel")}
          </h2>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-10" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-10">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
              <h3 className="font-serif text-lg font-bold text-tea-cream-light mb-5">{t("contact.contactInfo")}</h3>
              <div className="space-y-4 text-tea-green-pale text-sm">
                <p>
                  <span className="text-tea-green-pale font-medium block mb-1">{t("contact.address.label")}</span>
                  {t("contact.address.value")}
                </p>
                <p>
                  <span className="text-tea-green-pale font-medium block mb-1">{t("contact.phone.label")}</span>
                  {t("contact.phone.value")}
                </p>
                <p>
                  <span className="text-tea-green-pale font-medium block mb-1">{t("contact.delivery.label")}</span>
                  {t("contact.delivery.value")}
                </p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
              <h3 className="font-serif text-lg font-bold text-tea-cream-light mb-5">{t("contact.social.label")}</h3>
              <div className="space-y-4 text-tea-green-pale text-sm">
                <p>
                  <span className="text-tea-green-pale font-medium block mb-1">{t("contact.social.searchLabel")}</span>
                  {t("contact.social.socialHandle")}
                </p>
                <p>{t("contact.social.socialPlatforms")}</p>
                <p className="pt-2 text-tea-green-pale/80 italic">
                  {t("contact.social.socialCta")}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href={lp("/products")}
              className="bg-tea-green-dark hover:bg-tea-green-ink text-white px-8 py-3.5 rounded-full font-medium transition-colors"
            >
              {t("cta.shopBtn")}
            </Link>
            <Link
              href={lp("/process")}
              className="border border-tea-green-light text-tea-green-light hover:bg-tea-green-light hover:text-tea-text px-8 py-3.5 rounded-full font-medium transition-colors"
            >
              {t("cta.processBtn")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
