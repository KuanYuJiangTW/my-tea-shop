# experience-booking-points Specification

## Purpose
體驗預約的點數折抵與發放：扣點時點、同筆預約防重複、以及一律以帳本（point_transactions）為準的計算原則。

> **制度沿革（2026-08-01 以線上資料核實，見稽核 SQL 第 7 段的實際輸出）**
>
> 體驗預約的點數在 `2e1da44`（2026-04-11 09:19 +0800）到 `abae014` 之間是
> **舊制 100:1**：每 100 點折抵 NT$1，最低 200 點且須為 100 的倍數，
> 折抵上限固定 10%。時間線上有三個各自留下痕跡的轉折：
>
> 1. **`2e1da44` ~ `d104048`（4/11 10:05 +0800）**：扣點與退點都寫進
>    `point_transactions.order_id`，該欄有 FK 指向 `orders`，**insert 靜默失敗**。
>    線上仍存有這種只有預約、沒有任何帳本記錄的資料（`aef4f39e`）。
>    這類預約若被取消，舊程式碼會依 `points_discount` 憑空發點——它有一筆
>    「取消退還」卻從來沒被扣過。
> 2. **`d104048` 之後**：改寫 `booking_id`，扣點開始成功，值是 `-points_used`。
> 3. **`abae014` + `points_system.sql:132` 的 migration**：
>    `UPDATE point_transactions SET points = ROUND(points/100)` 把**整個帳本**
>    除以 100，於是舊制的 −600 變成 −6。但同一份 migration 的 backfill
>    （第 150 行）**只處理 `orders`，沒有動 `experience_bookings`**，
>    所以 `points_used` 至今仍是換算前的 600。
>
> 結果：舊制預約的 `points_used`(600) 與帳本(−6) 相差 100 倍，
> 而 `points_discount`(6) 與帳本**碰巧一致**。
>
> 「碰巧一致」不是可以依賴的性質——帳本已經被 migration 單方面改寫過一次，
> `experience_bookings` 沒跟上；下一次制度變更會再分歧一次。
> 任何「該退多少點」的計算一律以 `point_transactions` 為準，不讀那兩個欄位。
> 另注意舊制的退還記錄 type 寫成 `earn` 而非 `refund`（線上有 7 筆），
> 計算「已退」時必須納入，否則補償會重複發點。
> 稽核用 `supabase/audit-experience-booking-points.sql`。
>
> 以下描述的是**現行新制（1:1）**。

## Requirements

### Requirement: 體驗結帳時可使用會員點數折抵金額
系統 SHALL 在 `POST /api/ecpay/experience-checkout` 接受 `pointsToUse` 參數，
以與產品訂單相同的 `validateRedemption()` 驗證後執行扣點。**1 點折抵 NT$1**。

#### Scenario: 點數折抵驗證通過
- **WHEN** `pointsToUse` 符合：≥ `MIN_POINTS_USE`（10 點）、不超過帳戶有效餘額、
  不超過 `floor(total_price × 會員等級的 max_discount_rate)`
- **THEN** 插入 `type = "redeem"`、`booking_id` 記錄對應預約、`points = -pointsToUse`
  的交易記錄，實際付款金額 = `total_price - pointsToUse`

#### Scenario: 低於最低使用點數
- **WHEN** `0 < pointsToUse < 10`
- **THEN** 系統回傳 HTTP 400 `{ error: "最低使用 10 點" }`

#### Scenario: 點數不足
- **WHEN** `pointsToUse` 超過 `getValidBalance()`（未過期正向點數 + 所有負向點數）
- **THEN** 系統回傳 HTTP 400 `{ error: "點數不足" }`

#### Scenario: 折抵金額超過等級上限
- **WHEN** `pointsToUse > floor(total_price × tier.max_discount_rate)`
  （standard 0.10 / silver 0.15 / gold 0.20）
- **THEN** 系統回傳 HTTP 400 `{ error: "點數折抵上限為 NT${上限}" }`

#### Scenario: 未使用點數
- **WHEN** `pointsToUse` 為 0 或未傳入
- **THEN** 正常建立結帳，不扣點數，`experience_bookings.points_used = 0`

### Requirement: 同一筆預約不得重複扣點
系統 SHALL 在扣點前檢查該預約是否已有 `type = "redeem"` 的交易記錄。
`points_used` / `points_discount` 是覆蓋而非累加，重複扣點的部分在取消時退不回來。

