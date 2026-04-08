## 1. 資料庫 Schema

- [x] 1.1 建立 `experience_types` 資料表（5 種體驗類型）
- [x] 1.2 建立 `experience_sessions` 資料表（場次管理）
- [x] 1.3 建立 `experience_bookings` 資料表（含退款欄位）
- [x] 1.4 建立 `booking_participants` 資料表（參加者資料）
- [x] 1.5 建立 `waitlist_entries` 資料表（候補名單）
- [x] 1.6 建立 `experience_reviews` 資料表（體驗評論）
- [x] 1.7 設定所有資料表的 Row Level Security（RLS）Policy
- [x] 1.8 建立 Trigger：`trg_booking_participants` 自動更新場次 `current_participants`
- [x] 1.9 建立 RPC：`increment_waitlist_count` / `decrement_waitlist_count`

## 2. 預約主流程 API

- [x] 2.1 實作 `POST /api/bookings`（建立預約，驗證名額與成年限制）
- [x] 2.2 實作 `GET /api/bookings/[id]`（查詢單筆預約）
- [x] 2.3 實作 `GET /api/experiences`（取得體驗列表）
- [x] 2.4 實作 `GET /api/experience-sessions`（取得場次列表）
- [x] 2.5 實作 `POST /api/ecpay/experience-checkout`（建立 ECPay 付款）
- [x] 2.6 實作 `POST /api/ecpay/result`（ECPay 付款結果 callback，更新 `confirmed`）

## 3. 取消與退款

- [x] 3.1 實作 `POST /api/bookings/[id]/cancel`（依退款規則計算 `refund_amount`）
- [x] 3.2 待付款取消：不退款、不通知候補
- [x] 3.3 已確認取消：依距活動時間計算退款（100% / 50% / 20% / 0%）
- [x] 3.4 取消後寄送取消確認 Email（含退款金額）

## 4. 候補名單

- [x] 4.1 實作 `POST /api/waitlist`（加入候補，驗證場次為 `full`）
- [x] 4.2 實作 `POST /api/waitlist/[id]/confirm`（候補確認轉正，再次驗證名額）
- [x] 4.3 實作 `notifyNextWaitlist()`（FIFO + 人數篩選，通知後設 24h 截止）
- [x] 4.4 實作 `expireWaitlistAndNotifyNext()`（清理過期候補，通知下一位）

## 5. 參加者資料補填

- [x] 5.1 實作 `POST /api/bookings/[id]/participants`（補填參加者資料）
- [x] 5.2 建立預約時計算 `participants_due_at`（活動前 5 天）

## 6. Cron Job 定期提醒

- [x] 6.1 實作 `GET /api/cron/experience-reminders`（CRON_SECRET 保護）
- [x] 6.2 活動前 5 天：寄送參加者資料補填提醒
- [x] 6.3 活動前 3 天：確認開課或自動取消場次（全額退款）
- [x] 6.4 活動前 1 天：寄送活動提醒 Email
- [x] 6.5 清理過期候補（整合在 Cron 內執行）
- [x] 6.6 設定 Vercel Cron 排程（`vercel.json`，每天 01:00 UTC）

## 7. 後台管理

- [x] 7.1 實作 `GET /api/admin/experience-bookings`（預約列表，含搜尋）
- [x] 7.2 實作 `POST /api/admin/experience-bookings/[id]/cancel`（代為取消）
- [x] 7.3 實作 `GET/POST /api/admin/experience-sessions`（場次管理）
- [x] 7.4 實作 `PATCH /api/admin/experience-sessions/[id]`（更新場次）
- [x] 7.5 後台預約列表支援 CSV 匯出

## 8. Email 通知

- [x] 8.1 預約確認信（付款成功後）
- [x] 8.2 預約取消確認信（含退款金額與是否為待付款）
- [x] 8.3 候補通知信（含確認連結與截止時間）
- [x] 8.4 參加者資料補填提醒信
- [x] 8.5 場次確認開課通知
- [x] 8.6 場次取消通知（含全額退款說明）
- [x] 8.7 活動前一天提醒信
- [x] 8.8 管理員場次取消通知
