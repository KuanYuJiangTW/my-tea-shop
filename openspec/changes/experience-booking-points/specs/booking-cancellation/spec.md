## ADDED Requirements

### Requirement: 取消已確認預約時按退款比例退還折抵點數
系統 SHALL 在取消 `status = "confirmed"` 的預約時，計算應退還點數並插入 `point_transactions`。

#### Scenario: 7 天前取消（100% 退款）退還全部點數
- **WHEN** 距活動開始 ≥ 168 小時，且 `booking.points_used > 0`
- **THEN** 插入 `type = "earn"`、`amount = points_used`、`description = "體驗預約取消退還點數"` 的交易記錄

#### Scenario: 3–6 天前取消（50% 退款）退還一半點數
- **WHEN** 距活動開始 72–167 小時，且 `booking.points_used > 0`
- **THEN** 插入 `type = "earn"`、`amount = floor(points_used × 0.5)` 的交易記錄

#### Scenario: 1–2 天前取消（20% 退款）退還 20% 點數
- **WHEN** 距活動開始 24–71 小時，且 `booking.points_used > 0`
- **THEN** 插入 `type = "earn"`、`amount = floor(points_used × 0.2)` 的交易記錄

#### Scenario: 未滿 24 小時取消（0% 退款）不退點數
- **WHEN** 距活動開始 < 24 小時
- **THEN** 不插入任何點數退還記錄

#### Scenario: 未使用點數取消
- **WHEN** `booking.points_used = 0`
- **THEN** 不插入任何點數交易記錄

### Requirement: 取消待付款預約不處理點數
系統 SHALL 在取消 `status = "pending_payment"` 的預約時，不執行任何點數操作。

#### Scenario: 取消待付款預約
- **WHEN** `booking.status = "pending_payment"`
- **THEN** 預約標記為 `cancelled`，不插入任何 `point_transactions` 記錄
