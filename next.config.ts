import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const SUPABASE_HOST = "wrknatfejiexqlyywuzz.supabase.co";

// CSP 已移至 src/proxy.ts（middleware）以支援 nonce-based CSP
// 靜態 CSP 無法包含動態 nonce，因此改由 middleware 在每個請求動態生成

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: SUPABASE_HOST,
        pathname: "/storage/v1/object/public/**",
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
          // CSP 由 middleware 動態設定（nonce-based），此處不設定
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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-src 'none'; object-src 'none';",
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
export default withNextIntl(nextConfig);
