> **制度沿革警告（2026-08-01 更新）**
>
> 體驗預約的點數在 `2e1da44`（2026-04-11）到 `abae014` 之間是**舊制 100:1**：
> 每 100 點折抵 NT$1，最低 200 點且須為 100 的倍數，折抵上限固定 10%。
> 當時扣點寫進帳本的是 `points_used`（例：扣 3300 點、`points_discount` 只有 33），
> 且誤寫在 `point_transactions.order_id` 欄位（`d104048` 之後才改用 `booking_id`）。
>
> **資料庫仍可能存有那批舊制預約**，`points_used` 與 `points_discount` 相差 100 倍。
> 任何「該退多少點」的計算都必須以 `point_transactions` 為準，不可讀
> `experience_bookings` 的那兩個欄位——這份規格的舊版本就是因為描述舊制，
> 誤導出「取消時只退 1% 點數」的程式碼。稽核用
> `supabase/audit-experience-booking-points.sql`。
>
> 以下描述的是**現行新制（1:1）**。

## ADDED Requirements

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

### Requirement: 點數在導向金流前就扣除
系統扣點的時機是**建立綠界結帳參數時**，而非付款成功後。

#### Scenario: 客人放棄付款
- **WHEN** 客人完成結帳但未於綠界付款
- **THEN** 預約停留在 `pending_payment`，扣除的點數在客人主動取消該預約前不會退還

> **已知缺口**：目前沒有清理逾期 `pending_payment` 預約的 cron，
> 這些點數會無限期卡住。盤點用 `audit-experience-booking-points.sql` 第 4 段。
