# points-anomaly-detection Specification

## Purpose
點數異常偵測：單日折抵超額告警、高倍率活動的 flag，以及每日執行的異常掃描 cron。點數等同現金，異常要能及早發現。

## Requirements

### Requirement: 單日折抵超額告警
系統 SHALL 在單一用戶單日點數折抵總額超過 NT$500 時發送告警給管理員。

#### Scenario: 觸發告警
- **WHEN** 同一用戶在同一日內累計 redeem 點數 > 500
- **THEN** 發送 email 告警至管理員信箱，包含用戶 ID、折抵總額、相關訂單

#### Scenario: 未超額不告警
- **WHEN** 用戶單日 redeem <= 500
- **THEN** 不觸發告警

### Requirement: 高倍率活動 flag
系統 SHALL 在點數發放 multiplier > 5x 時記錄 flag 供後續稽核。

#### Scenario: 記錄高倍率 flag
- **WHEN** issuePoints 計算出的 multiplier > 5
- **THEN** 在 point_transactions 記錄 `is_flagged = true`

#### Scenario: 正常倍率不 flag
- **WHEN** multiplier <= 5
- **THEN** `is_flagged` 保持 false 或 null

### Requirement: 異常掃描 Cron
系統 SHALL 每日執行異常掃描，統計當日異常事件。

#### Scenario: 發現異常時通知
- **WHEN** Cron 掃描發現當日有超額折抵或高倍率 flag
- **THEN** 發送摘要 email 給管理員，列出所有異常事件
