# Backlog — 想做、但還沒排程的事

## 這個檔為什麼存在

OpenSpec 的 `changes/` 只有兩種狀態：**在做**、**做完歸檔**。
但真實情況有第三種——**「立案了、想做、可是還沒排到」**。

沒有這個位置時，構想只能假裝成 change 賴在 `changes/` 裡。
2026-08-31 盤點時，`changes/` 有 10 個項目，其中 3 個從 07-27 起就沒動過——
它們不是停滯的開發工作，只是**沒有地方去的想法**。那讓整個 `changes/` 失去可信度：
你不再能靠「它在 changes 裡」判斷任何事。

**規則**：
- 提案寫完但三十天內不打算開工 → 搬到 `openspec/backlog/<name>/`，在本檔登記一行
- 要開工時 → 搬回 `openspec/changes/<name>/`，補 `tasks.md`，從本檔移除
- 決定不做 → 從本檔刪除該條，並寫明放棄理由（`git` 留著歷史，不必留屍體）

---

## 目前的 backlog

### 1. `product-detail-pages` — 產品獨立頁 `/products/[slug]`

**提案**：`openspec/backlog/product-detail-pages/proposal.md`（2026-07-27 立案，未開工）

五款茶葉目前全擠在 `/products` 列表頁。AI 搜尋回答「阿里山金萱哪裡買」時**沒有可精準引用的頁面**，
結構化資料裡每個 Product 的 `url` 只能指向列表頁，拿不到 Google 商品富摘要。
Sanity 的 product schema（slug、介紹、相簿）早就設計好但從未使用。

**2026-08-31 查證**：`/products/[slug]` 確實不存在，線上實測回 **404**。真的沒開工。

**為什麼值得做**：同日的 AI 引用實測顯示，三個目標查詢都沒有出現 taiwantea.store，
競品全是經營多年的觀光茶園頁與套裝行程頁。**產品獨立頁是補收錄的主要槓桿之一。**
它同時是 `agentic-commerce-mcp` 的前置（AI 助理推薦單一產品時需要可直達的頁面）。

**開工訊號**：想認真補 AI 搜尋收錄時，這個排第一。

---

### 2. `agentic-commerce-mcp` — 讓 AI 助理直接查詢與預約

**提案**：`openspec/backlog/agentic-commerce-mcp/proposal.md`（2026-07-27 立案，未開工）

小江 2026-07-19 的終極目標：使用者的 AI 助理能直接連上網站查體驗空位與茶葉品項，並完成預約或購買。
提案已把階段策略想清楚：

- **Phase A 查詢（唯讀）**：`list_experiences`、`get_availability`、`list_products`——完全自主可控
- **Phase B 交棒結帳**：AI 查完產生預填結帳連結，人類點擊後在站上付款——與主流 AI 助理的安全規則相容
- **Phase C 全自動購買**：依賴平台協定（ACP、x402），商家申請制且台灣未開放——只預留接口

**2026-08-31 查證**：無 `src/app/api/mcp`、無 `public/.well-known`。真的沒開工。

**依賴**：Phase B 的 `get_product_link` 需要先有 `product-detail-pages`。

**開工訊號**：`product-detail-pages` 做完之後。做成後是台灣第一個提供 MCP 介面的茶園電商，
配合萬鷺朝鳳季有公關話題價值。

---

## 已從 backlog 畢業

（尚無。搬回 `changes/` 開工的項目記在這裡，寫明日期。）
