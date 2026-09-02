"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

/**
 * 體驗頁的小型預約懸浮條。
 *
 * 業主回報（2026-08-31）：手機版要滑很久才看到「選擇場次」。量測後確認，
 * 月曆在 1.7 個螢幕的位置，而整頁有 8.5 個螢幕——**真正的問題不是月曆太下面，
 * 是滑過月曆之後預約入口就完全消失了**。看注意事項、看相簿、看評價的人
 * 想回頭訂位，得自己往回捲。
 *
 * 搬動版面只能把入口往前挪一點；懸浮條把它變成「隨時一鍵可達」。
 *
 * 三個克制的地方：
 *   1. **月曆在畫面裡時自動收起**——目的地就在眼前，還漂一條重複的按鈕只是噪音。
 *      這裡是雙向的（收起後捲離又會回來），和攻略文那條「看過就永久收起」不同：
 *      那邊的 CTA 是終點，這邊的月曆是要回頭用的。
 *   2. **過了第一個螢幕才出現**，不在 hero 就跳出來。
 *   3. 高度寫進 `--floating-cta-h`，容器讓出等高空間、ChatWidget 自己往上頂。
 *
 * 沒有關閉鈕：價格＋預約條是商品頁的標準做法，客人是自己點進來看這款體驗的，
 * 不是陌生觸及。要加的話就是多一顆 ×，一行的事。
 *
 * ## 只在手機出現
 *
 * 桌機整頁 3,575px（約 4 個螢幕），手機 6,749px（8.3 個螢幕）——業主回報的問題
 * 本來就是「尤其是手機頁面」。而全寬的 bar 在 1440px 下會把價格推到最左、
 * 按鈕推到最右，中間空一大片，看起來像壞掉。
 *
 * 用 matchMedia 而不是只加 `lg:hidden`：CSS 藏起來的話，元件仍然會把高度寫進
 * `--floating-cta-h`，桌機的 ChatWidget 會為了一條看不見的 bar 往上頂 63px。
 */

const DESKTOP = "(min-width: 1024px)";   // Tailwind 的 lg

// 模組層級的穩定參考——寫成行內箭頭每次算繪都會重新訂閱
const subscribeDesktop = (onChange: () => void) => {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const getDesktopSnapshot       = () => window.matchMedia(DESKTOP).matches;
const getDesktopServerSnapshot = () => false;   // SSR 讀不到寬度；首次算繪 visible 必為 false，不會有 hydration 不一致

export default function StickyBookingBar({
  price, anchorId, showAfterScreens = 1,
}: {
  price:    number;
  /** 月曆區塊的 id；它進入畫面時本條收起 */
  anchorId: string;
  showAfterScreens?: number;
}) {
  const t = useTranslations("experiences");
  const barRef = useRef<HTMLDivElement>(null);

  const [scrolledEnough, setScrolled] = useState(false);
  const [anchorInView, setAnchorInView] = useState(false);
  const isDesktop = useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, getDesktopServerSnapshot);

  const visible = !isDesktop && scrolledEnough && !anchorInView;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY >= window.innerHeight * showAfterScreens);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showAfterScreens]);

  useEffect(() => {
    const target = document.getElementById(anchorId);
    if (!target) return;
    // 雙向：月曆露出就收起，捲離就回來
    const io = new IntersectionObserver(([e]) => setAnchorInView(e.isIntersecting), { threshold: 0 });
    io.observe(target);
    return () => io.disconnect();
  }, [anchorId]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--floating-cta-h", visible ? `${barRef.current?.offsetHeight ?? 0}px` : "0px");
    return () => { root.style.setProperty("--floating-cta-h", "0px"); };
  }, [visible]);

  const jump = () => {
    const target = document.getElementById(anchorId);
    if (!target) return;
    // 尊重「減少動態」的偏好：關掉動畫的人直接跳，不做平滑捲動
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return (
    <div
      ref={barRef}
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 lg:hidden border-t border-tea-green-pale bg-tea-cream-light/95 backdrop-blur-sm transition-transform duration-slow ease-standard ${
        visible ? "translate-y-0" : "translate-y-full pointer-events-none"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <p className="text-tea-text font-medium shrink-0">
          NT$ {price.toLocaleString()}
          <span className="text-caption text-tea-text-muted ml-1">{t("perPerson")}</span>
        </p>
        <button
          type="button"
          onClick={jump}
          tabIndex={visible ? undefined : -1}
          className="text-label font-medium px-6 py-2.5 rounded-pill bg-cta-visit text-white hover:bg-cta-visit-dark transition-colors duration-base ease-standard shadow-resting"
        >
          {t("viewSessions")}
        </button>
      </div>
    </div>
  );
}
