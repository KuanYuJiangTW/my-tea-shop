## Why

AI 搜尋引用的是「回答問題的內容」而非商品頁（ChatGPT 實測截圖佐證：推薦清單全來自第三方文章）。「想學」型搜尋（怎麼泡茶、金萱奶香、冷泡茶）量體遠大於「想買」型，且競爭低；40 年茶農的第一手經驗是 E-E-A-T 上別人抄不走的優勢。`/alishan-tea` 已驗證問答式主題頁格式有效，但每篇都要改程式碼無法規模化——需要讓小江能在 Sanity Studio 自行發文的知識文章系統。時效壓力：萬鷺朝鳳攻略需在 8 月季節開始前上線收錄。

## What Changes

- Sanity 新增 `article` schema：標題/slug/雙語內文（PortableText）/摘要/封面圖/發布日期/關鍵字/關聯產品與體驗
- 新增 `/tea-guide` 文章列表頁與 `/tea-guide/[slug]` 文章頁（含 `/en`）：Article JSON-LD（author/publisher 連結 `/#business`）、BreadcrumbList、langAlternates、文末 CTA 連到相關產品/體驗頁
- sitemap 動態納入文章（zh + en）；llms.txt 加文章區；Footer 導覽加「茶知識」；Sanity webhook revalidate 涵蓋 `/tea-guide` 路徑
- 首批六篇文章（起草→小江審核事實→發布）：①高山茶怎麼泡 ②金萱奶香真相 ③蜜香紅茶與小綠葉蟬 ④冷泡茶做法 ⑤第一次買茶挑選指南 ⑥萬鷺朝鳳完整攻略（最優先，8 月前上線）

## Capabilities

### New Capabilities

- `tea-knowledge-articles`: 文章系統——Sanity schema 欄位、路由與雙語行為、Article JSON-LD 要求、sitemap/llms.txt 同步、快取更新（webhook）、內容真實性原則（茶學事實需查證、茶園細節由小江把關、不虛構）

### Modified Capabilities

（無）

## Impact

- 程式碼：`src/sanity/schemas/article.ts`（新）、queries、`src/app/tea-guide/`（新）、`sitemap.ts`、`Footer.tsx`、`messages/`、`api/sanity-webhook`
- 內容流程：每篇文章 = 起草（AI）→ 事實審核（小江）→ Studio 發布；持續節奏每月 1–2 篇
- 風險：低（純內容系統）；內容正確性為主要品質風險，以審核流程控管
