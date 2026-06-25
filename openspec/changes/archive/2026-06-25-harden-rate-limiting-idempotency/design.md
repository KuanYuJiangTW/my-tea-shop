## Context

上線安全稽核發現：限流全在記憶體內（`Map`），Vercel serverless 多 instance 下無法跨 instance 累計，攻擊者讓請求落到不同 instance 即可繞過；ECPay `/api/ecpay/return` 公開且無冪等，重放會重複扣庫存/寄信；AI 客服只有每 IP 記憶體限流，無全站上限，可輪 IP 刷爆 Groq；體驗預約 `participantCount` 未驗證。專案已使用 Supabase（含 service_role），故以 Supabase 作為持久化後端最低摩擦、不需新增外部服務。本文件記錄已實作之決策（reverse documentation）。

## Goals / Non-Goals

**Goals:**
- 限流跨 serverless instance 一致生效，且故障時不誤擋正常客人（fail-open）。
- ECPay 付款後處理對重複通知具冪等性（exactly-once 扣庫存/寄信）。
- AI 客服具備全站每日成本上限。
- 體驗預約人數輸入驗證。

**Non-Goals:**
- 不重構 admin session / 2FA（另案 `refactor-admin-session-2fa`）。
- 不導入 Redis/Upstash 等外部限流服務。
- 不改動既有的金額後端重算、簽章驗證等已正確的機制。

## Decisions

- **限流後端用 Supabase 表而非 Upstash**：專案已有 Supabase，零新服務、FREE tier 可用；代價是每次受限請求多一次 DB 往返（毫秒級，可接受）。原子性以單一 `INSERT ... ON CONFLICT DO UPDATE` RPC（`check_rate_limit`）保證併發安全。
- **fail-open 而非 fail-closed**：限流是次要防線，密碼/簽章才是主防線。DB 故障時放行，避免限流故障升級為全站不可用。helper 對 RPC error 與例外皆回傳「允許」。
- **後台登入「只計失敗」**：另設 `bump_rate_limit`（只增不判斷）+ `rateLimitPeek`（只查不增），維持原本「成功登入不計入、成功即清零」語意。
- **ECPay 冪等用條件式更新**：`update(...).eq(狀態, 待付款值).maybeSingle()`；回傳非 null 才代表本次真正完成狀態轉移，後續扣庫存/寄信才執行。與 Stripe webhook 既有作法一致。
- **AI 每日上限用 date-based key**：`chat:global:<YYYY-MM-DD>`，沿用同一 `check_rate_limit` RPC，視窗 24h，上限由 `CHAT_DAILY_LIMIT` 控制；自然跨日重置。

## Risks / Trade-offs

- [fail-open 在 DB 故障期間限流失效] → 主防線（密碼 timing-safe 比對、金流簽章驗證）仍在；故障為短暫且可由監控告警。
- [每請求多一次 DB 往返增加延遲與寫入量] → 僅受限端點；計數列可由排程清理過期列（已建索引 `reset_at`）。
- [每日上限用 UTC 日界，與台灣時區不一致] → 對「防刷成本」目的無影響；如需在地化可改 key 產生邏輯。
- [`rate_limits.sql` 未在 Supabase 執行則限流不生效] → 因 fail-open，網站仍正常運作，僅限流未啟用；需在部署檢查清單中確認已執行。

## Migration Plan

1. 在 Supabase SQL Editor 執行 `supabase/rate_limits.sql`（建表 + RPC）。**（已完成）**
2. 部署程式碼（已移除 in-memory `createRateLimiter`，全部改用持久化 helper）。
3. （可選）在 Vercel 設定 `CHAT_DAILY_LIMIT`。
4. 回滾策略：因 helper fail-open，若 RPC 異常不會影響服務；必要時可還原 `src/lib/rate-limit.ts` 與各路由至記憶體版本。
