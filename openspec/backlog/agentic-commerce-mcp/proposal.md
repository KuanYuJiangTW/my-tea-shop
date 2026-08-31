## Why

終極目標（小江 2026-07-19 決策）：使用者的 AI 助理（Claude、ChatGPT 等）能直接連上網站查資料——查體驗空位、看茶葉品項——並完成預約或購買。現況：Agent Readiness 檢測 API/MCP 0/7，DNS-AID 與 api-catalog 因「無真實端點」刻意未做。做成後將是台灣第一個提供 MCP 介面的茶園電商，配合萬鷺朝鳳季有公關話題價值。

**階段策略（關鍵設計決策）**：
- **Phase A 查詢（唯讀）**：list_experiences、get_availability、list_products——完全自主可控
- **Phase B 交棒結帳**：AI 查完後產生預填結帳連結，人類點擊後在站上完成付款——完全自主可控，且與 AI 助理的安全規則相容（主流 AI 助理禁止代輸入付款資料，交棒是其能執行的最終型態）
- **Phase C 全自動購買**：依賴平台協定（OpenAI/Stripe ACP、x402），目前商家申請制且台灣未開放——本 change 僅預留架構接口，不實作

## What Changes

- 新增 MCP server 端點（Streamable HTTP，`/api/mcp`）：Phase A 三個唯讀工具 + Phase B `get_booking_link`（體驗，回傳帶場次參數的預約頁連結）與 `get_product_link`（連 product-detail-pages 的產品頁）
- 僅輸出公開資料（體驗與場次公開資訊、上架產品與價格）；不經 MCP 傳輸任何個資與付款資料；套用既有 rate limiting 模式
- Agent 發現配套（先前刻意跳過項，現在端點為真）：`/.well-known/mcp/server-card.json`、`/.well-known/api-catalog`（RFC 9727 linkset）、Link 標頭補 `rel="api-catalog"`、DNS-AID `_index._agents` TXT/SVCB 記錄（小江在 Cloudflare DNS 操作）
- llms.txt 與 Agent Readiness 複測（預期 API/MCP 分區與 Discoverability 滿上，Level 3+）
- 文件：README 補「如何把霧抉茶加入你的 AI 助理」使用說明頁（面向消費者的簡易教學）

## Capabilities

### New Capabilities

- `mcp-server`: MCP 端點的工具定義、輸入輸出 schema、僅公開資料原則、rate limiting、錯誤行為
- `agent-discovery`: server card、api-catalog、Link 標頭、DNS-AID 記錄的內容與一致性要求（宣告的端點必須真實存在）

### Modified Capabilities

（無——結帳與庫存邏輯完全不動；Phase B 連結落點為既有預約頁與新產品頁）

## Impact

- 程式碼：`src/app/api/mcp/`（新）、`public/.well-known/`（新）、`next.config.ts`（Link 標頭）、README
- 外部：Cloudflare DNS（DNS-AID 記錄）、Agent Readiness 複測
- 高風險界線：**不觸碰**金流、庫存扣減、auth——查詢走既有公開讀取路徑；動工前仍先讀 `openspec/specs/experience-booking/`（鐵律 4），改完跑 `npm run test`
- 依賴：`product-detail-pages`（get_product_link 的落點）；Phase C 於 ACP/x402 台灣開放後另立 change
