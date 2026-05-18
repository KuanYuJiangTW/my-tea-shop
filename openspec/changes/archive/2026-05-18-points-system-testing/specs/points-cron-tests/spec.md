## ADDED Requirements

### Requirement: points-expiry-notify cron route 測試
系統 SHALL 為 `/api/cron/points-expiry-notify` 提供完整 unit tests，驗證授權、7天/3天通知查詢、email 發送、已通知標記更新。

#### Scenario: 無授權 header 回傳 401
- **WHEN** GET request 未帶 authorization header
- **THEN** 回傳 HTTP 401 `{ error: "Unauthorized" }`

#### Scenario: 正確授權但無到期點數
- **WHEN** 帶正確 CRON_SECRET 且查詢結果為空
- **THEN** 回傳 HTTP 200 且不發送任何 email

#### Scenario: 有 7 天內到期點數
- **WHEN** 查詢到 notification_sent_7d = false 且 expires_at 在 7 天內的記錄
- **THEN** 按 user_id 聚合點數、發送到期提醒 email、更新 notification_sent_7d = true

#### Scenario: 有 3 天內到期點數
- **WHEN** 查詢到 notification_sent_3d = false 且 expires_at 在 3 天內的記錄
- **THEN** 按 user_id 聚合點數、發送到期提醒 email、更新 notification_sent_3d = true

#### Scenario: 同用戶多筆到期正確聚合
- **WHEN** 同一 user_id 有多筆到期記錄
- **THEN** 合併為一封 email，金額為各筆加總

### Requirement: points-expiry-sweep cron route 測試
系統 SHALL 為 `/api/cron/points-expiry-sweep` 提供完整 unit tests，驗證過期沖銷掃描邏輯。

#### Scenario: 無授權回傳 401
- **WHEN** GET request 無正確授權
- **THEN** 回傳 HTTP 401

#### Scenario: 無已過期點數
- **WHEN** 查詢結果為空
- **THEN** 回傳 `{ ok: true, swept: 0 }`

#### Scenario: 掃描已過期點數並寫入 expiry events
- **WHEN** 存在 expires_at < now 且 swept_at = null 的正值記錄
- **THEN** 按 user_id 聚合寫入 points_expiry_events，並標記 swept_at

#### Scenario: DB 查詢錯誤回傳 500
- **WHEN** supabase 查詢回傳 error
- **THEN** 回傳 HTTP 500 並包含 error message

### Requirement: points-anomaly-scan cron route 測試
系統 SHALL 為 `/api/cron/points-anomaly-scan` 提供完整 unit tests，驗證異常偵測邏輯。

#### Scenario: 無異常回傳 anomalies: 0
- **WHEN** 無 flagged 記錄且無超額 redeem
- **THEN** 回傳 `{ ok: true, anomalies: 0 }` 且不發送 email

#### Scenario: 偵測到 flagged 記錄
- **WHEN** 存在 is_flagged = true 的當日記錄
- **THEN** 發送異常摘要 email 給管理員，flaggedCount > 0

#### Scenario: 偵測到單日超額折抵
- **WHEN** 同一用戶當日 redeem 絕對值加總 > 500
- **THEN** 納入異常報告，excessiveRedeemCount > 0

#### Scenario: 剛好 500 不算超額
- **WHEN** 同一用戶當日 redeem 加總 = 500
- **THEN** 不算超額

### Requirement: reset-annual-spend cron route 測試
系統 SHALL 為 `/api/cron/reset-annual-spend` 提供完整 unit tests，驗證 RPC 和 fallback 兩種路徑。

#### Scenario: RPC 成功路徑
- **WHEN** supabase.rpc("batch_annual_reset") 成功回傳降等列表
- **THEN** 為每筆降等寫入 tier_history，回傳 mode: "rpc"

#### Scenario: RPC 失敗 fallback 到逐筆處理
- **WHEN** supabase.rpc 回傳 error
- **THEN** 使用 fallback 邏輯逐筆處理，降等時寫入 tier_history

#### Scenario: 降等正確判斷
- **WHEN** 用戶 annual_spend 低於當前等級 min_annual_spend
- **THEN** 降至對應等級，reason = "annual_reset"，triggered_by = "cron"

#### Scenario: 未降等不寫 tier_history
- **WHEN** 用戶 annual_spend 仍符合當前等級
- **THEN** 僅重置 annual_spend = 0，不寫入 tier_history
