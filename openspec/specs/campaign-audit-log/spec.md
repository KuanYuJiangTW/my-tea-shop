# campaign-audit-log Specification

## Purpose
行銷活動設定變更的記錄。活動參數直接影響發點與折抵金額，改動必須留下誰在何時改了什麼的軌跡。

## Requirements

### Requirement: 活動設定變更記錄
系統 SHALL 在 points_campaigns 被修改時記錄變更歷史。

#### Scenario: 編輯活動
- **WHEN** 管理員修改活動的 multiplier、時間、或狀態
- **THEN** 在 `campaign_audit_log` 記錄：campaign_id、changed_fields（JSON）、old_values、new_values、admin_id、changed_at

#### Scenario: 停用活動
- **WHEN** 管理員停用活動（is_active → false）
- **THEN** 記錄停用事件，包含操作者和時間

#### Scenario: 查看歷史
- **WHEN** 管理員在活動詳情頁查看
- **THEN** 顯示該活動的所有變更歷史（時間、操作者、變更內容）
