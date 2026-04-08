## 1. 帳號頁資料載入架構

- [x] 1.1 建立 `profiles` 資料表（`id`、`name`、`phone`、`city`、`address`）
- [x] 1.2 實作帳號頁 Server Component（未登入 redirect、profiles upsert）
- [x] 1.3 一次性查詢所有 Tab 資料（orders、bookings、waitlist、point_transactions、coupons）
- [x] 1.4 體驗預約查詢包含 `has_review` 欄位（join experience_reviews 判斷）
- [x] 1.5 候補記錄只載入 `waiting` / `notified` 狀態
- [x] 1.6 URL `?tab=` 參數控制預設顯示 Tab

## 2. 個人資料 Tab

- [x] 2.1 顯示個人資料（Email 唯讀、姓名、電話、縣市、地址可編輯）
- [x] 2.2 個人資料更新使用 Supabase Browser Client（不透過 API route）
- [x] 2.3 縣市選單（22 個縣市選項）
- [x] 2.4 表單驗證（必填、格式檢查）

## 3. 我的訂單 Tab

- [x] 3.1 顯示歷史訂單列表（依時間降序）
- [x] 3.2 訂單狀態標籤顯示（依 order_status + payment_status 組合）
- [x] 3.3 取消訂單（呼叫 `POST /api/orders/[id]/cancel`）
- [x] 3.4 修改宅配地址（呼叫 `PATCH /api/orders/[id]/address`）
- [x] 3.5 取消/修改成功後樂觀更新本地 state

## 4. 我的預約 Tab

- [x] 4.1 顯示體驗預約列表（含場次日期、體驗名稱、狀態、退款金額）
- [x] 4.2 顯示候補記錄（waiting/notified，含確認截止時間）
- [x] 4.3 取消預約（呼叫 `POST /api/bookings/[id]/cancel`，顯示退款資訊）
- [x] 4.4 留評功能（已結束且已確認的預約顯示留評按鈕）
- [x] 4.5 留評彈窗（5 星評分 + 選填留言）
- [x] 4.6 留評成功後更新 `has_review = true`

## 5. 留評 API

- [x] 5.1 實作 `POST /api/reviews`（驗證本人、confirmed、日期已過）
- [x] 5.2 處理重複留評（PG 23505 → HTTP 409）
- [x] 5.3 插入 `experience_reviews`（含 `experience_type_id`）

## 6. 點數與優惠 Tab

- [x] 6.1 顯示點數餘額（`point_transactions` 加總）
- [x] 6.2 顯示最近 20 筆點數記錄（earn/redeem）
- [x] 6.3 顯示折價券列表（可用券 + 已使用券，依建立時間降序）
