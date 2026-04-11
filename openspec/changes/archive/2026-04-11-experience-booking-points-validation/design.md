## Context

體驗預約積點系統（change: experience-booking-points）已完成資料庫 schema、API 邏輯與前端 UI 的實作，包含點數折抵結帳、完成後發放積點、取消退還積點等功能。

**Bug 根本原因**：`account/page.tsx` 的 Supabase 查詢未 SELECT `points_discount` 欄位，且 `AccountClient.tsx` 的本地型別 `BookingRow` 未宣告此欄位，導致前端在顯示 `pending_payment` 與 `confirmed` 狀態預約時，金額始終顯示 `total_price`（原始價格），而非實際應付金額 `total_price - points_discount`。

## Goals / Non-Goals

**Goals:**
- 修正帳戶頁面預約清單中 `pending_payment` / `confirmed` 訂單的顯示金額（扣除點數折抵）
- 補上 `account/page.tsx` Supabase SELECT 的缺漏欄位 `points_discount`
- 修正 `BookingRow` 型別宣告
- 完成端對端驗證測試（結帳積點折抵、完成發放、取消退還）

**Non-Goals:**
- 不修改積點折抵的業務邏輯（已於 experience-booking-points change 完成）
- 不更動資料庫 schema（migration 已執行）
- 不改變 `total_price` 欄位本身的值（保留原始金額，`points_discount` 獨立記錄折抵）

## Decisions

### 1. 顯示金額 = `total_price - points_discount`，不修改 DB 欄位
`total_price` 保持為原始計算金額（price × participantCount），`points_discount` 記錄折抵金額。前端顯示時動態計算「應付金額」。

**為何不將 `total_price` 直接寫入扣除後的金額？** 因為 `total_price` 是歷史事實（原始報價），將折抵拆開記錄可方便後續稽核、退款比例計算（已有邏輯依賴 `total_price`）。

### 2. 只在帳戶頁修正顯示，不變動 admin 後台顯示
後台顯示 `total_price` 是合理的（管理者需要看原始金額與折抵明細）。

### 3. 驗證測試以本機手動測試為主
積點流程涉及 ECPay 金流回調、Supabase RLS 等，不適合純單元測試。以整合場景手動驗收為主。

## Risks / Trade-offs

- **[Risk] 點數 redeem 先於 ECPay 付款**：使用者取得結帳 URL 後中途放棄，點數已被扣除但 booking 仍為 `pending_payment`。→ 現行機制於取消時退還，但若使用者不取消（自然過期）則需額外清理。此為已知限制，不在本 change 範圍內。
- **[Risk] 重複發放積點**：`completed` 狀態重複 PATCH 可能觸發兩次積點。→ 已有防重複邏輯（查詢是否已有 earn 記錄），驗證測試需確認此邏輯有效。

## Migration Plan

1. 修正 `account/page.tsx` 的 SELECT query
2. 修正 `AccountClient.tsx` 的 `BookingRow` 型別與顯示邏輯
3. 本機執行端對端驗證（4 個場景）
4. 無 DB migration，無需 rollback 計畫
