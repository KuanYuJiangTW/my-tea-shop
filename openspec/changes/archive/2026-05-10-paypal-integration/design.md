## Context

茶藝店已有 COD 與 ECPay 付款流程。PayPal 為第三種付款方式，主要面向英文版國際客群。技術上採用 PayPal REST API v2，Server-side 全程處理，前端僅負責跳轉。Stripe 後端程式碼保留不動，未來若取得海外帳號可直接啟用。

## Goals / Non-Goals

**Goals:**
- 新增 PayPal 作為國外客人的付款方式
- 將 Stripe Coming Soon 按鈕位置替換為 PayPal 按鈕
- PayPal 付款流程與現有綠界流程體驗一致（建立訂單 → 跳轉付款 → 回調顯示結果）
- 支援 PayPal webhook 自動更新訂單狀態
- 確保與現有 COD / ECPay 流程共存不衝突

**Non-Goals:**
- 不刪除 Stripe 程式碼
- 不做 PayPal 訂閱/定期付款
- 不做幣別轉換（以 TWD 計價，PayPal 自動處理買家端匯率顯示）
- 不做 PayPal 退款功能（本次不含）
- 不做國際運費計算與國際配送（本次僅支援台灣境內配送）
- 不做廢棄訂單自動清理（PayPal pending 訂單的定期清理留待後續）
- 重新設計現有 COD / ECPay 金流邏輯

## Architecture

```
用戶結帳 → POST /api/paypal/create-order → PayPal API (建立訂單)
                                                ↓
                                        用戶跳轉 PayPal 核准
                                                ↓
              ┌─────────────────────────────────┴──────────────────────┐
              ↓                                                        ↓
    用戶回到 Result 頁                                         PayPal Webhook
    POST /api/paypal/capture                              POST /api/paypal/webhook
              ↓                                                        ↓
              └──────────── processPayPalCapture (冪等) ───────────────┘
                                        ↓
                           更新訂單 → 扣庫存 → 寄信
```

## Decisions

### D1：使用 PayPal REST API v2 直接呼叫，不用 SDK

**選擇**: 直接使用 `fetch` 呼叫 PayPal REST API v2（Orders API）
**替代方案**: `@paypal/checkout-server-sdk`（已棄用）、`@paypal/paypal-server-sdk`
**原因**: PayPal 官方 Node SDK 更迭頻繁且文件品質不穩定，REST API 穩定且文件清楚。減少依賴，降低升級風險。

### D2：付款流程採用 Server-side redirect（非前端 JS SDK）

**選擇**: 後端建立 PayPal Order → 回傳 approve URL → 前端 redirect
**替代方案**: 前端嵌入 PayPal JS SDK Smart Buttons
**原因**: 與現有 ECPay 流程一致（都是跳轉），前端改動最小，且不需要載入額外 JS。

### D3：PayPal 庫存扣減時機與 ECPay 一致

| 付款方式 | 庫存扣減時機 |
|---------|------------|
| COD | 訂單建立時即扣減 |
| ECPay | 付款成功後才扣減 |
| PayPal | 付款成功後才扣減（capture 成功後） |

**理由**：PayPal 與 ECPay 同屬「先建訂單、後付款」模式，未付款前不應佔用庫存。

### D4：雙重 Capture 機制（Result 頁 + Webhook）

PayPal 付款完成後，有兩個觸發點會嘗試 capture：
1. **Result 頁面**：用戶從 PayPal 跳回網站時，前端呼叫 `POST /api/paypal/capture`
2. **Webhook**：PayPal 發送 `CHECKOUT.ORDER.APPROVED` 事件

兩者可能同時發生（競態），處理方式：
- `processPayPalCapture()` 以 `payment_status = "pending"` 作為 UPDATE 條件，確保只有一方能成功更新
- PayPal API 回傳 `422 ORDER_ALREADY_CAPTURED` 時視為成功
- Webhook 端一律回傳 `200 OK`，避免 PayPal 重試迴圈

### D5：create-order 失敗時自動回滾

