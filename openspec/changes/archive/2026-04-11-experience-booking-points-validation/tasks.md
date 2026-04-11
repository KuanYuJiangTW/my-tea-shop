## 1. 修正帳戶頁面預約金額顯示

- [x] 1.1 更新 `src/app/account/page.tsx`：在 `experience_bookings` 的 SELECT query 中加入 `points_discount`
- [x] 1.2 更新 `src/app/account/AccountClient.tsx` 的 `BookingRow` 型別：新增 `points_discount: number`
- [x] 1.3 更新 `src/app/account/AccountClient.tsx` 第 632 行附近的金額顯示：改為 `(booking.total_price - (booking.points_discount || 0)).toLocaleString()`

## 2. 驗證：點數折抵結帳流程

- [x] 2.1 本機測試：使用有 ≥ 200 點的帳號預約體驗，輸入 `pointsToUse`（100 的倍數），確認折抵金額顯示正確、ECPay 付款金額已扣除折抵
- [x] 2.2 本機測試：付款成功後，確認 `point_transactions` 中有 `type = "redeem"` 記錄，且 `experience_bookings.points_used` 與 `points_discount` 已正確寫入
- [x] 2.3 本機測試：帳戶頁面顯示該預約的應付金額正確（= `total_price - points_discount`）

## 3. 驗證：體驗完成後積點發放

- [x] 3.1 本機測試：後台將預約狀態標記為 `completed`，確認 `point_transactions` 中新增 `type = "earn"` 記錄，`points = floor((total_price - points_discount) / 10)`
- [x] 3.2 本機測試：再次將同一預約 PATCH 為 `completed`（或刷新），確認不重複發放積點

## 4. 驗證：取消預約退還點數

- [x] 4.1 本機測試：取消一筆已確認（`confirmed`）且有點數折抵的預約，確認 `point_transactions` 中有按退款比例退還的 `type = "earn"` 記錄
- [x] 4.2 本機測試：後台取消一筆有點數折抵的預約，確認同上邏輯正確執行
- [x] 4.3 本機測試：取消 `pending_payment` 狀態的預約，確認退款比例為 0，不退還點數
