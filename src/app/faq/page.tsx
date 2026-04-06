"use client";

import { useState, useEffect } from "react";
import { sanityFetch } from "@/sanity/client";
import { ALL_FAQS_QUERY } from "@/sanity/queries";
import { PortableText } from "@portabletext/react";
import { ChevronDown } from "lucide-react";

interface Faq {
  _id:      string;
  question: string;
  answer:   unknown[];
  category: string;
  order:    number;
}

const CATEGORY_LABELS: Record<string, string> = {
  booking:    "預約相關",
  payment:    "付款退款",
  experience: "體驗內容",
  logistics:  "交通住宿",
  other:      "其他",
};

const CATEGORY_ORDER = ["booking", "payment", "experience", "logistics", "other"];

export default function FaqPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    sanityFetch<Faq[]>(ALL_FAQS_QUERY).then(setFaqs).catch(() => setFaqs([]));
  }, []);

  const categories = ["all", ...CATEGORY_ORDER.filter(c =>
    faqs.some(f => f.category === c)
  )];

  const filtered = activeCategory === "all"
    ? faqs
    : faqs.filter(f => f.category === activeCategory);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-tea-green-mist py-12 md:py-20 border-b border-tea-green-pale">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-tea-green text-xs tracking-[0.3em] uppercase mb-4">FAQ</p>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-tea-text mb-4">常見問題</h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-5" />
          <p className="text-tea-text-light">有任何疑問？這裡可能有你需要的答案</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* 分類篩選 */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-10">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === c
                    ? "bg-tea-green text-white"
                    : "bg-tea-green-mist text-tea-text-light hover:text-tea-text"
                }`}
              >
                {c === "all" ? "全部" : CATEGORY_LABELS[c] ?? c}
              </button>
            ))}
          </div>
        )}

        {/* FAQ 列表 */}
        {faqs.length === 0 ? (
          <p className="text-center text-tea-text-light py-16">內容準備中…</p>
        ) : (
          <div className="divide-y divide-tea-green-pale border border-tea-green-pale rounded-2xl overflow-hidden">
            {filtered.map(faq => (
              <div key={faq._id}>
                <button
                  onClick={() => setOpenId(openId === faq._id ? null : faq._id)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-tea-green-mist/50 transition-colors"
                >
                  <span className="font-medium text-tea-text">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-tea-green shrink-0 transition-transform ${
                      openId === faq._id ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openId === faq._id && (
                  <div className="px-6 pb-5 text-tea-text-light text-sm leading-relaxed prose prose-sm max-w-none">
                    <PortableText value={faq.answer as Parameters<typeof PortableText>[0]["value"]} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 聯絡我們 */}
        <div className="mt-12 bg-tea-cream rounded-2xl p-8 text-center border border-tea-green-pale">
          <p className="font-serif text-xl font-bold text-tea-text mb-2">還有其他問題？</p>
          <p className="text-tea-text-light text-sm mb-5">歡迎直接與我們聯繫，我們很樂意為您解答</p>
          <a
            href="/contact"
            className="bg-tea-green hover:bg-tea-green-dark text-white px-7 py-2.5 rounded-full text-sm font-medium transition-colors inline-block"
          >
            聯絡我們
          </a>
        </div>
      </div>
    </div>
  );
}
