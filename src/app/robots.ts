import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";

// 不希望被索引的路徑（購物流程、API、後台、會員）
const DISALLOW = ["/cart", "/checkout", "/order/", "/api/", "/admin", "/auth/", "/account"];

// 明確歡迎的 AI 檢索與訓練爬蟲。實際放行/攔截由 Cloudflare AI Crawl Control 控制，
// 這裡的 Allow 是宣示性的，確保 robots.txt 不成為 AI 搜尋收錄的阻礙。
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "meta-externalagent",
  "Meta-ExternalFetcher",
  "Amazonbot",
  "DuckAssistBot",
  "MistralAI-User",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
      {
        userAgent: AI_CRAWLERS,
        allow: "/",
        disallow: DISALLOW,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
