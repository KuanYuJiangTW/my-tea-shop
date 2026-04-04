import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Mountain, Flame, Sprout } from "lucide-react";
import FeaturedSection from "./FeaturedSection";
import { getFeaturedProducts } from "@/lib/products";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "霧抉茶 | 台灣嘉義梅山高山茶",
  description: "嘉義梅山一家三口40年堅持，自產自銷台灣高山烏龍茶、金萱茶、紅茶、四季春。從茶園到您手上，每一泡都由我們親手把關。",
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts();
  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-screen bg-tea-green-mist flex items-center overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-tea-green-pale/40 rounded-full" />
          <div className="absolute bottom-0 -left-20 w-80 h-80 bg-tea-cream/60 rounded-full" />
          <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-tea-green/10 rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10 w-full">
          <div className="max-w-2xl">
            <p className="text-tea-green font-medium tracking-[0.3em] text-xs mb-6 uppercase">
              Taiwan Premium Tea
            </p>
            <h1 className="font-serif text-5xl sm:text-7xl md:text-9xl font-bold text-tea-text mb-6 leading-none">
              霧抉茶
            </h1>
            <div className="w-16 h-0.5 bg-tea-green mb-7" />
            <p className="text-tea-text font-serif text-xl md:text-3xl mb-3">
              源自台灣高山
            </p>
            <p className="text-tea-text-light text-sm md:text-lg leading-relaxed mb-10 max-w-lg">
              嘉義梅山山區，一家三口40年的堅持與心意。從茶園到您手上，每一泡都是我們親手把關的好茶。
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/products"
                className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3.5 rounded-full font-medium transition-colors shadow-sm"
              >
                探索茶品
              </Link>
              <Link
                href="/about"
                className="border-2 border-tea-green text-tea-green hover:bg-tea-green hover:text-white px-8 py-3.5 rounded-full font-medium transition-colors"
              >
                我們的故事
              </Link>
            </div>
          </div>
        </div>

        {/* Large decorative tea leaf */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-8 hidden lg:block select-none">
          <svg width="560" height="560" viewBox="0 0 560 560" fill="none">
            <path
              d="M280 60C280 60 120 180 120 320C120 410.5 193.5 484 284 484C374.5 484 448 410.5 448 320C448 180 280 60 280 60Z"
              fill="#3D4A42"
              opacity="0.06"
            />
            <path
              d="M280 120C280 120 200 220 200 320C200 364.18 236 400 280.18 400C324.36 400 360.36 364.18 360.36 320C360.36 220 280 120 280 120Z"
              fill="#7D9B84"
              opacity="0.09"
            />
          </svg>
        </div>
      </section>

      {/* 品茶哲學 */}
      <section className="py-16 md:py-24 bg-tea-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* 左側文字列表 */}
            <div className="flex flex-col justify-center">
              <p className="text-tea-green font-medium tracking-[0.3em] text-xs uppercase mb-4">
                Tea Philosophy
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-3">
                品茶哲學
              </h2>
              <p className="text-tea-text-light mb-10 max-w-md">
                我們相信，一杯好茶，是天、地、人三者的完美結合
              </p>

              <div className="divide-y divide-tea-green-pale">
                {[
                  {
                    number: "01",
                    Icon: Mountain,
                    title: "高山氣韻",
                    desc: "茶園坐落於嘉義阿里山梅山山區，終年雲霧繚繞，高山冷涼氣候與晝夜溫差，造就茶葉清甜甘醇的獨特風味。",
                  },
                  {
                    number: "02",
                    Icon: Flame,
                    title: "手工製作",
                    desc: "一家三口傳承超過40年的製茶經驗，焙火烘焙憑藉多年積累的手感掌控，每一批茶都是職人心血。",
                  },
                  {
                    number: "03",
                    Icon: Sprout,
                    title: "自產自銷",
                    desc: "從種植、製作、焙火、包裝到出貨，全程由我們親手把關，不假他人之手，讓每一泡茶安心送到您手上。",
                  },
                ].map(({ number, Icon, title, desc }) => (
                  <div key={number} className="flex items-start gap-6 py-8 group">
                    <div className="flex-shrink-0 flex flex-col items-center gap-2 w-8">
                      <span className="text-xs font-medium text-tea-green tracking-widest">{number}</span>
                      <Icon className="w-4 h-4 text-tea-green-light" />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-bold text-tea-text mb-2 group-hover:text-tea-green transition-colors">
                        {title}
                      </h3>
                      <p className="text-tea-text-light text-sm leading-relaxed">
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 右側照片 */}
            <div>
              <div className="relative h-64 lg:h-full lg:min-h-[480px] rounded-2xl overflow-hidden">
                <Image
                  src="/images/gallery/picking2.jpg"
                  alt="採茶實景"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 md:py-24 bg-tea-cream-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-2">
                本季精選
              </h2>
              <p className="text-tea-text-light">嚴選當季最佳的台灣高山茶</p>
            </div>
            <Link
              href="/products"
              className="text-tea-green hover:text-tea-green-dark font-medium text-sm flex items-center gap-1 transition-colors"
            >
              查看全部
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <FeaturedSection products={featuredProducts} />
        </div>
      </section>

      {/* Brand Story */}
      <section className="py-16 md:py-24 bg-tea-text">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* 故事文字 */}
          <div className="max-w-2xl mb-14">
            <p className="text-tea-green text-xs tracking-[0.3em] uppercase mb-5">
              Brand Story
            </p>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-tea-cream-light mb-7 leading-snug">
              從一片葉子<br />到一杯好茶
            </h2>
            <p className="text-tea-green-pale leading-relaxed mb-4 text-sm">
              從爸爸媽媽年輕時踏入茶產業開始，我們在嘉義梅山的山區辛勤耕耘超過40年。因為熱愛，也因為責任，霧抉茶始終堅持自產自銷。
            </p>
            <p className="text-tea-green-pale leading-relaxed mb-10 text-sm">
              從茶園種植、茶葉製作、焙火烘焙、分裝包裝到出貨，每一道工序都由我們一家三口親手把關。你手上的每一泡茶，都是我們用時間和心意累積而成的風味。
            </p>
            <Link
              href="/about"
              className="border border-tea-green-light text-tea-green-light hover:bg-tea-green-light hover:text-tea-text px-8 py-3.5 rounded-full font-medium transition-colors inline-block"
            >
              了解更多
            </Link>
          </div>

          {/* 統計數字 */}
          <div className="border-t border-white/10 pt-10">
            {/* 桌機：四欄橫排 */}
            <div className="hidden md:grid md:grid-cols-4">
              {[
                { number: "40+",  label: "年製茶經驗" },
                { number: "3",    label: "家人親手把關" },
                { number: "50+",  label: "茶款系列" },
                { number: "10K+", label: "忠實茶客" },
              ].map((stat, i) => (
                <div key={stat.label} className={`flex flex-col gap-1 ${i > 0 ? "border-l border-white/10 pl-10" : ""}`}>
                  <span className="font-serif text-5xl font-bold text-tea-green-light leading-none">
                    {stat.number}
                  </span>
                  <span className="text-tea-green-pale text-sm mt-1">{stat.label}</span>
                </div>
              ))}
            </div>
            {/* 手機：2x2 格子 + 分隔線 */}
            <div className="md:hidden grid grid-cols-2">
              {[
                { number: "40+",  label: "年製茶經驗" },
                { number: "3",    label: "家人親手把關" },
                { number: "50+",  label: "茶款系列" },
                { number: "10K+", label: "忠實茶客" },
              ].map((stat, i) => (
                <div key={stat.label} className={`flex flex-col gap-1 py-6 ${i % 2 === 1 ? "border-l border-white/10 pl-6" : "pr-6"} ${i >= 2 ? "border-t border-white/10" : ""}`}>
                  <span className="font-serif text-4xl font-bold text-tea-green-light leading-none">
                    {stat.number}
                  </span>
                  <span className="text-tea-green-pale text-sm mt-1">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Process Teaser */}
      <section className="py-16 md:py-24 bg-tea-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-3">
            製茶工藝
          </h2>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-5" />
          <p className="text-tea-text-light mb-14 max-w-lg mx-auto">
            從採摘到成茶，每一個步驟都需要職人的專注與耐心
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10 md:mb-14">
            {[
              { step: "01", name: "採摘", desc: "清晨手工採摘嫩芽" },
              { step: "02", name: "萎凋", desc: "日光與室內萎凋" },
              { step: "03", name: "揉捻", desc: "成形展現茶韻" },
              { step: "04", name: "焙火", desc: "精控火候鎖香" },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-white rounded-2xl p-5 md:p-7 text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-xs text-tea-green font-medium tracking-widest mb-3">
                  {item.step}
                </div>
                <div className="font-serif text-xl font-bold text-tea-text mb-2">
                  {item.name}
                </div>
                <div className="text-xs text-tea-text-light">{item.desc}</div>
              </div>
            ))}
          </div>
          <Link
            href="/process"
            className="bg-tea-green hover:bg-tea-green-dark text-white px-9 py-3.5 rounded-full font-medium transition-colors shadow-sm"
          >
            探索完整製茶過程
          </Link>
        </div>
      </section>
    </div>
  );
}
