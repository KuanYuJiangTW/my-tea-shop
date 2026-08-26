"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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
 * 桌機（md 以上）的整組：右下角，箭頭夾著計數器。
 *
 * 右邊距是 6.5rem 而不是版面的 lg:px-8，因為**「茶葉小幫手」的浮動鈕就釘在
 * 那裡**：它是 `position: fixed`，實測 1440×900 佔右側 31–87px、底部 24–80px，
 * 跟 `right-8 bottom-10` 的控制項正面重疊，會蓋掉「下一張」。
 * 6.5rem 讓整組停在浮動鈕左邊，留 32px 間隙。
 */
const GROUP_CLASS =
  "absolute z-20 items-center gap-1 right-[6.5rem] " +
  // 距離量的是**視窗底**不是 section 底，理由見 --hero-chrome 的說明
  "bottom-[calc(var(--hero-chrome,101px)+2.5rem)]";

/**
 * 手機（md 以下）的兩側箭頭：**沒有圓框、沒有底**，只有箭頭本體。
 * 命中區 36×48（過 WCAG 2.5.8 的 24×24），視覺上只有 20px 的箭頭
 * ——パレスホテル東京 是 18×40，同一個量級。
 */
const SIDE_BUTTON_CLASS =
  "md:hidden absolute top-1/2 -translate-y-1/2 z-20 " +
  "flex h-12 w-9 items-center justify-center text-tea-cream " +
  // 緊貼筆畫的深色描邊，作用與桌機圓環的雙描邊相同：邊界不跟照片借對比
  "[&>svg]:drop-shadow-[0_0_2px_rgba(61,74,66,0.95)] " +
  "transition-opacity duration-base ease-standard active:opacity-60 " +
  "focus-visible:outline-none focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-tea-cream";

/** 手機的計數器：箭頭移到兩側之後它落單了，改放下方置中（星野的位置） */
const MOBILE_COUNTER_CLASS =
  "md:hidden absolute z-20 left-1/2 -translate-x-1/2 " +
  "bottom-[calc(var(--hero-chrome,101px)+2rem)] " +
  "text-caption tabular-nums tracking-[0.15em] text-tea-cream " +
  "drop-shadow-[0_1px_3px_rgba(61,74,66,0.9)]";

/**
 * 圓圈**底是透明的**、hover 才填成米白（2026-08-26 業主指定，對齊
 * hoshinoresorts.com/ch/ 的作法）。
 *
 * 這與「不要跟照片借對比」直接衝突，數字要留著：右下角實測三張照片，
 * 米白邊框對背景的對比是 **picking2 1.39 ❌／wilting4 1.67 ❌／tea-ceremony 2.64 ❌**
 * ——2026-08-26 之前正是因為按鈕在第二張上實機看不見才加的深底。
 * 底部漸層也救不動：帶高 260px、底邊壓到 0.65，picking2 仍只有 2.95。
 *
 * 解法是**雙描邊**：米白圓環外面再加一圈 1px 的 tea-text 陰影（0.55）。
 * 圓圈本身仍然透明、照片照樣透出來，但 1.4.11 看的是「元件邊界與相鄰色」的對比，
 * 而圓環與它自己那圈深色描邊的對比**不受背景影響**——實測（同樣取最差像素）：
 *   picking2 3.31 ✅　wilting4 3.70 ✅　tea-ceremony 4.78 ✅
 * 換句話說按鈕的可辨識性從「看照片臉色」變成「自己保證」，
 * 這正是原本加深底要解決的問題，只是改用不遮住照片的方式解。
 *
 * **剩下的缺口是計數器**：它是文字，門檻 4.5，透明底下沒有任何底色能保證，
 * 目前只靠 drop-shadow（參考站也是這樣）。真要讓它數值合格得加回深底
 * （實測 α=0.75 → 4.87／5.17／6.74）。業主已知悉。
 */
const BUTTON_CLASS =
  "flex h-10 w-10 items-center justify-center rounded-full " +
  "border border-tea-cream/80 text-tea-cream " +
  // 外圈那 1px 深色是「雙描邊」的另一半——圓環壓在亮天空上時靠它撐住邊界
  "shadow-[0_0_0_1px_rgba(61,74,66,0.55),0_2px_10px_rgba(61,74,66,0.5)] " +
  "[&>svg]:drop-shadow-[0_1px_2px_rgba(61,74,66,0.85)] " +
  "transition-colors duration-base ease-standard " +
  // hover 填成米白、箭頭轉深色——參考站就是這個行為
  "hover:bg-tea-cream hover:text-tea-text " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tea-cream " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-tea-text";

