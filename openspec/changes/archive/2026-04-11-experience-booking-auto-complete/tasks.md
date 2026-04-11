## 1. Cron Job：自動完成預約並發放積點

- [x] 1.1 建立 `src/app/api/cron/complete-bookings/route.ts`：以 `CRON_SECRET` 驗證請求，查詢 `status = "confirmed"` 且 `session_date + start_time + 7天 < NOW()` 的預約，批次更新為 `completed`，對每筆 `user_id` 不為 null 且無對應 earn 記錄的預約插入積點（`earnPoints = floor((total_price - points_discount) / 10)`，`type = "earn"`，`expires_at = now() + 365 days`）
- [x] 1.2 在 `vercel.json` 的 `crons` 陣列新增 `{ "path": "/api/cron/complete-bookings", "schedule": "0 2 * * *" }`

## 2. 後台 UI：標記完成按鈕、已完成 tab、視覺提示

- [x] 2.1 在 `AdminBookingsClient.tsx` 的 `statusLabel` 與 `statusStyle` 新增 `completed: "已完成"` 及對應樣式（藍色系）
- [x] 2.2 在篩選 tab 陣列新增 `{ value: "completed", label: "已完成" }`（排在「已取消」之前）
- [x] 2.3 在表格列的條件判斷新增 `isCompleted = b.status === "completed"`；活動已過的 confirmed 預約（`sessionDateTime < now && isConfirmed`）套用黃底 `bg-amber-50` row 樣式
- [x] 2.4 在「操作」欄新增「標記完成」按鈕：條件為 `isConfirmed && sessionDateTime < new Date()`，點擊後呼叫 `PATCH /api/admin/experience-bookings/${b.id}` with `{ status: "completed" }`，成功後更新本地狀態為 `completed`
- [x] 2.5 新增 `handleMarkComplete(id)` async function，含 loading 狀態（複用 `processing` state）

## 3. 前台會員中心：已完成狀態

- [x] 3.1 更新 `src/app/account/AccountClient.tsx` 的 `BookingRow` 型別：`status` 新增 `"completed"` 選項
- [x] 3.2 更新 `bookingStatusLabel` function：新增 `completed` 回傳 `{ label: "已完成", cls: "bg-emerald-100 text-emerald-700" }`
- [x] 3.3 更新預約列表渲染邏輯：`isCompleted = booking.status === "completed"`；`isPast` 條件改為 `isConfirmed || isCompleted`（讓已完成的預約也能顯示評價按鈕）；`completed` 狀態不顯示取消按鈕與補填資料按鈕
- [x] 3.4 確認 `src/app/account/page.tsx` 的 Supabase query 無 status 篩選條件（已撈取所有狀態，`completed` 自動包含）

## 4. 驗證測試

- [x] 4.1 本機測試：後台對一筆活動已過的 `confirmed` 預約點「標記完成」，確認狀態變更、積點發放、按鈕消失
- [x] 4.2 本機測試：呼叫 `GET /api/cron/complete-bookings`（附帶 `Authorization` header），確認符合條件的預約自動完成、積點發放、已有 earn 記錄的不重複發放
- [x] 4.3 本機測試：前台會員中心「已完成」的預約顯示正確標籤與金額，且可點擊評價按鈕
- [x] 4.4 本機測試：後台「已完成」tab 可正確篩選顯示
