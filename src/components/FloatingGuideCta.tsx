"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

/**
 * 攻略文的浮動底部 CTA。
 *
 * 業主的顧慮是對的：這頁幾乎全是陌生搜尋流量，一進來就跳出來的推銷條會讓人反感。
 * 但反感的來源不是「有浮動按鈕」，而是三件具體的事——一進來就跳、遮住正在讀的字、
 * 關不掉。所以這個元件把那三件事逐一擋掉：
 *
 *   1. **捲過一個半螢幕才出現**。讀者已經投入了才問，不是一見面就推銷。
 *   2. **不遮字**。把自己的高度寫進 `--floating-cta-h`，由頁面加上等高的 padding；
 *      條子退場時歸零，版面不會留下一塊空白。
 *   3. **關得掉**，而且記在 sessionStorage——同一次瀏覽不會再跳出來。
 *
 * 還有一件不在業主清單上但同樣重要的：**文末真正的 CTA 卡片出現時它會自動收起**。
 * 兩個 CTA 疊在一起是最廉價的那種轉換設計，而且浮動條會蓋住卡片上的按鈕。
 *
 * 左邊那顆是打電話而不是第二個「預約」：接電話的就是寫這篇文章的人，
 * 一通電話的成交率遠高於任何按鈕，而且它讀起來是服務不是推銷。
 */
export default function FloatingGuideCta({
  bookHref, phoneHref, phoneLabel, storageKey, anchorId, showAfterScreens = 1.5,
}: {
  bookHref:   string;
  phoneHref:  string;
  phoneLabel: string;
  /** 關閉狀態的記憶鍵，用文章 slug 區隔 */
  storageKey: string;
  /** 文末 CTA 卡片的 id；它進入畫面時本條收起 */
  anchorId:   string;
  /**
   * 捲過幾個螢幕高才出現。
   *
   * 用螢幕數而不是「整頁的幾成」（原本是 0.35）：攻略文加了首屏影片與四張圖之後
   * 長了快一半，同樣的比例換算成絕對距離就變遠，業主實機回報「有點慢才出來」。
   * 螢幕數不受文章長度影響，之後再長也不會漂移，調整時也直觀——1.5 就是一個半螢幕。
   */
  showAfterScreens?: number;
}) {
  const t = useTranslations("teaGuide");
  const barRef = useRef<HTMLDivElement>(null);

  // 惰性初始化而不是 useEffect + setState：後者會觸發串聯重繪，專案 lint 直接擋。
  // SSR 沒有 sessionStorage，回 true（當作已關閉）；客戶端首次算繪即使回 false
  // 也不會造成 hydration 不一致——visible 還要 scrolledEnough 為真，而它首次必為 false。
  // sessionStorage 可能整個丟例外（無痕、瀏覽器封鎖儲存），吞掉就好
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    try { return sessionStorage.getItem(storageKey) === "1"; } catch { return false; }
  });
  const [scrolledEnough, setScrolled] = useState(false);
  const [ctaSeen, setCtaSeen]         = useState(false);

  const visible = !dismissed && scrolledEnough && !ctaSeen;

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
    // 只往「看過」單向切換：讀者一旦捲到文末真正的 CTA，浮動條的任務就結束了。
    // 用 isIntersecting 雙向切的話，捲過卡片進到頁尾時它會再冒出來蓋住 footer
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setCtaSeen(true); }, { threshold: 0 });
    io.observe(target);
    return () => io.disconnect();
  }, [anchorId]);

  // 把高度交給頁面去墊。用 CSS 變數而不是直接改別人的 class，
  // ChatWidget 也讀同一個變數把自己往上頂，兩者不必互相知道對方存在
  useEffect(() => {
    const root = document.documentElement;
    const h = visible ? `${barRef.current?.offsetHeight ?? 0}px` : "0px";
    root.style.setProperty("--floating-cta-h", h);
    return () => { root.style.setProperty("--floating-cta-h", "0px"); };
  }, [visible]);

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(storageKey, "1"); } catch { /* 忽略 */ }
  };

  return (
    <div
      ref={barRef}
      // 永遠留在 DOM 裡：量得到高度，也讓進出場能有轉場。不可見時用 aria-hidden
      // 與 pointer-events-none 讓它對讀螢幕與滑鼠都不存在
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-tea-green-pale bg-tea-cream-light/95 backdrop-blur-sm transition-transform duration-slow ease-standard ${
        visible ? "translate-y-0" : "translate-y-full pointer-events-none"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-2">
        <a
          href={phoneHref}
          tabIndex={visible ? undefined : -1}
          className="flex-1 text-center text-label font-medium px-3 py-2.5 rounded-pill border-2 border-tea-green-ink text-tea-green-ink hover:bg-tea-green-ink hover:text-white transition-colors duration-base ease-standard"
        >
          {phoneLabel}
        </a>
        <Link
          href={bookHref}
          tabIndex={visible ? undefined : -1}
          className="flex-1 text-center text-label font-medium px-3 py-2.5 rounded-pill bg-cta-visit text-white hover:bg-cta-visit-dark transition-colors duration-base ease-standard shadow-resting"
        >
          {t("floatingBook")}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          tabIndex={visible ? undefined : -1}
          aria-label={t("floatingDismiss")}
          className="shrink-0 w-11 h-11 -mr-1 flex items-center justify-center text-tea-text-muted hover:text-tea-text rounded-pill focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tea-green-ink transition-colors duration-base ease-standard"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
