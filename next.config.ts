import type { NextConfig } from "next";

const SUPABASE_HOST = "wrknatfejiexqlyywuzz.supabase.co";

// Content-Security-Policy
// 注意：Next.js App Router 的 hydration inline script 需要 'unsafe-inline'
// 若未來要移除 'unsafe-inline'，需改用 nonce-based CSP（需搭配 middleware）
const CSP = [
  "default-src 'self'",
  // Next.js hydration + Google Analytics inline script 需要 unsafe-inline
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com`,
  // Google Fonts CSS + unsafe-inline（CSS-in-JS）
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // 圖片：Supabase Storage 及 data URI（Next.js Image blur placeholder）
  `img-src 'self' data: blob: https://${SUPABASE_HOST}`,
  // Google Fonts 字體檔案
  "font-src 'self' data: https://fonts.gstatic.com",
  // API 連線：Supabase + Google Analytics + ECPay
  `connect-src 'self' https://${SUPABASE_HOST} https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://payment.ecpay.com.tw https://logistics.ecpay.com.tw`,
  // ECPay 結帳頁面（form POST 後的跳轉）
  "frame-src https://payment.ecpay.com.tw https://logistics.ecpay.com.tw",
  // 禁止任何網站將本站嵌入 iframe（與 X-Frame-Options: DENY 雙重保護）
  "frame-ancestors 'none'",
  // 禁止 Flash / plugins
  "object-src 'none'",
  // 防止 base tag 注入攻擊
  "base-uri 'self'",
  // form 只能提交到本站或 ECPay
  "form-action 'self' https://payment.ecpay.com.tw https://logistics.ecpay.com.tw",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
  },
  // 隱藏 x-powered-by: Next.js 標頭，減少資訊洩漏
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // XSS、資源注入防護
          { key: "Content-Security-Policy", value: CSP },
          // 防止頁面被嵌入 iframe（點擊劫持攻擊）
          { key: "X-Frame-Options", value: "DENY" },
          // 防止瀏覽器自動偵測 MIME 類型（MIME sniffing 攻擊）
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 控制 Referer 標頭，避免洩漏完整 URL 給第三方
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 停用不必要的瀏覽器功能（攝影機、麥克風、地理位置）
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // 強制瀏覽器一年內只用 HTTPS 連線，防止降級攻擊
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
      {
        // Studio 需要 unsafe-eval，排在後面以覆蓋上方的通用 CSP
        source: "/studio/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-src 'none'; object-src 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
