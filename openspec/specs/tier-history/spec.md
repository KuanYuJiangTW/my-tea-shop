# tier-history Specification

## Purpose
會員等級變動的歷史追蹤。等級影響點數折抵上限，變動軌跡要查得到才能處理爭議。

## Requirements

### Requirement: 等級變動���史追蹤
系統 SHALL 在每次會員等級變動時記錄歷史。

#### Scenario: 升等記錄
- **WHEN** 用戶等級從 standard 升為 silver
- **THEN** 在 `tier_history` 記錄：user_id、from_tier、to_tier、reason='upgrade'、triggered_by='system'、changed_at

#### Scenario: 降等記錄
- **WHEN** 年度重置時用戶等級被降
- **THEN** 在 `tier_history` 記錄：reason='annual_reset'、triggered_by='cron'

#### Scenario: 手動調整記錄
- **WHEN** 管理員手動調整用戶等級
- **THEN** 記錄 triggered_by='admin'、admin_id

#### Scenario: 查詢歷史
- **WHEN** 管理員或用戶查看等級歷史
- **THEN** 回傳該用戶所有等級變動記錄（時間倒序）
