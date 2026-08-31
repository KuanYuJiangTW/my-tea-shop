# account-page Specification

## Purpose
會員帳號頁的登入守衛、profile 自動建立、一次載入所有 Tab 資料，以及用 URL 參數切換 Tab。

## Requirements

### Requirement: 未登入用戶重導向至登入頁
系統 SHALL 在帳號頁偵測到未登入時，重導向至 `/auth/login`。

#### Scenario: 未登入訪問帳號頁
- **WHEN** 未登入使用者訪問 `/account`
- **THEN** 系統 redirect 至 `/auth/login`

### Requirement: 帳號頁載入時確保 profile 記錄存在
系統 SHALL 在每次帳號頁載入時，執行 `profiles` upsert（`ignoreDuplicates: true`），確保用戶有 profile 記錄。

#### Scenario: 新用戶首次訪問帳號頁
- **WHEN** 用戶首次登入後訪問帳號頁，尚無 profile 記錄
- **THEN** 自動建立 profile 記錄，用戶可正常使用帳號頁

### Requirement: 帳號頁一次性載入所有 Tab 所需資料
帳號頁 Server Component SHALL 在渲染前一次性查詢所有資料並傳入 Client Component，包含：
- 個人資料（profiles）
- 所有歷史訂單（orders，依時間降序）
- 最近 20 筆點數記錄（point_transactions）
- 所有折價券（coupons，含已使用）
- 所有體驗預約（experience_bookings，含場次與是否已留評）
- 活躍候補記錄（waitlist_entries，僅 `waiting` / `notified`）

#### Scenario: 帳號頁成功載入
- **WHEN** 已登入使用者訪問 `/account`
- **THEN** 頁面包含四個 Tab（個人資料、我的訂單、我的預約、點數與優惠），資料完整呈現

### Requirement: Tab 支援 URL 參數切換
系統 SHALL 讀取 `?tab=` 參數（`profile` / `orders` / `bookings` / `rewards`）作為預設顯示的 Tab。

#### Scenario: 直連 ?tab=bookings
- **WHEN** 使用者訪問 `/account?tab=bookings`
- **THEN** 頁面預設顯示「我的預約」Tab
