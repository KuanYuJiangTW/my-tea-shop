// 自訂 route handler 取代 Next 的 robots.ts metadata 格式：
// 因需輸出 Content-Signal 行（contentsignals.org，正面宣告開放 AI 檢索/訓練），
// MetadataRoute.Robots 型別不支援自訂指令行。
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";

// robots.txt 只封鎖「根本不該被抓取」的路徑，也就是沒有 HTML 可看的 API。
//
// **不要把想排除索引的頁面放進來**（2026-08-17 修）：原本這裡還列了 /cart、
// /checkout、/order/、/admin、/auth/、/account，而其中好幾頁同時也帶了
// `noindex` meta。這是自相矛盾的——被 robots.txt 封鎖的頁面 Google 根本抓不到，
// 也就永遠讀不到那個 noindex，真正生效的只有封鎖；一旦這些網址在站外被連到，
// Google 仍可能只憑網址把它列進索引。可靠的排除方式是「允許抓取 + noindex」。
//
// 另一個實際踩到的坑：這份清單沒有 /en 版本，所以 /en/cart、/en/checkout
// 反而是可抓取的，兩個語言的行為不一致。改走 noindex 之後不需要逐語言維護，
// 因為 meta 是頁面自己帶的，rewrite 後兩種前綴都會輸出。
//
// 排除索引一律改由各頁 metadata 的 `robots: { index: false }` 負責。
const DISALLOW = ["/api/"];

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
