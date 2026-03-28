"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

const steps = [
  {
    number: "01",
    name: "採摘",
    nameEn: "Harvesting",
    desc: "早上六點，採茶工們帶著工具攀上茶山。最好的茶葉在成熟度適中時採摘，此時採摘製茶最能激發出香氣滋味。手工採摘確保每一片葉子都是最嫩的一心二葉。",
    detail: "採摘季節：春（四月）、夏（六月）、秋（九月）、冬（十一月）",
    color: "bg-tea-green-mist",
    accent: "text-tea-green",
  },
  {
    number: "02",
    name: "日光萎凋",
    nameEn: "Solar Withering",
    desc: "採摘後的茶葉攤放於乾淨的布上，在陽光下進行日光萎凋。這個步驟讓茶葉失去部分水分，細胞組織軟化，為後續的室內萎凋做準備，同時激發初始的香氣物質。",
    detail: "時間：1-2小時，視日照與溫度調整",
    color: "bg-amber-50",
    accent: "text-amber-600",
  },
  {
    number: "03",
    name: "室內萎凋",
    nameEn: "Indoor Withering",
    desc: "將茶葉移至室內，攤放於通風良好的萎凋架上。在恆溫恆濕的環境中繼續萎凋，師傅每隔一段時間翻動茶葉，確保均勻失水，香氣持續醞釀發展。",
    detail: "時間：8-12小時，溫度控制在18-26°C",
    color: "bg-green-50",
    accent: "text-green-700",
  },
  {
    number: "04",
    name: "浪菁",
    nameEn: "Tossing",
    desc: "這是烏龍茶最關鍵的步驟之一。師傅以雙手或竹篩有節律地攪拌茶葉，使葉緣輕微破損，啟動酵素氧化反應，讓茶葉產生獨特的花果香氣。",
    detail: "次數：每1.5小時~2.5小時一次，共2-4次",
    color: "bg-tea-green-mist",
    accent: "text-tea-green",
  },
  {
    number: "05",
    name: "炒菁",
    nameEn: "Kill-green",
    desc: "在達到理想氧化程度後，茶葉被投入高溫鐵鍋中翻炒，讓葉片中的酵素失去活性，停止氧化，同時激發出炒香與固定香氣，去除青草味。",
    detail: "溫度：260-300°C，時間：約5-8分鐘",
    color: "bg-orange-50",
    accent: "text-orange-600",
  },
  {
    number: "06",
    name: "揉捻",
    nameEn: "Rolling",
    desc: "炒菁後的茶葉趁熱包布揉捻，使茶葉緊縮成球狀或條索狀。這個步驟使茶汁附著於葉表，沖泡時能快速展開，釋放完整的茶湯滋味。",
    detail: "反覆揉捻3-6次，每次20-30分鐘",
    color: "bg-tea-cream",
    accent: "text-tea-text",
  },
  {
    number: "07",
    name: "焙火",
    nameEn: "Firing",
    desc: "精控的焙火是茶葉的最後蛻變。師傅根據茶款特性決定焙火程度，輕焙保留花香，中焙增添熟果香，重焙則帶出濃郁的烘焙韻味。此步驟也去除多餘水分，延長保存期限。",
    detail: "溫度：70-120°C，時間：4-16小時不等",
    color: "bg-amber-50",
    accent: "text-amber-700",
  },
  {
    number: "08",
    name: "揀選包裝",
    nameEn: "Sorting & Packaging",
    desc: "成茶後由師傅逐一手工揀除老葉、茶梗與雜質，確保每一批茶的品質一致。包裝採用真空鋁箔袋，保存茶葉香氣，讓您收到的每一包茶都如同剛出爐般新鮮。",
    detail: "每批茶均附品質認證標籤",
    color: "bg-green-50",
    accent: "text-tea-green",
  },
];

