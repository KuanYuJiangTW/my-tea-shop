"use client";

import { useEffect, useRef, useState } from "react";

interface NumberTickerProps {
  value: number;
  delay?: number;
  className?: string;
}

/** 進場滾動時長。原本是 spring（damping 50 / stiffness 100），觀感相近 */
const DURATION_MS = 1200;

/**
 * 數字滾動進場。**初始 render 一定是真值**，這點不能退讓。
 *
 * 原本初值寫死 `useState(0)`，於是伺服器吐出的 HTML 是
 * `<span>0</span>+ 年製茶經驗`——爬蟲、AI 檢索、JS 失敗的訪客看到的是
 * 「0 年製茶經驗、0 家人、0m 海拔」，把品牌最強的資產講成 0。
 *
 * 三個修正：
 *
 * 1. `display` 初值是 `value`。首次 render（伺服器與 client 首幀都是它）就是真值，
 *    沒有 hydration 落差，JS 掛掉也還是看得到 40。
 * 2. 只有**掛載時這個數字確實還在視窗下方**才倒回 0 播動畫；已經在畫面內就
 *    保持真值不動，否則會看到 40 → 0 → 40 的閃跳。實務上這四個數字都在品牌
 *    故事段（桌機 y≈3900），幾乎必然走動畫那條路，觀感與原本一致。
 * 3. `prefers-reduced-motion` 不播。`globals.css` 把 `--motion-*` 收成 1ms 的那套
 *    只管得到 CSS transition，JS 動畫得自己判斷。
 *
 * **為什麼不用 `motion/react` 的 `useInView` + `useSpring`**：原本就是那個組合，
 * 但要「先判斷位置再決定是否播」就得讓三個 effect 互相等待（animating × isInView
 * × spring 訂閱），實測捲進畫面後 `useInView` 沒把動畫接起來，數字卡在 0。
 * 換成直接持有 IntersectionObserver 與 rAF，狀態機只有一條路，也能在瀏覽器逐步驗證。
 */
export default function NumberTicker({ value, delay = 0, className }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 尊重系統設定：直接維持真值
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // 掛載時就看得到 → 不倒回 0，避免閃跳
    if (el.getBoundingClientRect().top <= window.innerHeight) return;

    setDisplay(0);

    let raf = 0;
    let startedAt = 0;
    const step = (now: number) => {
      if (!startedAt) startedAt = now;
      const elapsed = now - startedAt - delay * 1000;
      if (elapsed < 0) {
        raf = requestAnimationFrame(step);
        return;
      }
      const p = Math.min(1, elapsed / DURATION_MS);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic：末段收得慢，接近 spring 的手感
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect(); // 只播一次
        raf = requestAnimationFrame(step);
      },
      { rootMargin: "0px 0px -50px 0px" },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, delay]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString()}
    </span>
  );
}
