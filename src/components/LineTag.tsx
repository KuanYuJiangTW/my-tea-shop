"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    _lt?: (...args: unknown[]) => void;
    _ltq?: unknown[];
  }
}

const TAG_ID = process.env.NEXT_PUBLIC_LINE_TAG_ID;

/**
 * LINE Tag（廣告成效追蹤）。用途是把「加了 LINE 好友的人後來有沒有下單」串起來。
 *
 * 未設定 NEXT_PUBLIC_LINE_TAG_ID 就整個不渲染——與 GoogleAnalytics 同一套處理，
 * 本機與 Preview 不會誤送資料汙染正式報表。
 *
 * CSP：基準碼會動態插入 <script src="https://d.line-scdn.net/...">，成效再回報到
 * tr.line.me。這兩個網域已加進 `src/proxy.ts` 的 buildCSP()；漏了會被靜默擋掉
 * （console 有 CSP 錯誤，但畫面完全正常），所以改 CSP 時別把它們刪了。
 */
export default function LineTag({ nonce }: { nonce?: string }) {
  const pathname = usePathname();
  // 基準碼載入時自己會送一次 pv，首次 render 不能再送，否則首頁每次都算兩次
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!TAG_ID || typeof window._lt !== "function") return;
    // App Router 的路由切換不會重跑基準碼，換頁的 pv 要自己補送
    window._lt("send", "pv", [TAG_ID]);
  }, [pathname]);

  if (!TAG_ID) return null;

  return (
    <Script id="line-tag" strategy="afterInteractive" nonce={nonce}>
      {`
        (function(g,d,o){
          g._ltq=g._ltq||[];g._lt=g._lt||function(){g._ltq.push(arguments)};
          var s=d.createElement('script');s.async=1;
          s.src=o||'https://d.line-scdn.net/n/line_tag/public/release/v1/lt.js';
          var t=d.getElementsByTagName('script')[0];t.parentNode.insertBefore(s,t);
        })(window, document);
        _lt('init', { customerType: 'lap', tagId: '${TAG_ID}' });
        _lt('send', 'pv', ['${TAG_ID}']);
      `}
    </Script>
  );
}
