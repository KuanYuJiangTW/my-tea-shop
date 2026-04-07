import type { Metadata } from "next";
import Link from "next/link";
import { sanityFetch } from "@/sanity/client";
import { ALL_FAQS_QUERY } from "@/sanity/queries";
import FaqClient from "./FaqClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "常見問題 | 霧抉茶",
  description: "霧抉茶體驗預約常見問題解答，包含預約流程、退款政策、體驗內容與交通資訊。",
  alternates: { canonical: "/faq" },
};

interface Faq {
  _id:      string;
  question: string;
  answer:   unknown[];
  category: string;
  order:    number;
}

export default async function FaqPage() {
  const faqs = await sanityFetch<Faq[]>(ALL_FAQS_QUERY).catch(() => [] as Faq[]);

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
        {faqs.length === 0 ? (
          <p className="text-center text-tea-text-light py-16">內容準備中…</p>
        ) : (
          <FaqClient faqs={faqs} />
        )}

        {/* 聯絡我們 */}
        <div className="mt-12 bg-tea-cream rounded-2xl p-8 text-center border border-tea-green-pale">
          <p className="font-serif text-xl font-bold text-tea-text mb-2">還有其他問題？</p>
          <p className="text-tea-text-light text-sm mb-5">歡迎直接與我們聯繫，我們很樂意為您解答</p>
          <Link
            href="/contact"
            className="bg-tea-green hover:bg-tea-green-dark text-white px-7 py-2.5 rounded-full text-sm font-medium transition-colors inline-block"
          >
            聯絡我們
          </Link>
        </div>
      </div>
    </div>
  );
}
