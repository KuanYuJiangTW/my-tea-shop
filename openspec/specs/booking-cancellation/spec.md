## ADDED Requirements

### Requirement: 只有訂購人本人可以取消預約
系統 SHALL 驗證請求使用者的 `user_id` 與預約記錄相符。

#### Scenario: 他人嘗試取消預約
- **WHEN** 使用者嘗試取消非自己的預約
- **THEN** 系統回傳 HTTP 404（視同找不到）

### Requirement: 只有 pending_payment 或 confirmed 狀態的預約可取消
系統 SHALL 拒絕對已取消（`cancelled`）預約的再次取消請求。

#### Scenario: 取消已取消的預約
- **WHEN** `booking.status = "cancelled"`
- **THEN** 系統回傳 HTTP 409 `{ error: "此預約無法取消" }`

### Requirement: 待付款預約取消不退款
系統 SHALL 對 `status = "pending_payment"` 的預約，設定 `refund_amount = 0`，`refund_status = "none"`。

#### Scenario: 取消待付款預約
- **WHEN** `booking.status = "pending_payment"`
- **THEN** 預約更新為 `cancelled`，`refund_amount = 0`，不寄退款通知，不通知候補

#### Scenario: 候補通知邏輯（待付款）
- **WHEN** 待付款預約取消
- **THEN** 系統 SHALL NOT 呼叫 `notifyNextWaitlist`（因未佔用確認名額）

### Requirement: 已確認預約依距離活動時間計算退款比例
系統 SHALL 依以下規則計算 `refund_amount`：

| 距活動時間 | 退款比例 |
|-----------|---------|
| ≥ 168 小時（7 天） | 100% |
| ≥ 72 小時（3 天） | 50% |
| ≥ 24 小時（1 天） | 20% |
| < 24 小時 | 0% |

`refund_amount = floor(total_price × refundRate)`

#### Scenario: 7 天前取消
- **WHEN** 距活動開始 ≥ 168 小時
- **THEN** `refund_amount = total_price`，`refund_status = "pending"`

#### Scenario: 3–6 天前取消
- **WHEN** 距活動開始 72–167 小時
- **THEN** `refund_amount = floor(total_price × 0.5)`，`refund_status = "pending"`

#### Scenario: 1–2 天前取消
- **WHEN** 距活動開始 24–71 小時
- **THEN** `refund_amount = floor(total_price × 0.2)`，`refund_status = "pending"`

#### Scenario: 未滿 24 小時取消
- **WHEN** 距活動開始 < 24 小時
- **THEN** `refund_amount = 0`，`refund_status = "none"`

### Requirement: 取消後寄送取消確認 Email
系統 SHALL 在取消成功後，寄送取消確認信給預約者，包含退款金額資訊。

#### Scenario: 取消成功後寄信
- **WHEN** 預約成功取消
- **THEN** 寄送 Email 給 `booker_email`，內含體驗名稱、場次資訊、退款金額

### Requirement: 已確認預約取消後通知候補
系統 SHALL 在 `confirmed` 預約取消後呼叫 `notifyNextWaitlist`。

#### Scenario: confirmed 預約取消觸發候補通知
- **WHEN** `status = "confirmed"` 的預約成功取消
- **THEN** 呼叫 `notifyNextWaitlist(sessionId, participantCount)`（fire-and-forget）

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
