# PayPal 付款整合 — 設計文件

## 架構概覽

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

## 核心模組

### 1. `src/lib/paypal.ts` — PayPal 函式庫
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

### 3. 前端頁面
- `CheckoutClient.tsx` — PayPal 付款選項（最低 NT$32）
- `ResultClient.tsx` — capture loading / 成功 / 取消（重試+取消按鈕）/ 失敗
- `AccountClient.tsx` — 訂單列表重試付款

## 關鍵設計決策

### 冪等性
- `processPayPalCapture` 先檢查 `payment_status === "paid"` → 直接回傳
- UPDATE 條件 `WHERE payment_status = 'pending'` 確保只更新一次
- `ORDER_ALREADY_CAPTURED` (422) 視為成功

### 安全性
- Rate limiting（20 req/min）
- Origin 驗證
- Webhook 簽章驗證
- 登入 + ownership 驗證

### 庫存扣減時機
- PayPal: **capture 成功後**才扣（非下單時）
- COD: 下單時扣
- ECPay: 付款成功後扣

### 取消訂單庫存還原
- 需根據 payment_method 和 payment_status 判斷是否已扣過庫存
- **Bug**: 原邏輯對 PayPal pending 訂單會多還庫存（未扣卻還原）
