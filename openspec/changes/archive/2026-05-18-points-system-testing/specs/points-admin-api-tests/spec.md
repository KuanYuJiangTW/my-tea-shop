## ADDED Requirements

### Requirement: points-adjustment API 測試
系統 SHALL 為 `/api/admin/points-adjustment` POST 提供完整 unit tests。

#### Scenario: 缺少必要欄位回傳 400
- **WHEN** request body 缺少 userId、points 或 adminId
- **THEN** 回傳 HTTP 400 `{ error: "缺少必要欄位" }`

#### Scenario: 未填寫 adminNote 回傳 400
- **WHEN** adminNote 為空或僅含空白
- **THEN** 回傳 HTTP 400 `{ error: "必須填寫調整原因" }`

#### Scenario: 調整點數為 0 回傳 400
- **WHEN** points = 0
- **THEN** 回傳 HTTP 400 `{ error: "調整點數不可為 0" }`

#### Scenario: 扣點超過餘額回傳 400
- **WHEN** points < 0 且 balance + points < 0
- **THEN** 回傳 HTTP 400 包含目前有效點數資訊

#### Scenario: 加點成功
- **WHEN** points > 0 且所有欄位正確
- **THEN** 寫入 type = "adjustment" 的 point_transactions，回傳 ok: true

#### Scenario: 扣點成功（餘額足夠）
- **WHEN** points < 0 且 balance + points >= 0
- **THEN** 寫入負值 point_transactions，expires_at = null

### Requirement: points-export API 測試
系統 SHALL 為 `/api/admin/points-export` GET 提供 unit tests。

#### Scenario: 無 userId 參數匯出全部
- **WHEN** GET 無 userId query parameter
- **THEN** 回傳 CSV 格式，Content-Type 為 text/csv，包含 BOM

#### Scenario: 帶 userId 只匯出該用戶
- **WHEN** GET 帶 userId=xxx
- **THEN** supabase 查詢包含 .eq("user_id", userId)

#### Scenario: CSV 格式正確
- **WHEN** 有交易資料
- **THEN** 第一行為 header，後續每行為一筆交易，欄位以逗號分隔

#### Scenario: DB 錯誤回傳 500
- **WHEN** supabase 查詢失敗
- **THEN** 回傳 HTTP 500

### Requirement: campaign audit log API 測試
系統 SHALL 為 `/api/admin/campaigns/[id]/history` GET 提供 unit tests。

#### Scenario: 正確回傳歷史記錄
- **WHEN** GET 帶 campaign id
- **THEN** 回傳 campaign_audit_log 資料，按 changed_at DESC 排序

#### Scenario: 無歷史回傳空陣列
- **WHEN** 該 campaign 無 audit log
- **THEN** 回傳空陣列 `[]`

### Requirement: campaign PATCH audit log 寫入測試
系統 SHALL 驗證 campaigns PATCH 時正確寫入 audit log。

#### Scenario: 修改欄位時記錄 old/new values
- **WHEN** PATCH 修改 name 和 multiplier
- **THEN** campaign_audit_log 包含 action="update"、changed_fields=["name","multiplier"]、正確的 old_values 和 new_values

#### Scenario: DELETE 停用時記錄 audit log
- **WHEN** DELETE campaign
- **THEN** campaign_audit_log 包含 action="deactivate"、changed_fields=["is_active"]
