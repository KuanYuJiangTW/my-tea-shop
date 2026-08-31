# points-expiry-notification Specification

## Purpose
點數到期前的 email 通知，以及每日執行的到期通知 cron。點數無預警消失是客訴來源，到期前要先講。

## Requirements

### Requirement: 點數到期前自動發送 email 通知
系統 SHALL 在點數到期前 7 天自動發送 email 通知持有者，提醒即將到期的點數金額。

#### Scenario: 7 天前發送首次通知
- **WHEN** 用戶有點數將在 7 天內到期且尚未發送過通知
- **THEN** 系統發送 email，內容包含到期點數金額、到期日期、及「立即使用」CTA 連結

#### Scenario: 3 天前發送二次提醒
- **WHEN** 用戶有點數將在 3 天內到期且已發送 7 天通知但未發送 3 天通知
- **THEN** 系統發送第二次 email 提醒

#### Scenario: 不重複發送
- **WHEN** 該批次點數已發送過對應天數的通知
- **THEN** 系統不再重複發送

### Requirement: 到期通知 Cron 每日執行
系統 SHALL 提供每日執行的 Cron job 掃描即將到期的點數。

#### Scenario: Cron 正常執行
- **WHEN** 每日 UTC 01:00 觸發
- **THEN** 查詢所有 7 天內到期且未通知的點數記錄，逐一發送通知

#### Scenario: 無到期點數時不發信
- **WHEN** 沒有任何用戶有 7 天內到期的點數
- **THEN** Cron 正常結束，不發送任何 email
