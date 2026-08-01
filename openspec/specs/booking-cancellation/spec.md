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

### Requirement: 取消預約時依帳本退還折抵點數
系統 SHALL 以 `refundBookingPoints()` 退還點數，退還量一律以 `point_transactions`
為準，**不得**讀 `experience_bookings.points_used` 或 `points_discount`。

> 那兩欄會隨制度漂移：`points_system.sql:132` 的 migration 把整個帳本除以 100，
> 卻沒有 backfill `experience_bookings`，於是舊制預約的 `points_used`(600) 與
> 帳本(−6) 相差 100 倍。`points_discount`(6) 目前碰巧與帳本一致，但那是
> migration 的副作用而非設計，不可依賴。
> 完整沿革（含線上實據）見 `openspec/specs/experience-booking-points/spec.md` 檔頭。

計算式：`應退 = floor(帳本已扣總額 × refundRate) − 已退總額`。

- 帳本已扣總額 = 該預約所有 `type = "redeem"` 記錄的絕對值總和
- 已退總額 = `type = "refund"` 的總和，加上 `type = "earn"` 且 description 含
  「取消退還」的總和（舊制的退還記錄誤寫成 `earn`）
- 查詢 SHALL 同時比對 `booking_id` 與 `order_id` 兩個欄位
  （`d104048` 之前的體驗記錄寫在 `order_id`）

「減去已退」同時帶來冪等性：重複觸發不重複退，對被舊 bug 少退過的預約只補差額。

#### Scenario: 7 天前取消（100% 退款）退還全部點數
- **WHEN** `status = "confirmed"`，距活動開始 ≥ 168 小時
- **THEN** 插入 `type = "refund"`、`points = 帳本已扣總額 − 已退總額`、
  `booking_id`、`description = "體驗預約取消退還點數"` 的交易記錄

#### Scenario: 3–6 天前取消（50% 退款）退還一半點數
- **WHEN** `status = "confirmed"`，距活動開始 72–167 小時
- **THEN** 退還 `floor(帳本已扣總額 × 0.5) − 已退總額`

#### Scenario: 1–2 天前取消（20% 退款）退還 20% 點數
- **WHEN** `status = "confirmed"`，距活動開始 24–71 小時
- **THEN** 退還 `floor(帳本已扣總額 × 0.2) − 已退總額`

#### Scenario: 未滿 24 小時取消（0% 退款）不退點數
- **WHEN** `status = "confirmed"`，距活動開始 < 24 小時
- **THEN** 不插入任何點數退還記錄

#### Scenario: 帳本與 experience_bookings 的欄位不一致
- **WHEN** 預約的 `points_used = 3300`、`points_discount = 33`，帳本扣的是 300
- **THEN** 7 天前取消退還 **300** 點——以帳本為準，兩個欄位都不看

#### Scenario: 帳本完全沒有扣點記錄（舊制 FK 失敗的預約）
- **WHEN** 預約的 `points_used > 0`，但該預約沒有任何 `redeem` 記錄
- **THEN** 不退還任何點數（舊程式碼會依 `points_discount` 憑空發點）

#### Scenario: 已被舊 bug 少退過的預約
- **WHEN** 帳本已扣 500、已退 5（舊 bug 退的）
- **THEN** 補退 495 點，總計退還 500

#### Scenario: 完成回饋的 earn 不算已退
- **WHEN** 帳本有 `type = "earn"`、description 為「體驗完成回饋」的記錄
- **THEN** 該筆不計入「已退總額」，不影響退點金額

#### Scenario: 未使用點數取消
- **WHEN** 該預約沒有任何 `redeem` 記錄
- **THEN** 不插入任何點數交易記錄

### Requirement: 取消待付款預約時全額退還點數
系統 SHALL 在取消 `status = "pending_payment"` 的預約時，以 `refundRate = 1`
全額退還帳本上已扣的點數。

> 點數在導向綠界**之前**就扣掉了（見 experience-booking-points 規格），
> 待付款預約同樣可能已扣點。退款比例是針對「已成立的預約臨時取消」的違約金，
> 未付款的預約不適用。

#### Scenario: 取消待付款預約
- **WHEN** `booking.status = "pending_payment"`，帳本已扣 500 點
- **THEN** 預約標記為 `cancelled`、`refund_amount = 0`（本來就沒付現金），
  並全額退還 500 點——不論距活動多久
