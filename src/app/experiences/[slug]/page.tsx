import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Clock, Users, CheckCircle, AlertCircle } from "lucide-react";
import { getExperienceBySlug, getExperienceTypes, getExperienceContent } from "@/lib/experiences";
import ExperienceCalendar from "./ExperienceCalendar";
import ExperienceReviews from "./ExperienceReviews";
import ExperienceGallery from "./ExperienceGallery";
import { getTranslations, getLocale } from "next-intl/server";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const types = await getExperienceTypes();
  return types.map(t => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug }    = await params;
  const content     = await getExperienceContent(slug);
  if (!content) return {};
  const description = content.seoDescription ?? content.tagline;
  const ogImage     = content.coverImage ?? "/images/gallery/tea-cup.jpg";
  return {
    title:       `${content.name} | 霧抉茶體驗`,
    description,
    alternates:  { canonical: `/experiences/${slug}` },
    openGraph: {
      title:       `${content.name} | 霧抉茶體驗`,
      description,
      url:         `/experiences/${slug}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: content.name }],
    },
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

  return (
    <div className="min-h-screen bg-tea-cream-light">
      {/* Hero */}
      <div className="relative h-64 md:h-96 overflow-hidden">
        <Image src={imgSrc} alt={experience.name} fill priority className="object-cover" />
        <div className="absolute inset-0 bg-tea-text/45" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full">
            <p className="text-tea-green-pale text-xs tracking-[0.3em] uppercase mb-2">{experience.nameEn}</p>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-white">{isEn ? experience.nameEn : experience.name}</h1>
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
                  <span className="text-xs text-tea-text-light">{t("perCostLabel")}</span>
                  <div className="text-3xl font-bold text-tea-text">NT$ {experience.price.toLocaleString()}</div>
                </div>
                {experience.requiresAdult && (
                  <span className="bg-tea-text text-tea-cream text-xs px-3 py-1 rounded-full">{t("adultOnly")}</span>
                )}
              </div>
              <div className="border-t border-tea-green-pale pt-4 space-y-2.5 text-sm text-tea-text-light">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-tea-green shrink-0" />
                  {t("durationLabel", { hours: experience.durationHours })}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-tea-green shrink-0" />
                  {t("participantsLabel", { min: experience.minParticipants, max: experience.maxParticipants })}
                </div>
              </div>
            </div>

            {/* 簡介 */}
            {content.tagline && (
              <p className="text-tea-text-light leading-relaxed">{(isEn && content.taglineEn) ? content.taglineEn : content.tagline}</p>
            )}

            {/* 包含項目 */}
            {content.includes?.length > 0 && (() => {
              const items = (isEn && content.includesEn?.length) ? content.includesEn : content.includes;
              return (
                <div>
                  <h2 className="font-serif text-xl font-bold text-tea-text mb-4">{t("includes")}</h2>
                  <ul className="space-y-2.5">
                    {items.map(item => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-tea-text-light">
                        <CheckCircle className="w-4 h-4 text-tea-green mt-0.5 shrink-0" />
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
                  <h2 className="font-serif text-xl font-bold text-tea-text mb-4">{t("notes")}</h2>
                  <ul className="space-y-2.5">
                    {items.map(note => (
                      <li key={note} className="flex items-start gap-2.5 text-sm text-tea-text-light">
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
              <ul className="space-y-1.5 text-tea-text-light">
                <li className="flex justify-between"><span>{tb("refundPolicy.items.7days.label")}</span><span className="text-tea-green font-medium">{tb("refundPolicy.items.7days.value")}</span></li>
                <li className="flex justify-between"><span>{tb("refundPolicy.items.3to6days.label")}</span><span className="text-amber-600 font-medium">{tb("refundPolicy.items.3to6days.value")}</span></li>
                <li className="flex justify-between"><span>{tb("refundPolicy.items.1to2days.label")}</span><span className="text-amber-600 font-medium">{tb("refundPolicy.items.1to2days.value")}</span></li>
                <li className="flex justify-between"><span>{tb("refundPolicy.items.under24h.label")}</span><span className="text-red-500 font-medium">{tb("refundPolicy.items.under24h.value")}</span></li>
              </ul>
              <p className="mt-3 text-xs text-tea-text-light/70">{tb("refundPolicy.changeNote")}</p>
            </div>
          </div>

          {/* 右側：日曆（手機版優先顯示） */}
          <div className="lg:col-span-3 order-first lg:order-last">
            <div className="bg-white rounded-2xl p-6 border border-tea-green-pale/50 shadow-sm">
              <h2 className="font-serif text-xl font-bold text-tea-text mb-6">{t("selectSession")}</h2>
              <ExperienceCalendar experience={experience} />
            </div>
          </div>

        </div>

        {/* 評價區塊 */}
        <ExperienceReviews experienceTypeId={experience.id} />
      </div>
    </div>
  );
}
