# points-liability-report Specification

## Purpose
未兌現點數的負債計算、點數過期的沖銷事件記錄，以及 earnBase 以 subtotal 為準的定義。

## Requirements

### Requirement: 未兌現點數負債計算
系統 SHALL 計算所有有效未使用點數的總金額（1:1），作為合約負債估算。

#### Scenario: 計算當前負債
- **WHEN** 管理員查看儀表板
- **THEN** 顯示「未兌現點數負債」= 所有用戶有效點數餘額加總 × NT$1

#### Scenario: 排除已過期點數
- **WHEN** 點數已過期（expires_at < now）
- **THEN** 不計入負債總額

### Requirement: 點數過期沖銷事件記錄
系統 SHALL 在點數過期時記錄沖銷事件，以供帳務認列。

#### Scenario: 每日掃描過期點數
- **WHEN** 每日 Cron 執行時發現有點數的 expires_at 已過期且尚未標記
- **THEN** 記錄沖銷事件到 `points_expiry_events` 表（user_id, points_expired, expired_at）

#### Scenario: 儀表板顯示月度沖銷金額
- **WHEN** 管理員查看儀表板
- **THEN** 顯示「本月過期沖銷」金額

### Requirement: earnBase 定義為 subtotal
系統 SHALL 以商品小計（subtotal）作為點數發放基礎，不含運費、折價券折扣、點數折抵。

#### Scenario: 計算 earnBase
- **WHEN** 訂單完成觸發點數發放
- **THEN** earnBase = order.subtotal（商品原價合計）
