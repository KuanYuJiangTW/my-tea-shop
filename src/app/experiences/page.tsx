import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { getExperienceTypes, getExperienceContents } from "@/lib/experiences";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "茶山體驗 | 霧抉茶",
  description: "親身走入嘉義梅山茶園，體驗茶藝、烤茶、採茶、紅茶製作與淺漬茶果酒，感受從茶葉到生活的每一個細節。",
  alternates: { canonical: "/experiences" },
};

export default async function ExperiencesPage() {
  const [experiences, contents] = await Promise.all([
    getExperienceTypes(),
    getExperienceContents(),
  ]);

  const contentMap = Object.fromEntries(contents.map(c => [c.slug, c]));

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-tea-green-mist py-12 md:py-20 border-b border-tea-green-pale">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-tea-green text-xs tracking-[0.3em] uppercase mb-4">Experience</p>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-tea-text mb-4">茶山體驗</h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-5" />
          <p className="text-tea-text-light max-w-lg mx-auto">走入嘉義梅山茶園，用雙手感受一片葉子的故事</p>
        </div>
      </div>

      {/* 體驗卡片列表 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {experiences.map((exp) => {
            const content = contentMap[exp.slug];
            if (!content) return null;
            const imgSrc = content.coverImage ?? "/images/gallery/tea-cup.jpg";
            const isExternal = imgSrc.startsWith("https://");

            return (
              <Link
                key={exp.id}
                href={`/experiences/${exp.slug}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-tea-green-pale/50"
              >
                <div className="relative h-56 md:h-64 overflow-hidden">
                  <Image
                    src={imgSrc}
                    alt={exp.name}
                    fill
                    {...(isExternal ? {} : {})}
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {exp.requiresAdult && (
                    <span className="absolute top-3 right-3 bg-tea-text text-tea-cream text-xs px-3 py-1 rounded-full">
                      18 歲以上
                    </span>
                  )}
                </div>

                <div className="p-6">
                  <p className="text-tea-green text-xs tracking-widest uppercase mb-2">{exp.nameEn}</p>
                  <h2 className="font-serif text-2xl font-bold text-tea-text mb-3 group-hover:text-tea-green transition-colors">
                    {exp.name}
                  </h2>
                  <p className="text-tea-text-light text-sm leading-relaxed mb-5">
                    {content.tagline}
                  </p>
                  <div className="flex items-center gap-5 text-sm text-tea-text-light mb-5">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-tea-green" />
                      {exp.durationHours} 小時
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-tea-green" />
                      {exp.minParticipants}–{exp.maxParticipants} 人
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-tea-text-light">每人</span>
                      <span className="text-2xl font-bold text-tea-text ml-1">
                        NT$ {exp.price.toLocaleString()}
                      </span>
                    </div>
                    <span className="bg-tea-green text-white text-sm px-5 py-2 rounded-full group-hover:bg-tea-green-dark transition-colors">
                      查看場次
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 注意事項 */}
        <div className="mt-16 bg-tea-cream rounded-2xl p-8 border border-tea-green-pale">
          <h3 className="font-serif text-xl font-bold text-tea-text mb-4">預約須知</h3>
          <ul className="space-y-2 text-sm text-tea-text-light">
            <li>• 每場最低 <strong className="text-tea-text">4 人</strong> 開課，未達人數將於活動前 3 天通知取消並全額退款</li>
            <li>• 付款完成後可在活動前 <strong className="text-tea-text">5 天內</strong> 補填其他參加者資料</li>
            <li>• 活動前 7 天取消可全額退款，詳細退款政策請見各體驗頁面</li>
            <li>• 如有特殊需求（素食、過敏等），請於預約時填寫備註</li>
          </ul>
          <div className="mt-5 pt-5 border-t border-tea-green-pale flex items-center justify-between">
            <p className="text-sm text-tea-text-light">還有其他疑問？</p>
            <Link
              href="/faq"
              className="text-tea-green hover:text-tea-green-dark text-sm font-medium flex items-center gap-1 transition-colors"
            >
              查看常見問題
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
