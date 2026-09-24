"use client";

import { useState } from "react";
import { PortableText } from "@portabletext/react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

interface Faq {
  _id:         string;
  question:    string;
  question_en: string | null;
  answer:      unknown[];
  answer_en:   unknown[] | null;
  category:    string;
  order:       number;
}

const CATEGORY_ORDER = ["booking", "payment", "experience", "logistics", "other"];

export default function FaqClient({ faqs, locale }: { faqs: Faq[]; locale: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const t = useTranslations("faqCategories");

  const isEn = locale === "en";

  const categories = ["all", ...CATEGORY_ORDER.filter(c =>
    faqs.some(f => f.category === c)
  )];

  const filtered = activeCategory === "all"
    ? faqs
    : faqs.filter(f => f.category === activeCategory);

  return (
    <>
      {/* 分類篩選 */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === c
                  ? "bg-tea-green-dark text-white"
                  : "bg-tea-green-mist text-tea-text-muted hover:text-tea-text"
              }`}
            >
              {t(c)}
            </button>
          ))}
        </div>
      )}

      {/* FAQ 列表 */}
      <div className="divide-y divide-tea-green-pale border border-tea-green-pale rounded-2xl overflow-hidden">
        {filtered.map(faq => {
          const question = (isEn && faq.question_en) ? faq.question_en : faq.question;
          const answer   = (isEn && faq.answer_en)   ? faq.answer_en   : faq.answer;

          return (
            <div key={faq._id}>
              <button
                onClick={() => setOpenId(openId === faq._id ? null : faq._id)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-tea-green-mist/50 transition-colors"
              >
                <span className="font-medium text-tea-text">{question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-tea-green-ink shrink-0 transition-transform ${
                    openId === faq._id ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openId === faq._id && (
                <div className="px-6 pb-5 text-tea-text-muted text-sm leading-relaxed prose prose-sm max-w-none">
                  <PortableText value={answer as Parameters<typeof PortableText>[0]["value"]} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
