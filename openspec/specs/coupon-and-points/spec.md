## ADDED Requirements

### Requirement: 折價券為用戶專屬且單次使用
系統 SHALL 驗證折價券的 `user_id` 符合當前用戶、`used_at` 為 null、`expires_at` 未過期。

#### Scenario: 使用有效折價券
- **WHEN** `couponCode` 存在且通過所有驗證
- **THEN** `couponDiscount = coupon.discount_amount`，於訂單建立後標記 `used_at`

#### Scenario: 折價券已使用或不存在
- **WHEN** 找不到符合條件的折價券
- **THEN** 系統回傳 HTTP 400 `{ error: "折價券無效或已使用" }`

### Requirement: 折價券有最低消費門檻
系統 SHALL 在 `subtotal + shippingFee < coupon.min_order_amount` 時拒絕使用。

#### Scenario: 未達最低消費
- **WHEN** 訂單金額（含運費）未達折價券 `min_order_amount`
- **THEN** 系統回傳 HTTP 400，並告知最低消費金額

### Requirement: 點數折抵最少 200 點，須為 100 的倍數
系統 SHALL 拒絕不符格式的點數折抵請求。

#### Scenario: 點數格式不符
- **WHEN** `pointsToUse < 200` 或 `pointsToUse % 100 !== 0`
- **THEN** 系統回傳 HTTP 400 `{ error: "點數最少 200 點，且須為 100 的倍數" }`

### Requirement: 點數折抵不得超過帳戶餘額
系統 SHALL 計算 `point_transactions` 總和作為點數餘額，拒絕超額使用。

#### Scenario: 點數不足
- **WHEN** 帳戶點數餘額 < `pointsToUse`
- **THEN** 系統回傳 HTTP 400 `{ error: "點數不足" }`

### Requirement: 點數折抵上限為訂單（扣折價券後）金額的 10%
每 100 點折抵 NT$1，最高折抵 `floor((subtotal + shippingFee - couponDiscount) × 0.1)` 元。

#### Scenario: 點數折抵超過上限
- **WHEN** `pointsToUse / 100 > maxDiscount`
- **THEN** 系統回傳 HTTP 400，並告知折抵上限

### Requirement: 點數於訂單建立時即扣除，完成後才累積
系統 SHALL 在訂單建立時立即從 `point_transactions` 插入扣除記錄（`type: "redeem"`），防止重複使用。點數累積（`type: "earn"`）由後台人工確認完成後才發放。

#### Scenario: 使用點數下單
- **WHEN** 訂單建立成功且 `pointsUsed > 0`
- **THEN** 插入 `{ points: -pointsUsed, type: "redeem" }` 記錄

### Requirement: 取消訂單時還原折價券與點數
系統 SHALL 在訂單取消時還原兩種折價券並插入點數還原記錄。會員自助取消
（`POST /api/orders/[id]/cancel`）與後台取消（`PATCH /api/admin/orders/[id]`）
兩條路徑 SHALL 有一致的還原行為。

`orders.coupon_id` 同時存兩種識別碼——批次券存 `coupons.id`、通用碼存
`coupon_templates.id`，訂單上沒有欄位分辨種類。因此還原 SHALL 兩邊都做，
且通用碼 SHALL 以 `coupon_usages.order_id` 為鍵刪除（不需先判斷種類）。

#### Scenario: 取消訂單還原批次券
- **WHEN** 訂單成功取消，`coupon_id` 指向一張批次券
- **THEN** 該券 `used_at = null`、`order_id = null`

#### Scenario: 取消訂單還原通用碼
- **WHEN** 訂單成功取消
- **THEN** 刪除 `coupon_usages` 中 `order_id` 等於該訂單的記錄，使該碼不再佔用
  `max_uses_per_user` 與 `max_uses` 額度

#### Scenario: 取消訂單退還點數
- **WHEN** 訂單成功取消且 `points_used > 0`
- **THEN** 插入 `{ points: +points_used, type: "refund" }` 還原記錄。退還量 SHALL
  等於下單時 `deductPoints` 扣除的量（即 `points_used`），**不得**改用
  `points_discount`（那是折抵金額）或對其做任何比例換算

### Requirement: 使用者可查詢可用折價券與點數明細
系統 SHALL 提供 `GET /api/user/coupons`（未使用且未過期）與 `GET /api/user/points`（餘額 + 最近 20 筆記錄）。

#### Scenario: 查詢折價券
- **WHEN** 登入使用者呼叫 `GET /api/user/coupons`
- **THEN** 回傳未使用且有效的折價券列表，依到期日升序排列

#### Scenario: 查詢點數
- **WHEN** 登入使用者呼叫 `GET /api/user/points`
- **THEN** 回傳 `{ balance, transactions }` （最近 20 筆）
