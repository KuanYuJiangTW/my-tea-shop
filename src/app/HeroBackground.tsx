"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DISMISS_EVENT } from "@/components/AnnouncementBar";

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
const GROUP_CLASS =
  "absolute z-20 flex items-center gap-0.5 md:gap-1 " +
  // 手機置中、桌機靠右——與 hoshinoresorts.com/ch/ 的擺法一致。
  //
  // 桌機的右邊距是 6.5rem 而不是版面的 lg:px-8，因為**「茶葉小幫手」的浮動鈕
  // 就釘在那裡**：它是 `position: fixed`，實測 1440×900 佔右側 31–87px、
  // 底部 24–80px，跟 `right-8 bottom-10` 的控制項正面重疊，會蓋掉「下一張」。
  // 104px 讓整組停在浮動鈕左邊，留 17px 間隙。手機是置中，不會撞到。
  "left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-[6.5rem] " +
  // 距離量的是**視窗底**不是 section 底，理由見 --hero-chrome 的說明
  "bottom-[calc(var(--hero-chrome,101px)+1rem)] md:bottom-[calc(var(--hero-chrome,101px)+2.5rem)]";

const BUTTON_CLASS =
  "flex h-7 w-7 md:h-10 md:w-10 items-center justify-center rounded-full " +
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
   * **三個觸發來源，缺一不可**：
   *   ResizeObserver(document.body)  一般的版面變動
   *   window resize                  轉向、瀏覽器工具列收合
   *   公告條的 dismiss 事件           2026-08-27 補的，見下
   *
   * 為什麼不能只靠 ResizeObserver：它的回呼是在**繪製步驟**裡送達的。
   * 公告條被關掉時 section 頂端從 101 變 65，若那一刻回呼沒送到，變數會停在
   * 101px，控制項就比預期高 36px——業主回報的「輪播鍵太靠上面」正是這個，
   * 2026-08-27 在 Browser pane 實測重現：sectionTop 已變 65、--hero-chrome
   * 仍是 101px、控制項距視窗底 52px（預期 16px）。
   * 直接聽 dismiss 事件是同步的，不吃繪製步驟。
   *
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
    // dismiss 事件是**同步**派發的，此刻公告條還沒被 React 移除，
    // 直接量會量到舊版面（實測：仍是 101px）。丟進 macrotask 等 re-render 完成再量。
    // 不用 requestAnimationFrame——它綁在繪製步驟上，分頁沒在合成畫面時不會執行。
    let deferred: number | undefined;
    const applyLater = () => {
      window.clearTimeout(deferred);
      deferred = window.setTimeout(apply, 0);
    };
    const ro = new ResizeObserver(apply);
    ro.observe(document.body);
    window.addEventListener("resize", apply);
    window.addEventListener(DISMISS_EVENT, applyLater);
    return () => {
      ro.disconnect();
      window.clearTimeout(deferred);
      window.removeEventListener("resize", apply);
      window.removeEventListener(DISMISS_EVENT, applyLater);
    };
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

  /**
   * 觸控滑動換圖。
   *
   * 手機的自然動作是滑，不是點兩顆 28px 的箭頭——把箭頭縮到參考站的量級之後
   * 更是如此。加了滑動，箭頭才從「唯一入口」降級成「提示這裡可以滑」，
   * 小尺寸才站得住腳。**縮小按鈕與加滑動是同一件事的兩半**，只做前一半
   * 會讓可用性倒退。
   *
   * 幾個刻意的取捨：
   * - **只認 touch／pen，不認 mouse**：桌機拖曳是選字，攔下來會很煩。
   * - 事件掛在 section 上而不是自己開一層覆蓋層：文案區是 relative z-10，
   *   覆蓋層只能墊在它下面，滑在字上就不會有反應。掛 section 全區都收得到。
   * - 門檻 40px 且水平位移要大於垂直的 1.5 倍，逾時 800ms 作廢——
   *   避免把「想往下捲」誤判成換圖。
   * - 認定成滑動之後，用 capture 階段吃掉緊接而來的 click：手指從 CTA 上
   *   起手、滑一段再放開，瀏覽器仍會補一個 click，不擋就會誤觸連結。
   * - section 要配 touch-pan-y（見 page.tsx）：告訴瀏覽器垂直捲動歸它、
   *   水平歸我們。沒有那行的話，捲動一開始就會收到 pointercancel。
   */
  useEffect(() => {
    const section = controlsRef.current?.closest("section");
    if (!section || !multi) return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let tracking = false;
    let swiped = false;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      tracking = true;
      swiped = false;
      startX = e.clientX;
      startY = e.clientY;
      startT = e.timeStamp;
    };
    const onUp = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (e.timeStamp - startT > 800) return;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      swiped = true;
      // 往左滑 = 看下一張，跟原生輪播的方向一致
      go(dx < 0 ? 1 : -1);
    };
    const onCancel = () => {
      tracking = false;
    };
    const onClickCapture = (e: Event) => {
      if (!swiped) return;
      swiped = false;
      e.preventDefault();
      e.stopPropagation();
    };

    section.addEventListener("pointerdown", onDown);
    section.addEventListener("pointerup", onUp);
    section.addEventListener("pointercancel", onCancel);
    section.addEventListener("click", onClickCapture, true);
    return () => {
      section.removeEventListener("pointerdown", onDown);
      section.removeEventListener("pointerup", onUp);
      section.removeEventListener("pointercancel", onCancel);
      section.removeEventListener("click", onClickCapture, true);
    };
  }, [multi, go]);

  const pad = (n: number) => String(n).padStart(2, "0");

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
          className={GROUP_CLASS}
          // **只認鍵盤 focus，不認滑鼠**：滑鼠點完箭頭游標會停在按鈕上，
          // 若把 hover 或一般 focus 當成暫停，等於「點一下就不動了」——
          // 那正是這次要改掉的舊行為。`:focus-visible` 只在鍵盤操作時成立。
          onFocus={(e) => {
            if (e.target instanceof HTMLElement && e.target.matches(":focus-visible")) {
              setPaused(true);
            }
          }}
          onBlur={() => setPaused(false)}
        >
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={labels.prev}
            className={BUTTON_CLASS}
          >
            <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
          </button>

          {/* 計數器對螢幕閱讀器沒有增益——目前這張的 alt 已經在唸了，
              再報一次「01/03」只是噪音，所以整顆藏起來 */}
          <span
            aria-hidden="true"
            className="px-1 md:px-2 text-caption md:text-label tabular-nums tracking-[0.15em] text-tea-cream drop-shadow-[0_1px_3px_rgba(61,74,66,0.9)]"
          >
            {pad(index + 1)}/{pad(slides.length)}
          </span>

          <button
            type="button"
            onClick={() => go(1)}
            aria-label={labels.next}
            className={BUTTON_CLASS}
          >
            <ChevronRight className="h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
