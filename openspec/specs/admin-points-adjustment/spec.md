# admin-points-adjustment Specification

## Purpose
後台手動調整會員點數的規則，以及點數明細的匯出。手動調整直接影響會員資產，因此必須留下可稽核的軌跡。

## Requirements

### Requirement: 後台手動調整點數
系統 SHALL 提供管理員手動加/扣點數的功能，用於客訴補償或帳務修正。

#### Scenario: 加點（補償）
- **WHEN** 管理員輸入用戶 ID、正數金額、操作理由
- **THEN** 在 point_transactions 新增 type='adjustment'、正值 points、附帶 admin_note 和 admin_id

#### Scenario: 扣點（修正）
- **WHEN** 管理員輸入用戶 ID、負數金額、操作理由
- **THEN** 在 point_transactions 新增 type='adjustment'、負值 points，且用戶餘額不得為負

#### Scenario: 必須填寫理由
- **WHEN** 管理員未填寫操作理由
- **THEN** API 回傳 400 錯誤，拒絕操作

#### Scenario: 記錄操作者
- **WHEN** 調整成功
- **THEN** 記錄包含 admin_id（操作者身份）以供稽核

### Requirement: 點數明細匯出
系統 SHALL 提供用戶點數交易明細的 CSV 匯出。

#### Scenario: 管理員匯出指定用戶
- **WHEN** 管理員在後台選擇用戶並點擊「匯出點數明細」
- **THEN** 下載 CSV 檔案，包含日期、類型、點數、描述、訂單編號