`POST /api/paypal/create-order` 流程：
1. 驗證用戶、商品、價格
2. 處理優惠券（標記使用）、點數（扣除）
3. 建立 DB 訂單
4. 呼叫 PayPal API 建立 Order

若步驟 4 失敗：
- 退還已扣點數（插入 +N 的 earn 記錄）
- 退還已使用優惠券（`used_at = null`）
- 訂單標記為 `failed`

### D6：Sandbox / Live 切換靠環境變數

```ts
const PAYPAL_BASE_URL =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
```

**理由**：不需改程式碼，只需在 Vercel 環境變數設 `PAYPAL_MODE=live` 即可切換。

### D7：Access Token 快取

PayPal OAuth token 預設有效 9 小時，程式端快取並提前 60 秒過期，避免每次 API 呼叫都重新取 token。

### D8：英文版隱藏貨到付款

結帳頁以 `locale !== "en"` 條件隱藏 COD 選項。PayPal 最低金額為 NT$32。

### D9：Webhook 簽章驗證

使用 PayPal 官方 `/v1/notifications/verify-webhook-signature` API 驗證 webhook 簽章，需要 `PAYPAL_WEBHOOK_ID` 環境變數。

### D10：Stripe 處理方式

前端移除 Stripe Coming Soon 按鈕，直接以 PayPal 按鈕取代；後端 API 路由保留不動。未來若取得海外帳號可直接啟用。

### D11：取消訂單庫存還原邏輯

需根據 `payment_method` 和 `payment_status` 判斷是否已扣過庫存：
- COD：下單即扣 → 取消必還原
- ECPay paid：付款後扣 → 取消需還原
- ECPay pending：未扣 → 取消不還原
- PayPal paid：capture 後扣 → 取消需還原
- PayPal pending：未扣 → 取消不還原

## Core Modules

### 1. `src/lib/paypal.ts`
- `getPayPalAccessToken()` — OAuth2 token + 記憶體快取（提前 60 秒過期）
- `paypalFetch()` — 帶 token 的 API wrapper
- `createPayPalOrder()` — 建立 PayPal 訂單，回傳 approve URL
- `capturePayPalOrder()` — Capture 付款，處理 ORDER_ALREADY_CAPTURED 競態
- `verifyPayPalWebhook()` — 簽章驗證
- `processPayPalCapture()` — 冪等 capture 處理（查訂單 → capture → 更新 → 扣庫存 → 寄信）

### 2. API Routes

| Route | Method | 用途 |
|-------|--------|------|
| `/api/paypal/create-order` | POST | 建立訂單 + PayPal 訂單 |
| `/api/paypal/capture` | POST | 前端 capture（需登入 + 驗證 ownership） |
| `/api/paypal/webhook` | POST | PayPal 非同步通知 |
| `/api/paypal/retry` | POST | 重新發起付款 |

### 3. 安全性

- Rate limiting（20 req/min per IP）
- Origin 驗證
- Webhook 簽章驗證
- 登入 + ownership 驗證

## Risks / Trade-offs

- **[PayPal 手續費較高 4.4%]** → 由商家吸收，已包含在現有定價策略中。國際客戶體驗優先，初期訂單量不大
- **[TWD 非 PayPal 主要幣別]** → PayPal 支援 TWD，買家看到的是自動換算後的本地貨幣
- **[PayPal 與 COD/ECPay 驗證邏輯重複]** → `create-order` 的驗價邏輯與 `/api/orders`、`/api/ecpay/checkout` 高度相似，三份獨立程式碼需同步維護
- **[PayPal capture 競態]** → 以冪等設計處理，風險可控
- **[Webhook 簽章驗證依賴 PayPal API]** → 若 PayPal API 暫時不可用，webhook 會驗證失敗回傳 401，PayPal 會自動重試
- **[廢棄 pending 訂單]** → 使用者放棄 PayPal 付款會留下 pending 訂單，PayPal Order 72 小時後過期，DB 訂單需未來加定期清理
- **[購物車清空 vs 取消付款]** → redirect 前清空購物車，取消回來後購物車已空，以「重新付款」按鈕（用同一筆 DB 訂單重建 PayPal Order）解決