export default function ProcessContent() {
  const [activeStep, setActiveStep] = useState("01");
  const isScrollingRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepBarRef = useRef<HTMLElement>(null);

  // 動態同步步驟 bar 的 top，讓它永遠貼緊 Header 底部
  useEffect(() => {
    const sync = () => {
      if (!stepBarRef.current) return;
      const header = document.querySelector("header");
      const bottom = header ? header.getBoundingClientRect().bottom : 0;
      stepBarRef.current.style.top = `${Math.max(0, bottom)}px`;
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync, { passive: true });
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  // 點擊步驟按鈕：立刻 highlight，捲動並垂直置中
  const scrollToStep = useCallback((number: string) => {
    // 立刻設定 active，避免捲動途中被 Observer 覆蓋
    setActiveStep(number);
    isScrollingRef.current = true;
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 900);

    const el = document.getElementById(`step-${number}`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const offset = window.scrollY + rect.top - (window.innerHeight - rect.height) / 2;
    window.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
  }, []);

  // IntersectionObserver：手動捲動時追蹤畫面中央的步驟
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    steps.forEach((step) => {
      const el = document.getElementById(`step-${step.number}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !isScrollingRef.current) {
            setActiveStep(step.number);
          }
        },
        { rootMargin: "-35% 0px -35% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-tea-green-mist py-24 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-tea-green-pale/30 rounded-full" />
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-tea-cream/50 rounded-full" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <p className="text-tea-green text-xs tracking-[0.3em] uppercase mb-5">The Craft</p>
          <h1 className="font-serif text-5xl md:text-6xl font-bold text-tea-text mb-5">製茶過程</h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-6" />
          <p className="text-tea-text-light text-lg max-w-xl mx-auto leading-relaxed">
            從山上的一片嫩葉，到杯中的一口好茶，<br />
            每一步都承載著職人的心意與百年傳承
          </p>
        </div>
      </section>

      {/* 步驟導覽列（sticky） */}
      <section ref={stepBarRef} className="sticky top-16 z-20 bg-white border-b border-tea-green-pale/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-4 md:grid-cols-8 gap-1 md:gap-2">
            {steps.map((step, i) => {
              const isActive = activeStep === step.number;
              return (
                <div key={step.number} className="text-center group">
                  <div className="flex items-center justify-center md:justify-start">
                    <button
                      onClick={() => scrollToStep(step.number)}
                      aria-label={`跳到步驟 ${step.number} ${step.name}`}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 flex-shrink-0 ${
                        isActive
                          ? "bg-tea-green text-white scale-110 shadow-md"
                          : "bg-tea-green-mist text-tea-green group-hover:bg-tea-green group-hover:text-white"
                      }`}
                    >
                      {step.number}
                    </button>
                    {i < steps.length - 1 && (
                      <div className="h-0.5 flex-1 bg-tea-green-pale hidden md:block" />
                    )}
                  </div>
                  <p
                    onClick={() => scrollToStep(step.number)}
                    className={`text-xs mt-2 font-medium transition-colors cursor-pointer ${
                      isActive ? "text-tea-green" : "text-tea-text-light group-hover:text-tea-green"
                    }`}
                  >
                    {step.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 步驟詳情 */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {steps.map((step) => (
              <div
                id={`step-${step.number}`}
                key={step.number}
                className={`${step.color} rounded-3xl p-8 md:p-10 scroll-mt-36 transition-all duration-300`}
              >
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  {/* 步驟編號 */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm">
                      <span className={`text-xs font-bold ${step.accent} tracking-wider`}>STEP</span>
                      <span className={`font-serif text-2xl font-bold ${step.accent}`}>{step.number}</span>
                    </div>
                  </div>

                  {/* 內容 */}
                  <div className="flex-1">
                    <div className="flex items-baseline gap-3 mb-3">
                      <h2 className="font-serif text-2xl font-bold text-tea-text">{step.name}</h2>
                      <span className="text-sm text-tea-text-light italic">{step.nameEn}</span>
                    </div>
                    <p className="text-tea-text-light leading-relaxed mb-4">{step.desc}</p>
                    <div className="inline-flex items-center gap-2 bg-white/70 rounded-full px-4 py-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-tea-green flex-shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span className="text-xs text-tea-text-light">{step.detail}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 不同茶款說明 */}
      <section className="py-16 bg-tea-text">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl font-bold text-tea-cream-light mb-5">不同茶款，不同工藝</h2>
          <p className="text-tea-green-pale leading-relaxed mb-8 max-w-xl mx-auto">
            以上流程以台灣烏龍茶為例。不同類別的茶葉有不同的製作方式——
            綠茶省略氧化步驟，紅茶則進行完全氧化，白茶僅經萎凋不揉捻。
            每一種工法都是對茶葉特性的最佳詮釋。
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { name: "烏龍茶", oxidation: "15-85%", color: "bg-amber-100/20" },
              { name: "綠茶",   oxidation: "0%",      color: "bg-green-100/20" },
              { name: "紅茶",   oxidation: "100%",    color: "bg-red-100/20"   },
              { name: "白茶",   oxidation: "微氧化",  color: "bg-gray-100/20"  },
            ].map((tea) => (
              <div key={tea.name} className={`${tea.color} border border-white/10 rounded-2xl p-5 text-center`}>
                <div className="font-serif text-lg font-bold text-tea-cream-light mb-2">{tea.name}</div>
                <div className="text-xs text-tea-green-pale">氧化度 {tea.oxidation}</div>
              </div>
            ))}
          </div>
          <Link href="/products" className="bg-tea-green hover:bg-tea-green-dark text-white px-9 py-3.5 rounded-full font-medium transition-colors">
            選購各式茶品
          </Link>
        </div>
      </section>
    </div>
  );
}
