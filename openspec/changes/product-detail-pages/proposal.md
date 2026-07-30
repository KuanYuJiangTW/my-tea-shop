## Why

五款茶葉全部擠在 `/products` 列表頁，AI 搜尋回答「阿里山金萱哪裡買」「蜜香紅茶 推薦」時沒有可精準引用的頁面；結構化資料中每個 Product 的 url 只能指向列表頁，無法取得 Google 商品富摘要。Sanity 的 product schema（slug 對應 Supabase、介紹、相簿）早已設計好但從未使用。此外，這是 agentic-commerce-mcp 的前置：AI 助理推薦單一產品時需要可直達的產品頁與結帳入口。

## What Changes

- 新增 `/products/[slug]`（含 `/en` 變體）產品詳細頁：Supabase 取價格庫存 + Sanity 取介紹/相簿，含加入購物車
- 每頁完整 Product JSON-LD（offers、availability 依實際庫存、aggregateRating 若有商品評價）+ BreadcrumbList，url 指向自身
- 產品列表頁卡片連結到詳細頁；`generateStaticParams` + ISR
- metadata：langAlternates hreflang、OG 圖用產品照
- sitemap.ts 納入產品頁（zh + en）；llms.txt 產品區改列各產品頁連結
- 各產品的介紹內容補進 Sanity（與小江協作，缺內容的產品先用資料庫欄位 fallback）

## Capabilities

### New Capabilities

- `product-detail-page`: 產品詳細頁的路由、資料來源優先序（Supabase 價格庫存為準、Sanity 內容為輔、fallback 行為）、JSON-LD 輸出、雙語與 SEO 要求

### Modified Capabilities

（無——sitemap/llms.txt 條目增加屬 `ai-search-seo` change 內 seo-i18n-discoverability / ai-crawler-access 的實作延伸，該 change 尚未歸檔，於本 change tasks 中一併更新檔案，不另開 delta）

## Impact

- 程式碼：新增 `src/app/products/[slug]/`；修改 `ProductsClient.tsx`（卡片連結）、`sitemap.ts`、`public/llms.txt`、Sanity queries
- 資料：讀取 Supabase `products`（既有）與 Sanity `product` documents（既有 schema，內容待補）
- 風險：低——純新增頁面，不動結帳與庫存邏輯；加入購物車沿用既有 CartContext
