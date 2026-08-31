# coupon-and-points Specification

## Purpose
折價券與點數的折抵規則：專屬性與單次使用、最低消費門檻、依會員等級的折抵上限，以及扣點與累積的時點。

> **點數制度沿革（改這塊之前先讀）**
>
> 現行為**新制 1:1**：1 點折抵 NT$1，`points_used` 與 `points_discount` 相等。
>
> 資料庫裡**仍存有舊制訂單**（100 點折抵 NT$1）。實例：2026-05-07 的訂單
> `points_used = 3300`、`points_discount = 33`，而 `point_transactions` 帳本
> 只記了 33 點。也就是說**舊訂單的這兩欄不相等，且帳本與 `points_used` 也對不上**。
>
> 因此任何「依訂單欄位反推點數」的邏輯都不安全，一律以 `point_transactions`
> 為準。2026-08-01 曾因此寫出會超額退還 3267 點的程式碼——本規格先前的舊制
> 描述正是誤導來源之一。

## Requirements

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

### Requirement: 點數以 1:1 折抵，最低使用 10 點
1 點 SHALL 折抵 NT$1，即 `pointsDiscount = pointsUsed`。系統 SHALL 拒絕低於
`MIN_POINTS_USE`（現值 10，定義於 `src/lib/points.ts`）的折抵請求。

倍數限制已取消——**不存在** 100 的倍數這類要求，任何 ≥ 10 的整數皆可。

#### Scenario: 低於最低使用點數
- **WHEN** `0 < pointsToUse < MIN_POINTS_USE`
- **THEN** 系統回傳 HTTP 400 `{ error: "最低使用 10 點" }`

#### Scenario: 未使用點數
- **WHEN** `pointsToUse <= 0`
- **THEN** 驗證通過，`pointsUsed = 0`、`pointsDiscount = 0`

### Requirement: 點數折抵不得超過有效餘額
系統 SHALL 以 `getValidBalance()` 計算餘額：正向點數只計入**未過期**者
（`expires_at > now` 或為 null），負向點數（`redeem`）一律計入，總和不小於 0。

#### Scenario: 點數不足
- **WHEN** 有效餘額 < `pointsToUse`
- **THEN** 系統回傳 HTTP 400 `{ error: "點數不足" }`

### Requirement: 點數折抵上限依會員等級而定
上限 SHALL 為 `floor((subtotal + shippingFee - couponDiscount) × tier.max_discount_rate)`，
`max_discount_rate` 來自該會員的 `member_tiers`（見 `supabase/points_system.sql`）：
一般會員 standard 0.10、銀卡 silver 0.15、金卡 gold 0.20。
查不到會員等級時 SHALL 套用 `DEFAULT_TIER`（standard，0.10）。

因為是 1:1，上限的「元」與「點」數值相同，比較時直接以 `pointsToUse` 對比。

#### Scenario: 點數折抵超過上限
- **WHEN** `pointsToUse > floor(afterCouponAmount × tier.max_discount_rate)`
- **THEN** 系統回傳 HTTP 400 `{ error: "點數折抵上限為 NT$<上限>" }`

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
- **WHEN** 訂單成功取消
- **THEN** 退還量 SHALL 由 `point_transactions` 推導：該訂單 `type = "redeem"`
  的絕對值總和，減去已存在的 `type = "refund"` 總和；差額大於 0 才插入
  `{ points: 差額, type: "refund" }`

系統 SHALL **不得**以 `orders.points_used` 或 `orders.points_discount` 作為
退還依據——那兩欄會隨制度變動漂移。線上實據（2026-08-01）：舊制訂單
`points_used = 3300`、`points_discount = 33`，而帳本實際只扣了 33 點；
照 `points_used` 退會憑空發出 3267 點。

「已扣 − 已退」的算法同時提供冪等性。

#### Scenario: 重複觸發取消不重複退點
- **WHEN** 某訂單的退點已全額完成，再次觸發取消流程
- **THEN** 差額為 0，不插入任何新的 `refund` 記錄

### Requirement: 使用者可查詢可用折價券與點數明細
系統 SHALL 提供 `GET /api/user/coupons`（未使用且未過期）與 `GET /api/user/points`
（有效餘額 + 最近 50 筆交易記錄）。

#### Scenario: 查詢折價券
- **WHEN** 登入使用者呼叫 `GET /api/user/coupons`
- **THEN** 回傳未使用且有效的折價券列表，依到期日升序排列

#### Scenario: 查詢點數
- **WHEN** 登入使用者呼叫 `GET /api/user/points`
- **THEN** 回傳 `{ balance, transactions }`，`balance` 為 `getValidBalance()` 的結果，
  `transactions` 為最近 50 筆（含 `type`、`description`、`expires_at`、`multiplier`）
