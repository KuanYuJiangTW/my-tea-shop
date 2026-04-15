"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

const stepKeys = [
  { key: "pick",         number: "01", color: "bg-tea-green-mist", accent: "text-tea-green" },
  { key: "witherSun",    number: "02", color: "bg-amber-50",        accent: "text-amber-600" },
  { key: "witherIndoor", number: "03", color: "bg-green-50",        accent: "text-green-700" },
  { key: "shake",        number: "04", color: "bg-tea-green-mist",  accent: "text-tea-green" },
  { key: "fix",          number: "05", color: "bg-orange-50",       accent: "text-orange-600" },
  { key: "roll",         number: "06", color: "bg-tea-cream",       accent: "text-tea-text" },
  { key: "roast",        number: "07", color: "bg-amber-50",        accent: "text-amber-700" },
  { key: "sort",         number: "08", color: "bg-green-50",        accent: "text-tea-green" },
] as const;

const teaKeys = [
  { key: "oolong", color: "bg-amber-100/20" },
  { key: "green",  color: "bg-green-100/20" },
  { key: "black",  color: "bg-red-100/20"   },
  { key: "white",  color: "bg-gray-100/20"  },
] as const;

export default function ProcessContent() {
  const locale = useLocale();
  const t = useTranslations("process");
  const lp = (path: string) => locale === "en" ? `/en${path}` : path;

  const steps = stepKeys.map((s) => ({
    ...s,
    name:   t(`steps.${s.key}.name`),
    desc:   t(`steps.${s.key}.desc`),
    detail: t(`steps.${s.key}.detail`),
  }));

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

    // 用 offsetHeight 取得各 sticky 元素的固定高度，不受捲動位置影響
    const headerHeight  = (document.querySelector("header") as HTMLElement)?.offsetHeight ?? 0;
    const stepBarHeight = stepBarRef.current?.offsetHeight ?? 0;
    const stickyHeight  = headerHeight + stepBarHeight;

    const rect        = el.getBoundingClientRect();
    const available   = window.innerHeight - stickyHeight;
    const idealOffset = Math.max(0, (available - rect.height) / 2);
    const scrollDelta = rect.top - stickyHeight - idealOffset;
    window.scrollTo({ top: window.scrollY + scrollDelta, behavior: "smooth" });
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
  }, [steps]);

  return (
    <div>
      {/* Hero */}
      <section className="bg-tea-green-mist py-24 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-tea-green-pale/30 rounded-full" />
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-tea-cream/50 rounded-full" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <p className="text-tea-green text-xs tracking-[0.3em] uppercase mb-5">{t("tableTitle")}</p>
          <h1 className="font-serif text-5xl md:text-6xl font-bold text-tea-text mb-5">{t("pageTitle")}</h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-6" />
          <p className="text-tea-text-light text-lg max-w-xl mx-auto leading-relaxed">
            {t("pageTagline")}
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
                <div key={step.number} className="flex items-start justify-center md:justify-start group">
                  {/* 圓圈 + 文字同在 button 內，文字永遠置中於圓圈下方 */}
                  <button
                    onClick={() => scrollToStep(step.number)}
                    aria-label={`${step.number} ${step.name}`}
                    className="flex flex-col items-center shrink-0"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                        isActive
                          ? "bg-tea-green text-white scale-110 shadow-md"
                          : "bg-tea-green-mist text-tea-green group-hover:bg-tea-green group-hover:text-white"
                      }`}
                    >
                      {step.number}
                    </div>
                    <span
                      className={`text-xs mt-2 font-medium transition-colors leading-tight text-center ${
                        isActive ? "text-tea-green" : "text-tea-text-light group-hover:text-tea-green"
                      }`}
                    >
                      {step.name}
                    </span>
                  </button>
                  {/* 連接線：對齊圓圈垂直中心（mt-5 = 20px = h-10 / 2） */}
                  {i < steps.length - 1 && (
                    <div className="h-0.5 flex-1 bg-tea-green-pale hidden md:block self-start mt-5" />
                  )}
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
                      <span className={`text-xs font-bold ${step.accent} tracking-wider`}>{t("tableNote")}</span>
                      <span className={`font-serif text-2xl font-bold ${step.accent}`}>{step.number}</span>
                    </div>
                  </div>

                  {/* 內容 */}
                  <div className="flex-1">
                    <div className="flex items-baseline gap-3 mb-3">
                      <h2 className="font-serif text-2xl font-bold text-tea-text">{step.name}</h2>
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
          <h2 className="font-serif text-3xl font-bold text-tea-cream-light mb-5">{t("otherStyles")}</h2>
          <p className="text-tea-green-pale leading-relaxed mb-8 max-w-xl mx-auto">
            {t("otherStylesDesc")}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {teaKeys.map((tea) => (
              <div key={tea.key} className={`${tea.color} border border-white/10 rounded-2xl p-5 text-center`}>
                <div className="font-serif text-lg font-bold text-tea-cream-light mb-2">
                  {t(`teas.${tea.key}.name`)}
                </div>
                <div className="text-xs text-tea-green-pale">
                  {t("oxidationLabel", { value: t(`teas.${tea.key}.oxidation`) })}
                </div>
              </div>
            ))}
          </div>
          <Link href={lp("/products")} className="bg-tea-green hover:bg-tea-green-dark text-white px-9 py-3.5 rounded-full font-medium transition-colors">
            {t("shopCta")}
          </Link>
        </div>
      </section>
    </div>
  );
}
