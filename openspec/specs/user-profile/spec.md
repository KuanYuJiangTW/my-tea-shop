## ADDED Requirements

### Requirement: 用戶可查看與更新個人資料
系統 SHALL 允許已登入用戶查看並更新 `profiles` 表中的姓名、電話、縣市、地址欄位。

#### Scenario: 查看個人資料
- **WHEN** 用戶切換至「個人資料」Tab
- **THEN** 顯示目前儲存的姓名、電話、縣市、地址（空白欄位顯示為空）

#### Scenario: 成功更新個人資料
- **WHEN** 用戶填寫並送出個人資料表單
- **THEN** Browser Client 呼叫 `profiles.update()`，更新成功後顯示成功提示

### Requirement: 個人資料更新透過 Supabase Browser Client 直接操作
系統 SHALL 在 Client Component 使用 Supabase Browser Client 更新 profiles，不透過 API route。RLS 確保用戶只能更新自己的記錄。

#### Scenario: 用戶無法更新他人資料
- **WHEN** 用戶嘗試更新不屬於自己的 profile（理論上不會發生，RLS 保護）
- **THEN** Supabase RLS 拒絕操作，前台顯示錯誤

### Requirement: 帳號頁顯示登入 Email（唯讀）
系統 SHALL 顯示用戶的登入 Email，但不允許修改。

#### Scenario: 顯示 Email
- **WHEN** 用戶查看個人資料 Tab
- **THEN** Email 欄位顯示 `user.email`，為唯讀狀態
