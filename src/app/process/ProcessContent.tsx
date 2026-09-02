"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ExperienceType } from "@/types";
import type { ExperienceContent } from "@/lib/experiences";
import {
  getProductFor,
  getTeaProcess,
  resolveSteps,
  teaProcesses,
  type ResolvedStep,
  type StepKey,
  type TeaKey,
} from "@/data/tea-process";

/** 沿用 about 頁的五茶漸層配色（已在 tailwind safelist） */
const teaColors: Record<TeaKey, string> = {
  oolong: "from-green-100 to-emerald-200",
  jinxuan: "from-yellow-100 to-amber-200",
  black: "from-amber-200 to-orange-300",
  redOolong: "from-red-100 to-rose-200",
  sijichun: "from-lime-100 to-green-200",
};

/**
 * 每道工序的卡片底色；分歧段會另外套容器底色，故此處僅負責卡片本身。
 *
 * 色票分兩類：**帶溫度的工序**用 `process-*`（日光、爐火、發酵），
 * **不帶溫度的工序**用品牌色（採摘、浪菁、揉捻、團揉、包裝）。
 * `process-*` 的值原封不動沿用原本的 Tailwind 預設色，2026-08-08 拍板保留，
 * 定義與理由見 `tailwind.config.ts`。
 */
const stepColors: Record<StepKey, { color: string; accent: string }> = {
  pick: { color: "bg-tea-green-mist", accent: "text-tea-green-ink" },
  witherSun: { color: "bg-process-sun-soft", accent: "text-process-sun" },
  witherIndoor: { color: "bg-process-indoor-soft", accent: "text-process-indoor" },
  shake: { color: "bg-tea-green-mist", accent: "text-tea-green-ink" },
  fix: { color: "bg-process-fire-soft", accent: "text-process-fire" },
  roll: { color: "bg-tea-cream", accent: "text-tea-text" },
  ferment: { color: "bg-process-ferment-soft", accent: "text-process-ferment" },
  dryFirst: { color: "bg-process-roast-soft", accent: "text-process-roast" },
  ballRoll: { color: "bg-tea-cream", accent: "text-tea-text" },
  dryFinal: { color: "bg-process-indoor-soft", accent: "text-tea-green-ink" },
  roast: { color: "bg-process-roast-soft", accent: "text-process-roast" },
  pack: { color: "bg-tea-green-mist", accent: "text-tea-green-ink" },
};

const teaKeys = teaProcesses.map((t) => t.key);

/** 對照表的「炒菁的位置」——本頁的核心敘事，由資料推導而非另寫一份 */
function fixPositionOf(key: TeaKey): "first" | "none" | "last" {
  const divergence = getTeaProcess(key).divergence;
  const fixIndex = divergence.findIndex((d) => d.step === "fix" && d.state !== "skipped");
  if (fixIndex === -1) return "none";
  return fixIndex === 0 ? "first" : "last";
}

interface Props {
  experiences: ExperienceType[];
  contents: ExperienceContent[];
}