/**
 * 每張的停留時間。演進：8000ms → 3800ms → 5000ms。
 *
 * 3800ms 是**實測 hoshinoresorts.com/ch/ 得到的**：用 MutationObserver 盯它的
 * `.controls__count__in`（`01/03` 那顆計數器）記錄 11 次切換，間隔 3811–3828ms。
 * 但那站的 hero 只有 logo 與一行 SINCE 1914，照片本身就是全部內容；
 * 我們的 hero 疊了 h1、tagline、三行敘述與兩顆 CTA，讀完要更久——
 * 業主看實機後要求放慢，改 5000ms。
 *
 * 注意實際「靜止時間」是 HOLD_MS - FADE_MS：3800 時只有 2600ms，
 * 5000 時是 3800ms（多 46%）。調這個值時要連 FADE_MS 一起想。
 */
const HOLD_MS = 5000;
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
  /**
   * **按過左右不會停止自動輪播**（2026-08-26 依業主指定，對齊 hoshinoresorts.com）。
   * 舊版是「按過就永久停」，那同時也是本元件對 WCAG 2.2.2（超過 5 秒的自動移動
   * 內容必須可暫停）的交代。改成會繼續輪播之後，暫停機制只剩**鍵盤 focus**：
   * tab 到箭頭就停，才不會邊操作邊被系統換掉。
   *
   * **刻意不做 hover 暫停**：滑鼠點完箭頭游標會停在按鈕上，hover 暫停等於
   * 「點一下就不動了」，那正是這次要改掉的行為。同理 focus 也只認 `:focus-visible`。
   *
   * 注意：這比「一顆明確的暫停鈕」弱，鍵盤以外的使用者沒有暫停手段。
   * 真要完全符合 2.2.2 的字面要求應該加一顆播放／暫停鈕；目前的取捨是
   * 外觀與行為對齊業主指定的參考站優先，另有 prefers-reduced-motion 全停兜底。
   */
  const [paused, setPaused] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);

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

  /**
   * 控制項錨的是**視窗底**，不是 section 底。
   *
   * hero 是 `min-h-[100svh]`，但它從 y=101 才開始（公告條 36＋sticky header 65），
   * 所以 section 底邊永遠落在摺線下方**恰好 101px**——直接寫 `bottom-8` 實測會把
   * 整組推到看不見的地方（2026-08-26 之前正是為了這個才把控制項放在 section 頂端）。
   *
   * 這裡量 section 距文件頂端的距離，寫進 `--hero-chrome`，CSS 再加上要的間距。
   * **不用 state**：`setState` 在 effect 裡會踩到 `react-hooks/set-state-in-effect`
   * （全 repo 唯一那條 lint error 的成因，見 AnnouncementBar 的註解），
   * 直接寫 CSS 變數沒有這個問題，也少一次 render。
   * 觀察 `document.body` 是為了接住**公告條被關掉**（body 高度變了）與視窗縮放；
   * 沒有 JS 時 fallback 101px 就是最常見的情況，SSR 首屏不會跳。
   */
  useEffect(() => {
    const node = controlsRef.current;
    const section = node?.closest("section");
    if (!node || !section) return;
    const apply = () => {
      const top = Math.max(0, Math.round(section.getBoundingClientRect().top + window.scrollY));
      node.style.setProperty("--hero-chrome", `${top}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [multi]);

  useEffect(() => {
    // **計時器必須等後續圖掛載後才開始**：若 index 先跳到 1 而那張還沒進 DOM，
    // 第 0 張已經被設成 opacity 0、第 1 張又不存在，首屏會整片變黑
    if (!loadRest || !multi || paused) return;

    // prefers-reduced-motion 的使用者連自動淡入都不該有；他仍然可以按左右自己看
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    const sync = () => {
      window.clearTimeout(timer);
      if (mq.matches) return;
      // 用 setTimeout 而不是 setInterval，且 effect 依賴 index：
      // 手動按左右之後計時器會**重新開始**，新的那張才拿得到完整的停留時間。
      // setInterval 會讓它在剩下的殘秒就被換掉。
      timer = window.setTimeout(() => setIndex((i) => (i + 1) % slides.length), HOLD_MS);
    };
    sync();
    mq.addEventListener("change", sync);

    return () => {
      window.clearTimeout(timer);
      mq.removeEventListener("change", sync);
    };
  }, [loadRest, multi, paused, index, slides.length]);

  const go = useCallback(
    (step: number) => {
      // 使用者可能在 idle callback 之前就按了左右，那時第 2 張還沒掛載。
      // 這裡補一次，否則會按了沒反應
      setLoadRest(true);
      setIndex((i) => (i + step + slides.length) % slides.length);
    },
    [slides.length],
  );

  const pad = (n: number) => String(n).padStart(2, "0");

  /**
   * **只認鍵盤 focus，不認滑鼠**：滑鼠點完箭頭游標會停在按鈕上，
   * 若把 hover 或一般 focus 當成暫停，等於「點一下就不動了」——
   * 那正是 2026-08-26 改掉的舊行為。`:focus-visible` 只在鍵盤操作時成立。
   */
  const pauseOnKeyboard = (e: React.FocusEvent) => {
    if (e.target instanceof HTMLElement && e.target.matches(":focus-visible")) {
      setPaused(true);
    }
  };

  return (
    <>
      {slides.map((slide, i) => {
        if (i > 0 && !loadRest) return null;
        const visible = i === index;
        return (
          // 遮罩跟照片包在同一層一起淡入淡出。若把遮罩留在外面當共用底，
          // 各張照片就只能共用一組 alpha——見 HeroSlide.mask 的說明
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
        <div
          ref={controlsRef}
          /* display:contents——這層只用來掛 --hero-chrome 與 focus 事件，
             不能佔 section（flex items-center）的版面。變數照樣往下繼承，
             絕對定位的子元素照樣以 section 為定位基準。 */
          className="contents"
          onFocus={pauseOnKeyboard}
          onBlur={() => setPaused(false)}
        >
          {/* ── 手機：箭頭貼兩側，計數器單獨留在下方置中 ──
              業主指定，參考 パレスホテル東京：它手機版就是把箭頭放兩側，
              而且是**光禿禿的箭頭**（實測 18×40、距邊 12px，沒有圓框、沒有底）。
              星野集團則是底部置中的圓環組，京都三井乾脆沒有手動控制——
              三家做法都不同，所以這題沒有「日式標準答案」，是取捨。

              **側邊箭頭的成立條件是「小而不搶」**：這裡刻意不套圓環與陰影底，
              只留箭頭本體加一圈緊貼的深色 drop-shadow 當描邊。放大成圓框
              會變成兩顆懸在照片中央的 UI，那正是 Palace 避開的東西。

              對比實測（手機均勻遮罩下，箭頭區最差像素對米白）：
                picking2 左 3.73 ✅ 右 3.25 ✅
                wilting4 左 3.23 ✅ 右 3.18 ✅
                tea-ceremony 左 **2.80 ❌** 右 3.55 ✅
              第三張左側差 0.2 沒過，靠 drop-shadow 的深色描邊補——與桌機
              圓環的雙描邊是同一招，只是描在箭頭本身而不是圓框上。 */}
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={labels.prev}
            className={`${SIDE_BUTTON_CLASS} left-0`}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={labels.next}
            className={`${SIDE_BUTTON_CLASS} right-0`}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <span aria-hidden="true" className={MOBILE_COUNTER_CLASS}>
            {pad(index + 1)}/{pad(slides.length)}
          </span>

          {/* ── 桌機：右下角整組，維持原樣 ── */}
          <div className={`${GROUP_CLASS} hidden md:flex`}>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={labels.prev}
              className={BUTTON_CLASS}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* 計數器對螢幕閱讀器沒有增益——目前這張的 alt 已經在唸了，
                再報一次「01/03」只是噪音，所以整顆藏起來 */}
            <span
              aria-hidden="true"
              className="px-2 text-label tabular-nums tracking-[0.15em] text-tea-cream drop-shadow-[0_1px_3px_rgba(61,74,66,0.9)]"
            >
              {pad(index + 1)}/{pad(slides.length)}
            </span>

            <button
              type="button"
              onClick={() => go(1)}
              aria-label={labels.next}
              className={BUTTON_CLASS}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
