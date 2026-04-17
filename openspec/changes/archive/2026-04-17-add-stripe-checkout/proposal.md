## Why

專案目前僅支援 ECPay（綠界）金流，國際客戶無法使用熟悉的付款方式。為了在 Upwork 上展示國際金流整合能力，並讓海外客戶能直接體驗 demo，需要新增 Stripe Checkout 作為替代付款選項。

## What Changes

- 新增 Stripe Checkout (hosted page) 付款方式，與現有 ECPay 並存
- 新增 `POST /api/stripe/checkout` — 建立 Stripe Session + pending 訂單
- 新增 `POST /api/stripe/webhook` — 接收付款成功事件，扣庫存、更新狀態、寄信
- 修改 `PaymentMethod` type 加入 `"stripe"`
- 結帳頁新增 Stripe 付款選項（三選一：ECPay / Stripe / COD）
- 訂單結果頁處理 Stripe 的 `?stripe=success|cancel` 回調
- 新增中英雙語 Stripe 相關翻譯
- 更新 `.env.example` 及兩份 README（技術棧、功能列表、架構圖、env vars、badge）
- 安裝 `stripe` + `@stripe/stripe-js` 套件

## Capabilities

### New Capabilities
- `stripe-checkout`: Stripe Checkout Session 付款流程（建立 session、導向託管頁面、webhook 回調處理）

### Modified Capabilities
- `checkout-flow`: 結帳頁付款方式選項從 2 種（ECPay / COD）擴充為 3 種（ECPay / Stripe / COD）
- `order-result`: 訂單結果頁新增 Stripe 回調來源判斷邏輯

## Impact

- **新增檔案**: `src/app/api/stripe/checkout/route.ts`, `src/app/api/stripe/webhook/route.ts`
- **修改檔案**: `src/types/index.ts`, `src/app/checkout/CheckoutClient.tsx`, `src/app/order/result/ResultClient.tsx`, `messages/zh.json`, `messages/en.json`, `.env.example`, `README.md`, `README-en.md`
- **新增依賴**: `stripe`, `@stripe/stripe-js`
- **新增環境變數**: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- **資料庫**: 無 schema 變更，複用現有 orders 表，`payment_method` 欄位新增 `"stripe"` 值，訂單編號前綴 `S`
- **不受影響**: ECPay 全部不動、COD 不動、體驗預約不動、庫存/優惠券/積點邏輯複用現有