export default function ProcessContent({ experiences, contents }: Props) {
  const locale = useLocale();
  const t = useTranslations("process");
  const lp = (path: string) => (locale === "en" ? `/en${path}` : path);
  const isEn = locale === "en";

  const contentMap = Object.fromEntries(contents.map((c) => [c.slug, c]));
  const featuredExperiences = experiences.slice(0, 3);

  const [activeTea, setActiveTea] = useState<TeaKey>("oolong");
  const [activeStep, setActiveStep] = useState("01");
  const isScrollingRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepBarRef = useRef<HTMLElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const shouldFocusTabRef = useRef(false);

  /**
   * 進站時若帶著 #oolong 之類的 anchor，直接切到該茶。
   * 也監聽 hashchange——站內已在本頁時再點 /process#redOolong，瀏覽器只發
   * hashchange 而不會重新掛載元件，少了這個監聽茶款就不會跟著換。
   */
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "") as TeaKey;
      if (teaKeys.includes(hash)) setActiveTea(hash);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const resolved = useMemo(() => resolveSteps(activeTea), [activeTea]);
  const numbered = useMemo(() => resolved.filter((s) => s.number !== null), [resolved]);

  /**
   * 切換茶款後步驟數可能變少（四季春只有 10 步），此時記著的 activeStep 可能已不存在。
   * 這裡在 render 時推導出有效值，而不是用 effect 去 setState 修正——後者會觸發連鎖
   * render，也讓「哪個才是真正的當前步驟」有兩個來源。
   */
  const effectiveStep = numbered.some((s) => s.number === activeStep)
    ? activeStep
    : numbered[0]?.number ?? "01";

  /** 文案取用：accent / optional / skipped 優先取該茶專屬文案，否則用共通文案 */
  const copyFor = useCallback(
    (s: ResolvedStep) => {
      const own = `teaSteps.${activeTea}.${s.step}`;
      const hasOwn = (field: string) => t.has(`${own}.${field}`);
      return {
        name: t(`steps.${s.step}.name`),
        desc: hasOwn("desc") ? t(`${own}.desc`) : t(`steps.${s.step}.desc`),
        detail: hasOwn("detail") ? t(`${own}.detail`) : t(`steps.${s.step}.detail`),
        skipReason: hasOwn("skipReason") ? t(`${own}.skipReason`) : null,
      };
    },
    [activeTea, t],
  );

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
    const headerHeight = (document.querySelector("header") as HTMLElement)?.offsetHeight ?? 0;
    const stepBarHeight = stepBarRef.current?.offsetHeight ?? 0;
    const stickyHeight = headerHeight + stepBarHeight;

    const rect = el.getBoundingClientRect();
    const available = window.innerHeight - stickyHeight;
    const idealOffset = Math.max(0, (available - rect.height) / 2);
    const scrollDelta = rect.top - stickyHeight - idealOffset;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: window.scrollY + scrollDelta,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, []);

  // IntersectionObserver：手動捲動時追蹤畫面中央的步驟
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    numbered.forEach((step) => {
      const el = document.getElementById(`step-${step.number}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !isScrollingRef.current) {
            setActiveStep(step.number!);
          }
        },
        { rootMargin: "-35% 0px -35% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, [numbered]);

  /** 切換茶款：更新 hash 供分享與引用，但不動捲動位置 */
  const selectTea = useCallback((key: TeaKey) => {
    setActiveTea(key);
    window.history.replaceState(null, "", `#${key}`);
  }, []);

  /**
   * tablist 的鍵盤操作（WAI-ARIA tabs pattern）：左右鍵在茶款間移動、Home/End 跳頭尾。
   * 少了這段，roving tabindex 會讓鍵盤使用者只能停在當前茶款上、換不了茶。
   */
  const onTabKeyDown = useCallback(
    (e: KeyboardEvent, index: number) => {
      const last = teaProcesses.length - 1;
      const next =
        e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
        : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
        : e.key === "Home" ? 0
        : e.key === "End" ? last
        : null;
      if (next === null) return;
      e.preventDefault();
      selectTea(teaProcesses[next].key);
      shouldFocusTabRef.current = true;
    },
    [selectTea],
  );

  /** 用方向鍵換茶後把焦點帶到新的 tab（用滑鼠點選時不搶焦點） */
  useEffect(() => {
    if (!shouldFocusTabRef.current) return;
    shouldFocusTabRef.current = false;
    activeTabRef.current?.focus();
  }, [activeTea]);

  const sections = [
    { id: "opening", titleKey: "commonOpeningTitle", descKey: "commonOpeningDesc" },
    { id: "divergence", titleKey: "divergenceTitle", descKey: "divergenceDesc" },
    { id: "closing", titleKey: "commonClosingTitle", descKey: "commonClosingDesc" },
  ] as const;

  const product = getProductFor(activeTea);
  const teaProcess = getTeaProcess(activeTea);

  return (
    <div>
      {/* Hero */}
      <section className="bg-tea-green-mist py-24 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-tea-green-pale/30 rounded-full" />
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-tea-cream/50 rounded-full" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <p className="text-tea-green-ink text-xs tracking-[0.3em] uppercase mb-5">{t("tableTitle")}</p>
          <h1 className="font-serif text-5xl md:text-6xl font-bold text-tea-text mb-5">{t("pageTitle")}</h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-6" />
          <p className="text-tea-text-muted text-lg max-w-xl mx-auto leading-relaxed">{t("pageTagline")}</p>
        </div>
      </section>

      {/* 核心洞察：共通前段 → 分歧段 → 共通後段 */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl font-bold text-tea-text mb-3">{t("divergence.insightTitle")}</h2>
          <p className="text-tea-text-muted leading-relaxed max-w-2xl mx-auto mb-10">
            {t("divergence.insightDesc")}
          </p>
          <div className="flex flex-col md:flex-row items-stretch gap-3 text-left">
            {sections.map((section, i) => {
              const isDivergence = section.id === "divergence";
              return (
                <div key={section.id} className="flex-1 flex items-stretch gap-3">
                  <div
                    className={`flex-1 rounded-2xl p-5 border ${
                      isDivergence
                        ? "bg-tea-green-mist border-tea-green/40 shadow-sm"
                        : "bg-white border-tea-green-pale/60"
                    }`}
                  >
                    <div
                      className={`text-xs font-bold tracking-wider mb-2 ${
                        isDivergence ? "text-tea-green-ink" : "text-tea-text-muted"
                      }`}
                    >
                      {t(`divergence.${section.titleKey}`)}
                    </div>
                    <p className="text-sm text-tea-text-muted leading-relaxed">
                      {t(`divergence.${section.descKey}`)}
                    </p>
                  </div>
                  {i < sections.length - 1 && (
                    <div className="hidden md:flex items-center text-tea-green-pale shrink-0" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 導覽列（sticky）：上排茶款、下排工序 */}
      <section
        ref={stepBarRef}
        className="sticky top-16 z-20 bg-white border-b border-tea-green-pale/50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* 上排：茶款選擇器 */}
          <div className="mb-3">
            {/* 捲動容器與 flex 分開：w-max + mx-auto 讓內容放得下時置中，
                放不下時才從左邊開始捲——直接對 overflow 容器下 justify-center
                會讓溢出的左半邊捲不到 */}
            <div className="overflow-x-auto pb-1">
            <div
              className="flex items-center gap-2 w-max mx-auto"
              role="tablist"
              aria-label={t("teaSelector.label")}
            >
              {teaProcesses.map((tea, i) => {
                const isActive = activeTea === tea.key;
                return (
                  <button
                    key={tea.key}
                    id={`tab-${tea.key}`}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={isActive ? activeTea : undefined}
                    // roving tabindex：整組 tab 在鍵盤走訪中只佔一站，組內用方向鍵移動
                    tabIndex={isActive ? 0 : -1}
                    ref={isActive ? activeTabRef : undefined}
                    onKeyDown={(e) => onTabKeyDown(e, i)}
                    onClick={() => selectTea(tea.key)}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tea-green focus-visible:ring-offset-2 ${
                      isActive
                        ? "bg-tea-green-dark text-white shadow-sm"
                        : "bg-tea-green-mist text-tea-text-muted hover:bg-tea-green/20 hover:text-tea-green-ink"
                    }`}
                  >
                    {t(`teas.${tea.key}.name`)}
                  </button>
                );
              })}
            </div>
            </div>
            <p className="text-xs text-tea-text-muted mt-1.5 text-center">{t("teaSelector.hint")}</p>
          </div>

          {/* 下排：工序（橫向捲動——工序數已達 10–12，grid 會擠成多排） */}
          <div className="overflow-x-auto pb-1">
          <div className="flex items-start gap-1 w-max mx-auto">
            {numbered.map((step, i) => {
              const isActive = effectiveStep === step.number;
              const name = t(`steps.${step.step}.name`);
              return (
                <div key={`${step.step}-${step.number}`} className="flex items-start shrink-0 group">
                  <button
                    onClick={() => scrollToStep(step.number!)}
                    aria-label={`${step.number} ${name}`}
                    aria-current={isActive ? "step" : undefined}
                    className="flex flex-col items-center shrink-0 w-16 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tea-green focus-visible:ring-offset-2"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 motion-reduce:transition-none ${
                        isActive
                          ? "bg-tea-green-dark text-white scale-110 shadow-md"
                          : "bg-tea-green-mist text-tea-green-ink group-hover:bg-tea-green group-hover:text-white"
                      }`}
                    >
                      {step.number}
                    </div>
                    <span
                      className={`text-xs mt-2 font-medium transition-colors leading-tight text-center ${
                        isActive ? "text-tea-green-ink" : "text-tea-text-muted group-hover:text-tea-green-ink"
                      }`}
                    >
                      {name}
                    </span>
                  </button>
                  {i < numbered.length - 1 && (
                    <div className="h-0.5 w-3 bg-tea-green-pale self-start mt-5 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
          </div>
        </div>
      </section>

      {/* 工序詳情：三段結構 */}
      <section
        id={activeTea}
        role="tabpanel"
        aria-labelledby={`tab-${activeTea}`}
        className="py-16 scroll-mt-36"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 來源徽章與家族 */}
          <div className="flex flex-wrap items-center gap-2 mb-10">
            <span className="inline-flex items-center gap-1.5 bg-tea-green-mist text-tea-green-ink text-xs font-medium px-3 py-1.5 rounded-full">
              {t(`sourcing.${teaProcess.sourcing}`)}・{t(`teas.${activeTea}.origin`)}
            </span>
            <span className="inline-flex items-center bg-white border border-tea-green-pale text-tea-text-muted text-xs font-medium px-3 py-1.5 rounded-full">
              {t(`families.${teaProcess.family}.name`)}
            </span>
            <span className="inline-flex items-center bg-white border border-tea-green-pale text-tea-text-muted text-xs font-medium px-3 py-1.5 rounded-full">
              {t("oxidationLabel", { value: t(`teas.${activeTea}.oxidation`) })}
            </span>
          </div>

          {sections.map((section) => {
            const steps = resolved.filter((s) => s.section === section.id);
            if (steps.length === 0) return null;
            const isDivergence = section.id === "divergence";

            return (
              <div
                key={section.id}
                className={`mb-10 ${
                  isDivergence ? "bg-tea-green-mist rounded-3xl p-5 md:p-7 -mx-1 md:-mx-3" : ""
                }`}
              >
                <div className="mb-5">
                  <h2
                    className={`font-serif text-xl font-bold mb-1 ${
                      isDivergence ? "text-tea-green-ink" : "text-tea-text"
                    }`}
                  >
                    {t(`divergence.${section.titleKey}`)}
                  </h2>
                  <p className="text-sm text-tea-text-muted leading-relaxed">
                    {t(`divergence.${section.descKey}`)}
                  </p>
                </div>

                <div className="space-y-5">
                  {steps.map((step) => {
                    const copy = copyFor(step);
                    const skipped = step.state === "skipped";
                    const palette = stepColors[step.step];

                    return (
                      <div
                        id={step.number ? `step-${step.number}` : undefined}
                        key={`${step.step}-${step.state}`}
                        className={`${skipped ? "bg-white/60" : palette.color} rounded-3xl p-6 md:p-8 scroll-mt-44 transition-all duration-300 motion-reduce:transition-none ${
                          skipped ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-start gap-5">
                          {/* 編號（skipped 不佔號） */}
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm">
                              {step.number ? (
                                <>
                                  <span className={`text-xs font-bold ${palette.accent} tracking-wider`}>
                                    {t("tableNote")}
                                  </span>
                                  <span className={`font-serif text-2xl font-bold ${palette.accent}`}>
                                    {step.number}
                                  </span>
                                </>
                              ) : (
                                <span className="text-tea-text-muted text-2xl leading-none" aria-hidden="true">
                                  —
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
                              <h3
                                className={`font-serif text-2xl font-bold text-tea-text ${
                                  skipped ? "line-through decoration-tea-text-light/60" : ""
                                }`}
                              >
                                {copy.name}
                              </h3>
                              {step.state !== "common" && (
                                <span className="text-xs font-medium text-tea-green-ink bg-white/80 px-2.5 py-1 rounded-full">
                                  {t(`stepState.${step.state}`)}
                                </span>
                              )}
                            </div>

                            {skipped ? (
                              <p className="text-tea-text-muted leading-relaxed">{copy.skipReason}</p>
                            ) : (
                              <>
                                <p className="text-tea-text-muted leading-relaxed mb-4">{copy.desc}</p>
                                <div className="inline-flex items-start gap-2 bg-white/70 rounded-2xl px-4 py-2">
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="text-tea-green-ink flex-shrink-0 mt-0.5"
                                    aria-hidden="true"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                  </svg>
                                  <span className="text-xs text-tea-text-muted leading-relaxed">{copy.detail}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* 工藝取捨 */}
          <div className="bg-tea-cream rounded-3xl p-7 md:p-9 mt-12">
            <h2 className="font-serif text-2xl font-bold text-tea-text mb-3">{t("craftNote.title")}</h2>
            <p className="text-tea-text-muted leading-relaxed mb-6">{t(`craftNote.${activeTea}`)}</p>
            <div className="border-t border-tea-green-pale/60 pt-5">
              <h3 className="font-serif text-lg font-bold text-tea-text mb-2">{t("craftNote.roastTitle")}</h3>
              <p className="text-tea-text-muted leading-relaxed text-sm">{t("craftNote.roastNote")}</p>
            </div>
          </div>

          {/* 商品導流 */}
          {product && (
            <div className="mt-8 bg-white border border-tea-green-pale rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
              <div
                className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${teaColors[activeTea]} shrink-0`}
                aria-hidden="true"
              />
              <div className="flex-1">
                <div className="font-serif text-xl font-bold text-tea-text mb-1">
                  {isEn ? product.nameEn || product.name : product.name}
                </div>
                <p className="text-sm text-tea-text-muted">{t("productCta.hint")}</p>
              </div>
              <Link
                href={lp("/products")}
                className="bg-tea-green-dark hover:bg-tea-green-ink text-white px-7 py-3 rounded-full font-medium transition-colors motion-reduce:transition-none text-center shrink-0"
              >
                {t("productCta.label")}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 五茶對照表 */}
      <section className="py-16 bg-tea-green-mist">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl font-bold text-tea-text mb-2 text-center">{t("matrix.title")}</h2>
          <p className="text-tea-text-muted text-center mb-10 max-w-xl mx-auto">{t("matrix.desc")}</p>

          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="w-full text-sm border-collapse min-w-[46rem]">
              <caption className="sr-only">{t("matrix.title")}</caption>
              <thead>
                <tr className="border-b border-tea-green-pale">
                  {/* 左上角是列標題欄的表頭，留白即可；給螢幕閱讀器一個名稱 */}
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">{t("matrix.title")}</span>
                  </th>
                  {teaProcesses.map((tea) => (
                    <th
                      key={tea.key}
                      scope="col"
                      className="text-left font-serif font-bold text-tea-text px-4 py-3 whitespace-nowrap"
                    >
                      {t(`teas.${tea.key}.name`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["rowFamily", (k: TeaKey) => t(`families.${getTeaProcess(k).family}.name`)],
                    ["rowOxidation", (k: TeaKey) => t(`teas.${k}.oxidation`)],
                    [
                      // 浪菁五款茶都有，紅烏龍為 accent（重攪拌）故加重標記
                      "rowShake",
                      (k: TeaKey) =>
                        resolveSteps(k).some((s) => s.step === "shake" && s.state === "accent")
                          ? "✓✓"
                          : "✓",
                    ],
                    [
                      "rowFixPosition",
                      (k: TeaKey) => {
                        const pos = fixPositionOf(k);
                        return t(pos === "first" ? "matrix.fixFirst" : pos === "none" ? "matrix.fixNone" : "matrix.fixLast");
                      },
                    ],
                    [
                      "rowFerment",
                      (k: TeaKey) =>
                        resolveSteps(k).some((s) => s.step === "ferment" && s.state !== "skipped")
                          ? t("matrix.yes")
                          : t("matrix.no"),
                    ],
                    ["rowShape", () => t("matrix.shapeBall")],
                    ["rowRoast", (k: TeaKey) => t(`teas.${k}.roast`)],
                    [
                      "rowOrigin",
                      (k: TeaKey) => {
                        const p = getProductFor(k);
                        return `${t(`teas.${k}.origin`)}${p?.altitude ? ` ${p.altitude}` : ""}`;
                      },
                    ],
                    ["rowSourcing", (k: TeaKey) => t(`sourcing.${getTeaProcess(k).sourcing}`)],
                    ["rowFlavor", (k: TeaKey) => t(`teas.${k}.flavor`)],
                  ] as const
                ).map(([rowKey, valueOf]) => {
                  const isHighlight = rowKey === "rowFixPosition";
                  return (
                    <tr
                      key={rowKey}
                      className={`border-b border-tea-green-pale/40 last:border-0 ${
                        isHighlight ? "bg-tea-green-mist/60" : ""
                      }`}
                    >
                      <th
                        scope="row"
                        className={`text-left px-4 py-3 whitespace-nowrap font-medium ${
                          isHighlight ? "text-tea-green-ink" : "text-tea-text-muted"
                        }`}
                      >
                        {t(`matrix.${rowKey}`)}
                      </th>
                      {teaProcesses.map((tea) => (
                        <td
                          key={tea.key}
                          className={`px-4 py-3 ${isHighlight ? "font-bold text-tea-green-ink" : "text-tea-text"}`}
                        >
                          {valueOf(tea.key)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-tea-text-muted text-center mt-5">{t("sourcing.note")}</p>
        </div>
      </section>

      {/* 茶山體驗引導 */}
      {featuredExperiences.length > 0 && (
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="text-tea-green-ink text-xs tracking-[0.3em] uppercase mb-3">
                  {t("experienceCta.sectionLabel")}
                </p>
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-2">
                  {t("experienceCta.title")}
                </h2>
                <p className="text-tea-text-muted max-w-xl">{t("experienceCta.tagline")}</p>
              </div>
              <Link
                href={lp("/experiences")}
                className="hidden md:flex text-tea-green-ink hover:text-tea-green-dark font-medium text-sm items-center gap-1 transition-colors shrink-0 ml-8"
              >
                {t("experienceCta.viewAll")}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredExperiences.map((exp) => {
                const content = contentMap[exp.slug];
                if (!content) return null;
                const imgSrc = content.coverImage ?? "/images/gallery/tea-cup.jpg";
                return (
                  <Link
                    key={exp.id}
                    href={lp(`/experiences/${exp.slug}`)}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-tea-green-pale/50"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={imgSrc}
                        alt={isEn ? exp.nameEn : exp.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="font-serif text-xl font-bold text-tea-text mb-1.5 group-hover:text-tea-green-ink transition-colors">
                        {isEn ? exp.nameEn || exp.name : exp.name}
                      </h3>
                      {/* 與商品卡同理：3 行才讀得完，見 ProductCard 的註解 */}
                      <p className="text-tea-text-muted text-label mb-4 line-clamp-3">
                        {isEn ? content.taglineEn || content.tagline : content.tagline}
                      </p>
                      <div className="flex items-center justify-between text-sm text-tea-text-muted">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-tea-green-ink" />
                            {t("experienceCta.duration", { hours: exp.durationHours })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-tea-green-ink" />
                            {t("experienceCta.participants", {
                              min: exp.minParticipants,
                              max: exp.maxParticipants,
                            })}
                          </span>
                        </div>
                        <span className="font-semibold text-tea-text">NT$ {exp.price.toLocaleString()}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="text-center mt-10">
              <Link
                href={lp("/experiences")}
                className="bg-tea-green-dark hover:bg-tea-green-ink text-white px-9 py-3.5 rounded-full font-medium transition-colors"
              >
                {t("experienceCta.viewAll")}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 商品導流（頁尾） */}
      <section className="py-16 bg-tea-text">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl font-bold text-tea-cream-light mb-5">{t("productCta.hint")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
            {teaProcesses.map((tea) => (
              <button
                key={tea.key}
                onClick={() => selectTea(tea.key)}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:bg-white/10 transition-colors motion-reduce:transition-none"
              >
                <div className="font-serif text-base font-bold text-tea-cream-light mb-1">
                  {t(`teas.${tea.key}.name`)}
                </div>
                <div className="text-xs text-tea-green-pale">
                  {t("oxidationLabel", { value: t(`teas.${tea.key}.oxidation`) })}
                </div>
              </button>
            ))}
          </div>
          <Link
            href={lp("/products")}
            className="bg-tea-green-dark hover:bg-tea-green-ink text-white px-9 py-3.5 rounded-full font-medium transition-colors"
          >
            {t("shopCta")}
          </Link>
        </div>
      </section>
    </div>
  );
}
