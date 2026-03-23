import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 隱藏 x-powered-by: Next.js 標頭，減少資訊洩漏
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
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
        ],
      },
    ];
  },
};

export default nextConfig;
