import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Clock, Users, CheckCircle, AlertCircle } from "lucide-react";
import { getExperienceBySlug, getExperienceTypes, getExperienceContent } from "@/lib/experiences";
import ExperienceCalendar from "./ExperienceCalendar";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const types = await getExperienceTypes();
  return types.map(t => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug }   = await params;
  const content    = await getExperienceContent(slug);
  if (!content) return {};
  return {
    title:       `${content.name} | 霧抉茶體驗`,
    description: content.seoDescription ?? content.tagline,
    alternates:  { canonical: `/experiences/${slug}` },
  };
}

export default async function ExperienceDetailPage({ params }: Props) {
  const { slug }   = await params;
  const [experience, content] = await Promise.all([
    getExperienceBySlug(slug),
    getExperienceContent(slug),
  ]);

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
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-white">{experience.name}</h1>
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
                  <span className="text-xs text-tea-text-light">每人費用</span>
                  <div className="text-3xl font-bold text-tea-text">NT$ {experience.price.toLocaleString()}</div>
                </div>
                {experience.requiresAdult && (
                  <span className="bg-tea-text text-tea-cream text-xs px-3 py-1 rounded-full">18 歲以上</span>
                )}
              </div>
              <div className="border-t border-tea-green-pale pt-4 space-y-2.5 text-sm text-tea-text-light">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-tea-green shrink-0" />
                  體驗時長：{experience.durationHours} 小時
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-tea-green shrink-0" />
                  每場人數：{experience.minParticipants}–{experience.maxParticipants} 人
                </div>
              </div>
            </div>

            {/* 簡介 */}
            {content.tagline && (
              <p className="text-tea-text-light leading-relaxed">{content.tagline}</p>
            )}

            {/* 包含項目 */}
            {content.includes?.length > 0 && (
              <div>
                <h2 className="font-serif text-xl font-bold text-tea-text mb-4">體驗包含</h2>
                <ul className="space-y-2.5">
                  {content.includes.map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-tea-text-light">
                      <CheckCircle className="w-4 h-4 text-tea-green mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 注意事項 */}
            {content.notes?.length > 0 && (
              <div>
                <h2 className="font-serif text-xl font-bold text-tea-text mb-4">注意事項</h2>
                <ul className="space-y-2.5">
                  {content.notes.map(note => (
                    <li key={note} className="flex items-start gap-2.5 text-sm text-tea-text-light">
                      <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 退款政策 */}
            <div className="bg-tea-cream rounded-2xl p-5 border border-tea-green-pale text-sm">
              <h3 className="font-medium text-tea-text mb-3">取消退款政策</h3>
              <ul className="space-y-1.5 text-tea-text-light">
                <li className="flex justify-between"><span>活動前 7 天以上</span><span className="text-tea-green font-medium">全額退款</span></li>
                <li className="flex justify-between"><span>活動前 3–6 天</span><span className="text-amber-600 font-medium">退款 50%</span></li>
                <li className="flex justify-between"><span>活動前 1–2 天</span><span className="text-amber-600 font-medium">退款 20%</span></li>
                <li className="flex justify-between"><span>活動前 24 小時內</span><span className="text-red-500 font-medium">不退款</span></li>
              </ul>
              <p className="mt-3 text-xs text-tea-text-light/70">可於活動前 3 天以上申請改期（每筆限 1 次）</p>
            </div>
          </div>

          {/* 右側：日曆 */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl p-6 border border-tea-green-pale/50 shadow-sm">
              <h2 className="font-serif text-xl font-bold text-tea-text mb-6">選擇場次</h2>
              <ExperienceCalendar experience={experience} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
