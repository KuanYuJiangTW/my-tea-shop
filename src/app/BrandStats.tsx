"use client";

import NumberTicker from "@/components/ui/number-ticker";

const stats = [
  { number: 40,   suffix: "+",  label: "年製茶經驗" },
  { number: 3,    suffix: "",   label: "家人親手把關" },
  { number: 10,   suffix: "+",  label: "茶款系列" },
  { number: 1300, suffix: "m",  label: "茶園最高海拔" },
];

export default function BrandStats() {
  return (
    <div className="border-t border-white/10 pt-10">
      {/* 桌機：四欄橫排 */}
      <div className="hidden md:grid md:grid-cols-4">
        {stats.map((stat, i) => (
          <div key={stat.label} className={`flex flex-col gap-1 ${i > 0 ? "border-l border-white/10 pl-10" : ""}`}>
            <span className="font-serif text-5xl font-bold text-tea-green-light leading-none">
              <NumberTicker value={stat.number} delay={i * 0.1} />
              {stat.suffix}
            </span>
            <span className="text-tea-green-pale text-sm mt-1">{stat.label}</span>
          </div>
        ))}
      </div>
      {/* 手機：2x2 格子 + 分隔線 */}
      <div className="md:hidden grid grid-cols-2">
        {stats.map((stat, i) => (
          <div key={stat.label} className={`flex flex-col gap-1 py-6 ${i % 2 === 1 ? "border-l border-white/10 pl-6" : "pr-6"} ${i >= 2 ? "border-t border-white/10" : ""}`}>
            <span className="font-serif text-4xl font-bold text-tea-green-light leading-none">
              <NumberTicker value={stat.number} delay={i * 0.1} />
              {stat.suffix}
            </span>
            <span className="text-tea-green-pale text-sm mt-1">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
