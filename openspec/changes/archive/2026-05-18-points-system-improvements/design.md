## Context

會員點數系統 v1 已上線（membership-points-system-revamp），核心功能完備。本次為強化改進，分為六大面向：效能穩定性、行銷觸發、會計合規、資安風控、營運工具、UX 體驗。

���有技術棧：Next.js 14 App Router + Supabase (PostgreSQL) + Vercel Cron + Resend (email)。

## Goals / Non-Goals

**Goals:**
- 確保高併發下點數/年消費計算正確（已部分完成）
- 建立自動化行銷觸發（到期提醒、升等通知）提高回購率
- 讓帳務數據可供會計查核（點數負債、過期沖銷）
- 建立基本風控防線（rate limit、異常監測）
- 提供客服/營運需要的手動工具

**Non-Goals:**
- 不做即時推播（先做 email，未來再加 push notification）
- 不做完整 ERP 會計系統串接（只提供報表數據）
- 不做 AI 異常偵測（先用規則型告警）
- 不改動現有等級門檻和點數比率（純功能補強）

## Decisions

### D1: 點數到期通知用 Vercel Cron + Resend
- 每日執行一次，查詢 7 天內到期的點數持有者
- 用 Resend 發信，複用現有 email 基礎建設
- 每位用戶每個到期批次最多通知一次（用 `notification_sent_at` 標記）

### D2: earnBase 定義 = subtotal（商品原價合計）
- 折價券是行銷成本、運費是物流成本，都不算入消費者「消費金額」
- 點數折抵是消費者的資產兌換，也不算
- 這代表發點基礎較寬鬆（利於行銷），但需要在帳務上清楚記錄

### D3: 點數負債 = 未兌現有效點數 × NT$1
- 每點 = NT$1 負債（1:1 兌換比）
- 過期點數從負債沖銷，記為「其他收入」事件
- 儀表板顯示即時負債金額 + 趨勢

### D4: 手動調整點數 = 新增 type='adjustment'
- 在 `point_transactions` 加入 `type: 'adjustment'`
- 必須附 `admin_note`（操作理由）
- 記錄操作者 admin_id

### D5: Rate limit 使用既有 `createRateLimiter`
- 通用碼驗證端點加入每 IP 每分鐘 10 次限制
- 複用 `src/lib/rate-limit.ts` 現有模組

### D6: 異常監測用 DB trigger + admin 通知
- 單日同一用戶 redeem > NT$500 → 發 email 告警給 admin
- 單筆 earn multiplier > 5x → 記錄 flag
- 暫時用 cron 定期掃描（非即時），避免複雜度

### D7: 年度重置改批次 update
- 使用 Supabase RPC 一次性 UPDATE 全表
- 降等判斷仍逐筆（量級可控，每年只跑一次）

## Risks / Trade-offs

| 風險 | 影響 | 緩解 |
|------|------|------|
| Email 到期通知被歸入垃圾信 | 低開信率 | 用已驗證 domain、簡潔主旨、提供退訂連結 |
| 點數負債計算在高點數量時查詢慢 | 儀表板載入慢 | 用 materialized view 或 daily cron 預計算 |
| 手動調整點數被濫用 | 帳務不清 | 強制 admin_note + audit log + 只有 super admin 可操作 |
| Rate limit 太嚴格影響正常使用者 | 體驗差 | 用 per-user + per-IP 雙層，正常使用者不會觸發 |
