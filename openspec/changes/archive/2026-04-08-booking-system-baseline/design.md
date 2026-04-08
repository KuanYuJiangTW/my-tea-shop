## Context

茶藝店預約系統為既有已上線功能。使用 Next.js App Router API Routes 處理商業邏輯，Supabase 作為資料庫（PostgreSQL + RLS），ECPay 處理金流，Resend 寄送 Email 通知。系統需支援最多 5 種茶藝體驗、多場次管理、候補名單、以及退款計算。

## Goals / Non-Goals

**Goals:**
- 記錄現有預約系統的技術設計決策
- 作為後續功能開發的參考基準

**Non-Goals:**
- 重新設計任何現有功能
- 說明如何遷移或重構現有資料庫

## Decisions

### D1：預約狀態機

採用單一 `status` 欄位管理預約生命週期：

```
pending_payment → confirmed（付款成功後由 ECPay callback 觸發）
pending_payment → cancelled（使用者主動取消，不退款）
confirmed → cancelled（使用者主動取消，依時間退款）
```

**理由**：狀態清晰，RLS 與查詢條件簡單。`pending_payment` 不視為有效名額（`current_participants` 只計算 `confirmed`），避免名額被長時間占用。

### D2：名額計算用 Supabase Trigger

`booking_participants` Trigger（`trg_booking_participants`）在每次預約 insert/update/delete 後，自動重算 `experience_sessions.current_participants`，並在達到 `max_participants` 時更新場次狀態為 `full`。

**理由**：避免 race condition，確保名額計算的一致性，不依賴應用層加鎖。

### D3：候補通知採先進先出 + 人數篩選

取消預約後呼叫 `notifyNextWaitlist(sessionId, freedSlots)`，找 `waiting` 狀態中 `participant_count <= freedSlots` 的最早一筆。通知後設定 24 小時確認截止時間。

**理由**：先進先出公平，人數篩選確保通知的候補者確實能填補釋出的名額。

### D4：Cron Job 承擔三類定期任務

每天 01:00 UTC（台灣時間 09:00）執行：
1. **活動前 5 天**：提醒尚未填寫參加者資料的預約者
2. **活動前 3 天**：若總人數 < `min_participants`，系統自動取消場次並全額退款；否則寄出確認開課通知
3. **活動前 1 天**：寄出活動提醒
4. **清理過期候補**：將已超過 `confirm_deadline` 的 `notified` 記錄標為 `expired`，並通知下一位

受 `CRON_SECRET` 保護，只接受 Vercel Cron 呼叫。

### D5：退款為手動處理

取消時計算 `refund_amount` 並設定 `refund_status: "pending"`，但實際退款動作由人工在 ECPay 後台操作。

**理由**：ECPay 退款 API 需要額外整合成本，初期以人工處理降低複雜度。

**退款比例：**
| 距活動時間 | 退款比例 |
|-----------|---------|
| 7 天以上 | 100% |
| 3–6 天 | 50% |
| 1–2 天 | 20% |
| 未滿 24 小時 | 0% |
| 待付款取消 | 0%（未付款，無需退款）|

## Risks / Trade-offs

- **[名額 race condition 風險]** → Trigger 確保計算正確，但兩個用戶同時搶最後一個名額仍可能雙雙通過 `status !== "open"` 檢查。目前以「插入後 Trigger 會修正 status」為緩解，可觀察是否需要加 DB-level lock。
- **[候補通知信可能寄出後名額又被搶走]** → `confirm` 時再次驗證剩餘名額，若不足則立即 expire 並通知下一位。
- **[退款需人工處理]** → 退款可能有延遲，需管理員定期檢查 `refund_status = "pending"` 的記錄。
