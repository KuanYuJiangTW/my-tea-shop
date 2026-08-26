"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type HeroSlide = {
  src: string;
  alt: string;
  /**
   * 這張照片**專屬**的遮罩 class。不要抽成共用常數——各張照片的亮度差很多，
   * 共用一組 alpha 會讓文字在輪替時忽清忽糊，那比穩定的偏暗更難受。
   * 實測數字與挑選理由見 `page.tsx` 呼叫處的註解。
   */
  mask: string;
};

export type HeroLabels = { prev: string; next: string };

/**
 * 控制項**自帶深底**，不跟照片借對比——照片會換，借來的對比隨時會消失。
 *
 * 實測（按鈕落在遮罩最淡處，該處僅約 26%）：米白邊框對背景的對比
 *   picking2（暗樹叢） 5.96 ✅　　wilting4（亮水泥地） 1.64 ❌　純白照片 1.13 ❌
 * （2026-08-26 wilting4 重裁過一次，按鈕區換成新的一片亮水泥地，重量：
 *   無底 1.29 ❌　α=0.45 → 2.63 ❌　α=0.65 → 3.85 ✅。換照片、換裁切都沒有
 *   讓這件事變好，正好印證「不能跟照片借對比」；0.65 這個值仍然撐得住。）
 * 也就是說沒有底的話，按鈕在第二張上是**隱形的**（實機截圖確認看不到）。
 * 疊一層 tea-text 之後：
 *   α=0.45 → wilting4 3.11 ✅ 但純白 2.00 ❌
 *   α=0.65 → wilting4 4.33 ✅ 純白 3.16 ✅  ← 採用
 * 取 0.65 是為了讓「未來再加任何一張照片」都不必重驗這件事。
 * 門檻用 WCAG 1.4.11 非文字對比的 3.0（按鈕邊框與圖示都算 UI 元件）。
 */
const CONTROL_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-full bg-tea-text/65 " +
  "border-2 border-tea-cream/70 text-tea-cream " +
  "transition-colors duration-base ease-standard hover:bg-tea-cream hover:text-tea-text " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tea-cream " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-tea-text";

/**
 * 每張的停留時間。8 秒是刻意偏長的：底圖換得快會變成干擾，
 * 而文案與 CTA 全程不動，本來就沒有「要讓人看完第二則訊息」的壓力。
 */
const HOLD_MS = 8000;
/** 交叉淡入時長。低於約 600ms 會被讀成「閃了一下」，反而變成干擾 */
const FADE_MS = 1200;

export default function HeroBackground({
  slides,
  labels,
}: {
  slides: HeroSlide[];
  labels: HeroLabels;
}) {
  const [index, setIndex] = useState(0);
  // 第一張以外的圖延後掛載。hero 是 LCP 元素，開場就併發抓多張大圖會互相搶頻寬，
  // 等於用「輪播」把自己的 LCP 拖慢——先讓第一張畫完，其餘等瀏覽器閒下來
  const [loadRest, setLoadRest] = useState(false);
  // 使用者一旦自己按過左右，自動輪播就**永久停止**。
  // 沒有這個，他剛挑的那張會在幾秒後被系統換掉——那是在跟使用者搶方向盤。
  // 這同時是本元件對 WCAG 2.2.2（超過 5 秒的自動移動內容必須可暫停）的交代：
  // 控制項本身就是停止鍵，不必再多一顆語意重複的暫停鈕。
  const [autoPlay, setAutoPlay] = useState(true);

  const multi = slides.length > 1;

  useEffect(() => {
    if (!multi) return;
    const hasIdle = typeof window.requestIdleCallback === "function";
    const id = hasIdle
      ? window.requestIdleCallback(() => setLoadRest(true), { timeout: 3000 })
      : window.setTimeout(() => setLoadRest(true), 1500);
    return () => {
      if (hasIdle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, [multi]);

  useEffect(() => {
    // **計時器必須等後續圖掛載後才開始**：若 index 先跳到 1 而那張還沒進 DOM，
    // 第 0 張已經被設成 opacity 0、第 1 張又不存在，首屏會整片變黑
    if (!loadRest || !multi || !autoPlay) return;

    // prefers-reduced-motion 的使用者連自動淡入都不該有；他仍然可以按左右自己看
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    const sync = () => {
      window.clearInterval(timer);
      if (mq.matches) return;
      timer = window.setInterval(
        () => setIndex((i) => (i + 1) % slides.length),
        HOLD_MS,
      );
    };
    sync();
    mq.addEventListener("change", sync);

    return () => {
      window.clearInterval(timer);
      mq.removeEventListener("change", sync);
    };
  }, [loadRest, multi, autoPlay, slides.length]);

  const go = useCallback(
    (step: number) => {
      setAutoPlay(false);
      // 使用者可能在 idle callback 之前就按了左右，那時第 2 張還沒掛載。
      // 這裡補一次，否則會按了沒反應
      setLoadRest(true);
      setIndex((i) => (i + step + slides.length) % slides.length);
    },
    [slides.length],
  );

  return (
    <>
      {slides.map((slide, i) => {
        if (i > 0 && !loadRest) return null;
        const visible = i === index;
        return (
          // 遮罩跟照片包在同一層一起淡入淡出。若把遮罩留在外面當共用底，
          // 兩張照片就只能共用一組 alpha——見 HeroSlide.mask 的說明
          <div
            key={slide.src}
            className="absolute inset-0 transition-opacity ease-in-out motion-reduce:transition-none"
            style={{ opacity: visible ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
            // 同一時間只有一張看得到，把其餘的藏起來，免得螢幕閱讀器把每張 alt 都念一遍
            aria-hidden={!visible}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={i === 0}
              className="object-cover"
            />
            <div className={`absolute inset-0 ${slide.mask}`} />
          </div>
        );
      })}

      {multi && (
        // **錨在 section 頂端，不是底端**。這個 hero 是 `min-h-[100svh]`，但它
        // 從 y≈101 才開始（sticky header 65px＋其上的條帶），所以 section 最下面
        // 約 101px 永遠落在摺線之下——`bottom-6` 實測在 375×812 會把按鈕放到
        // y=845，整組看不到。從頂端量則與視窗高度、內容高度都無關。
        //
        // 靠右也是刻意的：文字區是 max-w-2xl 靠左，左側與正中都會壓到 tagline
        // 與內文；右側同時是遮罩最淡、照片露最多的地方，按鈕不會蓋掉重點
        <div className="absolute top-6 md:top-8 right-4 sm:right-6 lg:right-8 z-20 flex gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={labels.prev}
            className={CONTROL_CLASS}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={labels.next}
            className={CONTROL_CLASS}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
