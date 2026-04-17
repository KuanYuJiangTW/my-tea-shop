## 1. 套件與型別

- [x] 1.1 安裝 `stripe` + `@stripe/stripe-js` 套件
- [x] 1.2 `src/types/index.ts` — `PaymentMethod` 加入 `"stripe"`

## 2. Stripe API Routes

- [x] 2.1 新建 `src/app/api/stripe/checkout/route.ts` — 後端驗證 + 建立 pending 訂單 + 建立 Stripe Checkout Session + 回傳 redirect URL
- [x] 2.2 新建 `src/app/api/stripe/webhook/route.ts` — 驗證 Stripe 簽章 + 更新 payment_status + 原子性扣庫存 + 寄送確認信

## 3. 前端整合

- [x] 3.1 `src/app/checkout/CheckoutClient.tsx` — 付款方式新增 Stripe 選項（radio button）
- [x] 3.2 `src/app/checkout/CheckoutClient.tsx` — handleSubmit 加入 Stripe 分支（POST /api/stripe/checkout → redirect）
- [x] 3.3 `src/app/checkout/CheckoutClient.tsx` — 訂單摘要付款標籤 + 提交按鈕文字支援 Stripe
- [x] 3.4 `src/app/order/result/ResultClient.tsx` — 處理 `?stripe=success|cancel` 回調

## 4. 國際化翻譯

- [x] 4.1 `messages/zh.json` — 新增 stripePayment、stripePaymentDesc、stripeShort、submitStripe
- [x] 4.2 `messages/en.json` — 新增對應英文翻譯

## 5. 環境變數與文件

- [x] 5.1 `.env.example` — 新增 STRIPE_SECRET_KEY、NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY、STRIPE_WEBHOOK_SECRET
- [x] 5.2 `README.md` — 技術棧、功能列表、專案架構、環境變數、badge 更新
- [x] 5.3 `README-en.md` — 同步英文版更新

## 6. 驗證

- [x] 6.1 TypeScript 型別檢查通過（`npx tsc --noEmit`）
