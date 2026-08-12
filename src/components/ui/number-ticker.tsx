"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValue, useSpring, useInView, useReducedMotion } from "motion/react";

interface NumberTickerProps {
  value: number;
  delay?: number;
  className?: string;
}

/**
 * 數字滾動進場。**spring 的參數不要動**（damping 50 / stiffness 100）：
 * 臨界阻尼是 20，50 屬於過阻尼——不回彈、尾巴指數趨近，也就是業主要的
 * 「最後數字慢慢往上加」。換成 easeOutCubic 之類的定時曲線尾巴會收得比較硬。
 *
 * **初始 render 一定是真值**，這點不能退讓。原本初值寫死 `useState(0)`，
 * 伺服器吐出的 HTML 是 `<span>0</span>+ 年製茶經驗`——爬蟲、AI 檢索、JS 失敗的
 * 訪客看到「0 年製茶經驗、0 家人、0m 海拔」，把品牌最強的資產講成 0。
 *
 * 於是動畫改成「要播才倒回 0」，由 `rolling` 這個 gate 控制：
 *   - 不播（reduced-motion／已在畫面內／隱藏）→ `display` 一路維持 `value`，
 *     spring 不訂閱，所以不會被拉回 0
 *   - 要播 → 先 `setDisplay(0)`，再等 `isInView` 起跑
 */
export default function NumberTicker({ value, delay = 0, className }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -50px 0px" });
  const reduceMotion = useReducedMotion();

  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 50, stiffness: 100 });

  const [display, setDisplay] = useState(value);
  const [rolling, setRolling] = useState(false);

  // 掛載後才決定要不要播。跑在 client，所以拿得到 window
  useEffect(() => {
    // JS 動畫吃不到 globals.css 把 --motion-* 收成 1ms 的那套，得自己判斷
    if (reduceMotion) return;
    const el = ref.current;
    if (!el) return;

    // `top <= innerHeight` 同時涵蓋兩種「不該倒回 0」的情況：
    //   1. 掛載時就在畫面內——倒回 0 會被看到 40 → 0 → 40 的閃跳
    //   2. `display:none`——BrandStats 有桌機與手機兩份 grid，任一時刻有一半是隱藏的，
    //      隱藏元素的 rect 全為 0 且 IntersectionObserver 永遠不報 intersecting，
    //      倒回 0 就會永遠停在 0（原本的寫法正是這樣，只是看不到所以沒人發現）
    if (el.getBoundingClientRect().top <= window.innerHeight) return;

    setDisplay(0);
    setRolling(true);
  }, [reduceMotion]);

  useEffect(() => {
    if (!rolling || !isInView) return;
    const timer = setTimeout(() => motionValue.set(value), delay * 1000);
    return () => clearTimeout(timer);
  }, [rolling, isInView, motionValue, value, delay]);

  // 不播就不訂閱：spring 停在 0，訂閱了會把真值改掉
  useEffect(() => {
    if (!rolling) return;
    return springValue.on("change", (v) => setDisplay(Math.round(v)));
  }, [rolling, springValue]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString()}
    </span>
  );
}
