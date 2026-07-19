// 自訂 route handler 取代 Next 的 robots.ts metadata 格式：
// 因需輸出 Content-Signal 行（contentsignals.org，正面宣告開放 AI 檢索/訓練），
// MetadataRoute.Robots 型別不支援自訂指令行。
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";

// 不希望被索引的路徑（購物流程、API、後台、會員）
const DISALLOW = ["/cart", "/checkout", "/order/", "/api/", "/admin", "/auth/", "/account"];

// 正面宣告：允許搜尋索引、AI 回答引用、AI 訓練（見 openspec design 決策 7）
const CONTENT_SIGNAL = "Content-Signal: search=yes, ai-input=yes, ai-train=yes";

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

export const dynamic = "force-static";

export function GET(): Response {
  const disallowLines = DISALLOW.map(p => `Disallow: ${p}`);

  const lines = [
    "User-Agent: *",
    CONTENT_SIGNAL,
    "Allow: /",
    ...disallowLines,
    "",
    // robots 規範中最特定的 User-Agent 群組獨占適用，
    // 故 AI 群組需完整重複 Content-Signal 與 Disallow 清單
    ...AI_CRAWLERS.map(ua => `User-Agent: ${ua}`),
    CONTENT_SIGNAL,
    "Allow: /",
    ...disallowLines,
    "",
    `Sitemap: ${baseUrl}/sitemap.xml`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain" },
  });
}
