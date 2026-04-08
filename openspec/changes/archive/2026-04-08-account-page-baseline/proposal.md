## Why

帳號頁整合了個人資料、我的訂單、我的預約（含候補）、點數與折價券等四大區塊，是使用者自助管理所有記錄的核心頁面。目前功能已完整實作，但缺乏規格文件。本文件為逆向文件化成果。

## What Changes

這是一份現況基準線文件，描述已實作的功能，非新功能規劃。

- 帳號頁 Server Component：一次性載入所有資料傳入 Client Component
- 個人資料 Tab：查看/更新姓名、電話、縣市、地址（直接操作 Supabase profiles）
- 我的訂單 Tab：歷史訂單列表、取消訂單（`new` 狀態）、修改宅配地址
- 我的預約 Tab：體驗預約列表、候補記錄（waiting/notified）、取消預約、留評
- 點數與優惠 Tab：點數餘額、最近 20 筆記錄、折價券列表（含已使用）
- 留評功能：已確認且體驗日期已過的預約可留評，每筆預約限一則

## Capabilities

### New Capabilities

- `account-page`: 帳號頁資料載入架構（Server Component 整合查詢、未登入導向登入頁）
- `user-profile`: 個人資料查看與更新（profiles 資料表）
- `user-reviews`: 體驗留評功能（已結束的 confirmed 預約可留評、每筆限一則）

### Modified Capabilities

（本文件為首次建立，無既有規格需更新）

## Impact

**頁面**：`/account`（需登入）

**資料表讀取**：profiles、orders、point_transactions、coupons、experience_bookings、waitlist_entries、experience_reviews

**API 端點**：
- `POST /api/reviews`（新增評論）
- `POST /api/bookings/[id]/cancel`（取消預約，已有 booking-cancellation spec）
- `POST /api/orders/[id]/cancel`（取消訂單，已有 order-management spec）
- `PATCH /api/orders/[id]/address`（修改地址，已有 order-management spec）

**直接 Supabase 呼叫**（Browser Client）：profiles upsert / update（個人資料更新）

---

> **備注**：本文件為既有專案的逆向文件化成果，非事前規格書。
> 建立日期：2026-04-08
