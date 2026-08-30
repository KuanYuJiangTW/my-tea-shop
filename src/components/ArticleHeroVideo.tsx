"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

/**
 * 攻略文首屏的靜音循環影片。
 *
 * 為什麼是影片而不是照片（2026-08-30）：萬鷺朝鳳的畫面是「一大群白點在動」——
 * 靜止時只是綠山上的雜訊，動起來才是那個現象本身。業主手上的素材本來就全是影片，
 * 之前是截圖上傳才降級成靜態圖的。
 *
 * 但這是 SEO 落地頁，LCP 不能拿來換效果，所以：
 *   - poster 是全解析度抽幀，LCP 算在它身上，影片載入不影響
 *   - preload="none"，捲進畫面才 load()／play()，離開畫面就 pause()
 *   - 尊重 prefers-reduced-motion：不自動播，只顯示 poster 與播放鍵
 *   - 無音軌（編碼時 -an），不會有任何聲音跑出來
 */
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

// 模組層級的穩定參考——寫成行內箭頭函式的話每次算繪都會重新訂閱
const subscribeMotion = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const getMotionSnapshot       = () => window.matchMedia(REDUCED_MOTION).matches;
const getMotionServerSnapshot = () => false;   // SSR 讀不到 media query，先當成不需要降低動態

export default function ArticleHeroVideo({
  src, poster, alt, caption,
}: {
  src: string;
  poster: string;
  alt: string;
  caption?: string;
}) {
  const t        = useTranslations("teaGuide");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  // 用 useSyncExternalStore 而不是 useEffect + setState：後者會在掛載後多跑一次
  // 算繪（lint 的 no-cascading-renders 會擋），而 matchMedia 本來就是外部狀態，
  // 這個 hook 就是為它設計的——順便把 SSR 的快照講清楚
  const reduced = useSyncExternalStore(subscribeMotion, getMotionSnapshot, getMotionServerSnapshot);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || reduced) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // preload="none" 時 src 還沒抓，play() 會自己觸發載入
          void el.play().catch(() => { /* 自動播放被擋（省電模式等）就維持 poster */ });
        } else {
          el.pause();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const toggle = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  };

  return (
    <figure className="mb-10">
      <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-tea-cream">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          preload="none"
          aria-label={alt}
          className="w-full h-full object-cover"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? t("videoPause") : t("videoPlay")}
          className="absolute bottom-3 right-3 w-11 h-11 rounded-pill bg-tea-text/70 text-white flex items-center justify-center backdrop-blur-sm hover:bg-tea-text/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors duration-base ease-standard"
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
              <rect x="3" y="2" width="4" height="12" rx="1" />
              <rect x="9" y="2" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
              <path d="M4 2.5v11a.5.5 0 0 0 .76.43l9-5.5a.5.5 0 0 0 0-.86l-9-5.5A.5.5 0 0 0 4 2.5Z" />
            </svg>
          )}
        </button>
      </div>
      {caption && (
        <figcaption className="text-caption text-tea-text-muted mt-2.5">{caption}</figcaption>
      )}
    </figure>
  );
}
