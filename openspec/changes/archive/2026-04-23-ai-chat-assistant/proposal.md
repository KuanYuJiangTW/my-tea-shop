## Why

客人在瀏覽茶葉商品或體驗活動時，常有即時問題（風味差異、泡法建議、體驗細節、送禮推薦等），但不會每個問題都想加 LINE 或打電話。目前網站沒有即時問答機制，可能導致客人因疑惑而離開。加入 AI 小幫手可 24 小時即時回應，降低跳出率、提升轉換率。初期採用 Gemini API 免費方案，零成本運行。

## What Changes

- 新增 `/api/chat` API Route，串接 Gemini API（gemini-2.0-flash），以茶葉知識庫為 system prompt，支援串流回應
- 新增浮動聊天按鈕元件（右下角），點擊展開對話視窗，含 AI 歡迎訊息與依頁面動態切換的快捷問題
- 對話視窗支援中英文雙語（根據當前 locale 切換 system prompt 與 UI 語言）
- 知識庫涵蓋：商品資訊、體驗活動細節、泡茶方式、常見問答
- AI 無法回答時，在對話中顯示可點擊的 LINE 官方帳號連結按鈕，一鍵跳轉真人客服
- 對話紀錄以 sessionStorage 暫存，關閉分頁才清除（切頁、關閉再開視窗都保留）
- 手機版聊天按鈕位置避開底部 CTA 按鈕（加入購物車、立即預約等）
- 簡易用量計數 log，監控每日對話量
- Admin 後台頁面不顯示聊天按鈕

## Capabilities

### New Capabilities
- `ai-chat-api`: Next.js API Route 串接 Gemini API，含 system prompt 管理、串流回應、速率限制處理
- `ai-chat-widget`: 浮動聊天按鈕 + 對話視窗 UI 元件（含快捷問題、訊息列表、輸入框）
- `ai-chat-knowledge`: 茶葉知識庫模組，整合商品資料、體驗活動、常見問答作為 AI 回答基礎

### Modified Capabilities

（無，此為獨立新功能，不修改既有 spec）

## Impact

- **新增套件**：`@google/generative-ai`（Gemini SDK）
- **新增檔案**：`src/components/ChatWidget.tsx`、`src/app/api/chat/route.ts`、`src/lib/chat-knowledge.ts`
- **修改檔案**：`src/app/layout.tsx`（加入 ChatWidget）、`messages/zh.json` & `messages/en.json`（新增聊天相關翻譯）
- **環境變數**：新增 `GEMINI_API_KEY`
- **不影響**：Admin 後台、購物/預約流程、Supabase schema、ECPay 金流
