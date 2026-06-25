## 1. 持久化限流基礎設施

- [x] 1.1 新增 `supabase/rate_limits.sql`：`rate_limits` 表（key/count/reset_at，啟用 RLS 不建 policy）+ `reset_at` 索引
- [x] 1.2 新增原子性 RPC `check_rate_limit`（INSERT ... ON CONFLICT DO UPDATE，回傳是否允許）
- [x] 1.3 新增 RPC `bump_rate_limit`（只遞增、回傳計數，供「只計失敗」場景）
- [x] 1.4 在 Supabase 執行 `rate_limits.sql`

## 2. 共用限流 helper

- [x] 2.1 重寫 `src/lib/rate-limit.ts`：`rateLimit` / `rateLimitPeek` / `rateLimitBump` / `rateLimitReset`，全部 fail-open
- [x] 2.2 移除舊的記憶體版 `createRateLimiter`

## 3. 套用持久化限流到各路由

- [x] 3.1 後台登入 `admin/auth`：改為「只計失敗、成功清零」（peek + bump + reset）
- [x] 3.2 AI chat：每 IP 改持久化
- [x] 3.3 contact、orders、bookings、validate-coupon、experiences 改持久化
- [x] 3.4 ecpay/checkout、stripe/checkout、paypal/(create-order|capture|retry) 改持久化

## 4. ECPay 付款通知冪等性

- [x] 4.1 `ecpay/return` 訂單分支加 `.eq("payment_status","pending")` + `.maybeSingle()`，僅轉移時扣庫存/寄信
- [x] 4.2 `ecpay/return` 預約分支加 `.eq("status","pending_payment")` + `.maybeSingle()`，僅轉移時寄信

## 5. AI 客服每日總量上限

- [x] 5.1 chat 加全站每日上限（`chat:global:<date>` key、env `CHAT_DAILY_LIMIT` 預設 1000）
- [x] 5.2 將 `CHAT_DAILY_LIMIT` 加入 `.env.example`

## 6. 體驗預約人數驗證

- [x] 6.1 `bookings` 驗證 `participantCount` 為 1–50 正整數

## 7. 測試與驗證

- [x] 7.1 更新受影響測試（PayPal mock 改提供 `rateLimit`；移除已刪除的 in-memory 限流測試；新增持久化限流測試）
- [x] 7.2 `tsc --noEmit` 通過、`vitest run` 綠（既有無關失敗 `cron-anomaly-scan` 除外）
