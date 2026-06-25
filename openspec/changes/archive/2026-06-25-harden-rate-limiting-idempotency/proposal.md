## Why

上線安全稽核發現多項可被駭客或客人濫用的弱點：所有限流（rate limiting）都在記憶體內，在 Vercel serverless 多 instance 下形同虛設；綠界（ECPay）付款通知端點公開且無冪等性，重放會重複扣庫存與寄信；AI 客服無全站用量上限，可被輪換 IP 刷爆 Groq 額度；體驗預約人數未驗證為正整數。本變更為已完成之強化的回填記錄（reverse documentation）。

## What Changes

- 新增 Supabase `rate_limits` 計數表與原子性 RPC（`check_rate_limit`、`bump_rate_limit`），取代所有記憶體內限流，解決多 instance 失效問題。
- 新增共用限流 helper（`rateLimit` / `rateLimitPeek` / `rateLimitBump` / `rateLimitReset`），全部 **fail-open**（DB 故障時放行，避免限流故障擋住正常客人）。
- 將以下路由的記憶體限流全部改為持久化：後台登入、AI chat、聯絡表單、訂單、預約、ECPay/Stripe/PayPal 結帳、折價券驗證、體驗查詢。移除舊的 in-memory `createRateLimiter`。
- 後台登入防爆破改為「只計失敗次數、成功即清零」的持久化計數。
- ECPay server 端付款通知（`/api/ecpay/return`）加入冪等性：僅當訂單/預約仍為待付款狀態時才確認，重放通知不再重複扣庫存或寄信。
- AI 客服新增**全站每日總量上限**（env `CHAT_DAILY_LIMIT`，預設 1000），疊加於每 IP 限流之上。
- 體驗預約建立時驗證 `participantCount` 為 1–50 的正整數，防止負數繞過名額檢查並產生負金額。

## Capabilities

### New Capabilities
- `persistent-rate-limiting`: 以 Supabase 資料表為後端的持久化限流機制，跨 serverless instance 一致生效；fail-open 容錯；供各 API 路由共用。

### Modified Capabilities
- `ecpay-checkout`: 付款通知處理新增冪等性需求——重複/重放的合法通知必須只處理一次（exactly-once），不得重複扣庫存或寄信。
- `ai-chat-api`: 新增全站每日總量上限需求，作為每 IP 限流之外的成本保護。
- `experience-booking`: 新增參加人數輸入驗證需求（正整數且在合理上限內）。

## Impact

- 新增：`supabase/rate_limits.sql`（資料表 + 2 個 RPC，需於 Supabase 執行）。
- 修改：`src/lib/rate-limit.ts`（重寫為持久化 helper）。
- 修改路由：`src/app/api/admin/auth/route.ts`、`chat`、`contact`、`orders`、`bookings`、`ecpay/checkout`、`ecpay/return`、`stripe/checkout`、`paypal/(create-order|capture|retry)`、`user/validate-coupon`、`experiences`。
- 設定：新增 env `CHAT_DAILY_LIMIT`（已加入 `.env.example`）。
- 測試：更新 PayPal mock、移除已刪除的 in-memory 限流測試、新增持久化限流測試（vitest 全綠，唯一既有失敗的 `cron-anomaly-scan` 與本變更無關）。