#### Scenario: 重複呼叫結帳
- **WHEN** 該 `booking_id` 已存在 `type = "redeem"` 記錄
  （客人從綠界返回上一頁、重整、換付款方式）
- **THEN** 不再扣點，沿用 `experience_bookings` 既有的 `points_used` / `points_discount`
  計算金額，正常回傳綠界參數

#### Scenario: 重複呼叫時帶入不同的點數
- **WHEN** 已扣過點，但本次請求帶入不同的 `pointsToUse`
- **THEN** 忽略本次的 `pointsToUse`，以既有折抵為準

### Requirement: 體驗完成後發放積點
系統 SHALL 在預約狀態轉為 `completed` 時，檢查是否已發放積點，若未發放則以
`issuePoints()` 計算並寫入。發放點數 = `floor(earnBase × tier.points_rate × 活動倍率)`，
其中 `earnBase = max(total_price - points_discount, 0)`。

轉為 `completed` 有兩條路徑，兩條都 SHALL 執行相同的發點邏輯：
- 後台手動：`PATCH /api/admin/experience-bookings/[id]`
- 自動：`GET /api/cron/complete-bookings`（活動結束滿 7 天的 `confirmed` 預約）

#### Scenario: 首次標記完成發放積點
- **WHEN** 預約由非 `completed` 轉為 `completed`，且該預約無 `type = "earn"` 的點數記錄
- **THEN** 插入 `point_transactions`（`type = "earn"`、`booking_id`、
  `expires_at = now() + 365 days`），並累加年消費、檢查升等

#### Scenario: 重複標記完成不重複發點
- **WHEN** 已 `completed` 的預約再次被標記為 `completed`，且該預約已有 earn 記錄
- **THEN** 系統不再插入新的點數記錄，回傳正常成功回應

#### Scenario: 取消或 pending_payment 狀態不發點
- **WHEN** 預約狀態為 `cancelled` 或 `pending_payment`
- **THEN** 系統不發放任何積點

### Requirement: experience_bookings 記錄點數折抵資訊
系統 SHALL 在 `experience_bookings` 表儲存 `points_used`（折抵點數數量）與
`points_discount`（折抵金額，單位：元）。新制兩者相等。

這兩欄是**顯示用**的快照，不是退還依據——舊制資料裡它們相差 100 倍。

#### Scenario: 有折抵時記錄欄位
- **WHEN** 結帳時使用點數折抵
- **THEN** `points_used` 與 `points_discount` 皆記錄 `pointsToUse`

#### Scenario: 無折抵時欄位預設為 0
- **WHEN** 結帳時未使用點數
- **THEN** `points_used = 0`、`points_discount = 0`

### Requirement: 點數在導向金流前就扣除，逾期未付款由 cron 收回
系統 SHALL 在**建立綠界結帳參數時**扣點（而非付款成功後），並以
`GET /api/cron/expire-pending-bookings`（每日 03:30 UTC）清理客人放棄付款後
停在 `pending_payment` 的孤兒預約。

取消條件為**任一**成立：
- `created_at` 早於 `now - 24 小時`
- 場次時間已經過去（場次在 12 小時後開始的預約撐不到逾期就過期了，
  只靠 24 小時規則會漏掉）

#### Scenario: 逾期未付款的預約被自動取消
- **WHEN** `status = "pending_payment"` 且符合上述任一條件
- **THEN** 標記 `cancelled`、`cancellation_reason = "逾期未付款，系統自動取消"`、
  `refund_amount = 0`、`refund_status = "none"`（從未付款，沒有現金要退），
  以 `refundRate = 1` 全額退還帳本上已扣的點數，並寄取消通知信

#### Scenario: 尚未逾期且場次未到
- **WHEN** 預約建立未滿 24 小時，且場次還沒開始
- **THEN** 不處理，保留讓客人繼續付款

#### Scenario: 併發保護
- **WHEN** cron 處理期間該預約已被客人或後台取消
- **THEN** `update` 帶 `.eq("status", "pending_payment")` 而不中，跳過該筆，
  不會重複退點（`refundBookingPoints` 的「減去已退」也會再擋一次）

#### Scenario: pending_payment 不佔名額
- **WHEN** 逾期預約被取消
- **THEN** 不通知候補——DB trigger 只把 `confirmed` 計入 `current_participants`，
  待付款預約從未佔用名額
