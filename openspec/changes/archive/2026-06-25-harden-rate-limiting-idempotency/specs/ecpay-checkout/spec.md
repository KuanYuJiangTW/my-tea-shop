## ADDED Requirements

### Requirement: Idempotent payment notification processing

ECPay server 端付款通知（`/api/ecpay/return`）SHALL 以冪等方式處理：對同一筆交易的重複或重放的合法通知，付款後處理（扣庫存、確認預約、寄送通知信）SHALL 至多執行一次（exactly-once）。

#### Scenario: 重放一般商品訂單通知

- **WHEN** 收到簽章合法、`RtnCode=1` 的訂單付款通知，但該訂單的 `payment_status` 已非 `pending`
- **THEN** 系統 SHALL 不再扣減庫存、不再寄送訂單確認信，並仍回應 `1|OK`

#### Scenario: 重放體驗預約通知

- **WHEN** 收到簽章合法、`RtnCode=1` 的體驗預約付款通知，但該預約的 `status` 已非 `pending_payment`
- **THEN** 系統 SHALL 不再重複確認預約、不再寄送預約確認信，並仍回應 `1|OK`

#### Scenario: 首次合法通知

- **WHEN** 收到簽章合法、`RtnCode=1` 的通知，且訂單/預約仍為待付款狀態
- **THEN** 系統 SHALL 將其標記為已付款/已確認，並執行扣庫存與寄信各一次
