## Context

產品訂單已有完整的積點系統（折抵、累積、取消退還），但體驗預約完全缺失。體驗預約使用獨立的 checkout 流程（`/api/ecpay/experience-checkout`）和 callback（`/api/ecpay/return`），與產品訂單路徑分開，因此需要各自加入積點邏輯。

現有積點規則：最少 200 點才能折抵、100 的倍數、不超過帳戶餘額、不超過訂單金額 10%。體驗預約沿用相同規則。

## Goals / Non-Goals

**Goals:**
- 體驗結帳時可使用點數折抵（驗證規則與產品訂單一致）
- 體驗完成後後台標記時發放積點
- 取消時按退款比例退還已折抵的點數
- 待付款取消不退點數（因為 pending_payment 不會扣點）

**Non-Goals:**
- 不改變現有退款比例計算邏輯
- 不為體驗預約加入優惠券系統（本次只做積點）
- 不自動標記體驗完成（仍由後台手動操作）

## Decisions

### 決策 1：積點在體驗完成時發放，不是付款時

**選擇**：後台 PATCH `/api/admin/experience-bookings/[id]` 標記 `status = "completed"` 時發放。

**原因**：與產品訂單一致（訂單需後台確認完成才給點）。付款後就給點，一旦取消需要反扣，邏輯複雜；完成後才給點，取消不涉及已發積點的退還。

### 決策 2：點數扣除時機在 experience-checkout，不在 bookings 建立時

**選擇**：`POST /api/ecpay/experience-checkout` 時驗證並記錄 `pointsToUse`，實際扣點在此處執行。

**原因**：ECPay 付款前才確認金額，避免建立預約後未付款卻已扣點。與產品訂單的 `ecpay/checkout` 做法一致。

**替代方案考量**：在 `POST /api/bookings` 就扣點 → 若用戶建立預約後放棄付款，點數被鎖住但預約未完成，需要額外的到期退還機制，複雜度高。

### 決策 3：退還點數 = floor(points_used × refundRate)

**選擇**：按退款比例退還，與現金退款一致。

**原因**：點數折抵等同現金折扣，退款 50% 就退 50% 點數，邏輯對稱，易於向用戶解釋。全退則可能被用來免費賺點（折抵後取消但點數全還）。

### 決策 4：experience_bookings 新增欄位

新增 `points_used INTEGER DEFAULT 0` 和 `points_discount INTEGER DEFAULT 0`，記錄折抵點數數量和對應折抵金額（分）。

## Risks / Trade-offs

- [風險] 資料庫 schema 變更需 migration → 用 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 安全處理，欄位有 DEFAULT 0 不影響現有資料
- [風險] 後台標記完成重複發點 → 發點前先查 `point_transactions` 是否已有此 booking 的 earn 記錄
- [Trade-off] 點數折抵在 checkout 才扣，使用者在預約頁看不到折抵後金額 → 前端結帳頁顯示折抵預覽即可解決
