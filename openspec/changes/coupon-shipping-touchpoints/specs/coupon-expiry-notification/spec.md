## ADDED Requirements

### Requirement: 折價券到期前 7 天自動通知

系統 SHALL 每日掃描即將到期的個人折價券，並在到期前 7 天內寄出提醒。
掃描對象為 `coupons`（使用者專屬券）；`coupon_templates` 的通用碼不屬於個人，不在範圍。

#### Scenario: Cron 每日執行
- **WHEN** 每日 UTC 04:00 觸發 `/api/cron/coupon-expiry-notify`
- **THEN** 查詢 `used_at` 為 null、`notification_sent_7d` 為 false、且 `expires_at`
  落在 (now, now + 7 天] 區間的券

#### Scenario: 未授權
- **WHEN** 請求的 `authorization` 標頭不等於 `Bearer ${CRON_SECRET}`
- **THEN** 回傳 401，且 SHALL NOT 進行任何查詢

#### Scenario: 無到期券
- **WHEN** 查詢結果為空
- **THEN** 回傳 200，不寄出任何信

#### Scenario: 查詢失敗
- **WHEN** Supabase 查詢回傳 error
- **THEN** 回傳 500 並記錄錯誤

### Requirement: 一位會員一封信

同一使用者持有多張即將到期的券時，系統 SHALL 彙總為單一封信，SHALL NOT 逐張寄送。

#### Scenario: 多張券彙總
- **WHEN** 某使用者有 2 張即將到期的券（NT$50 門檻 350、NT$100 門檻 800）
- **THEN** 寄出一封信，`couponCount = 2`、`totalValue = 150`、
  `minOrderAmount = 350`（取最低門檻，因為信裡要講最容易用掉的條件）、
  到期日取最近的一張

#### Scenario: 查不到 email
- **WHEN** 使用者的 auth 記錄查不到 email
- **THEN** 跳過該使用者，且 SHALL NOT 標記其券為已通知（下次執行會再試）

### Requirement: 只標記寄送成功的券

系統 SHALL 僅將寄送成功的券標記為 `notification_sent_7d = true`。

> 這條是刻意與 `points-expiry-notify` 不同。該 cron 在迴圈外用同一組 where 條件
> 批次 update，寄信失敗的使用者一樣被標記成已通知，等於永久漏掉那批人。

#### Scenario: 部分寄送失敗
- **WHEN** 兩位使用者中一位寄信拋出例外、另一位成功
- **THEN** `sent = 1`、`errors = 1`，且 update 的 id 清單只含成功那位的券

#### Scenario: 全部寄送失敗
- **WHEN** 所有寄送皆失敗
- **THEN** SHALL NOT 呼叫 update

#### Scenario: 標記失敗
- **WHEN** update 回傳 error
- **THEN** 計入 `errors` 並記錄，仍回傳 200——重寄勝過漏寄

### Requirement: 資料庫前置欄位

`coupons` 表 SHALL 具備 `notification_sent_7d boolean not null default false`。

#### Scenario: 欄位缺失
- **WHEN** 欄位尚未建立而 cron 執行
- **THEN** 查詢失敗並回傳 500。上線前必須先執行
  `supabase/add_coupon_expiry_notification.sql`
