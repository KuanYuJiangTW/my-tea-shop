## Context

帳號頁為已登入使用者的自助管理中心。採用 Next.js Server Component 在伺服器端一次查詢所有資料（訂單、預約、候補、點數、折價券），傳入 Client Component 渲染，減少客戶端 API 請求次數。

## Goals / Non-Goals

**Goals:**
- 記錄帳號頁資料載入架構與各 Tab 功能的技術決策

**Non-Goals:**
- UI 元件設計細節
- 各 Tab 內的互動動作（取消訂單/預約已在各自的 spec 中記錄）

## Decisions

### D1：Server Component 一次性載入所有 Tab 資料

帳號頁在 `page.tsx`（Server Component）中一次性查詢所有資料後傳給 `AccountClient`，不使用分頁或 lazy loading。

**理由**：帳號頁資料量通常有限（訂單幾十筆），一次載入避免 Tab 切換時的額外請求，改善用戶體驗。
**點數交易記錄**限制最近 20 筆，避免大量記錄影響效能。

### D2：資料查詢使用 service role key 繞過 RLS

帳號頁查詢 `orders`、`experience_bookings`、`waitlist_entries` 等表時，使用 `adminSupabase`（service role key），繞過 RLS，在 Server Component 內以 `user_id` 過濾資料。

**理由**：部分表的 RLS 設計為後台讀取，前台用戶讀取自己的資料若透過 RLS 需額外設定 Policy；Server Component 在伺服器端執行，service key 不會暴露給瀏覽器。

### D3：Profile 在頁面載入時確保存在（upsert）

每次訪問帳號頁時，Server Component 先執行 `profiles.upsert({ id: user.id }, { ignoreDuplicates: true })`，確保 profile 記錄存在。

**理由**：新用戶第一次登入後可能尚無 profile 記錄，upsert 確保後續查詢不會回傳 null。

### D4：個人資料更新直接呼叫 Supabase Browser Client

個人資料（姓名、電話、縣市、地址）的更新，在 Client Component 內直接呼叫 `supabaseBrowserClient.from("profiles").update()`，不透過 API route。

**理由**：profiles 表有 RLS（用戶只能更新自己的記錄），Browser Client 使用用戶的 session token 操作，安全且簡單，無需額外 API route。

### D5：留評需雙重驗證（Server 端）

`POST /api/reviews` 在 Server 端驗證：
1. 預約屬於本人（`booking.user_id === user.id`）
2. 預約狀態為 `confirmed`
3. 場次日期已過（`session_date < today`）
4. 資料庫 UNIQUE constraint（`booking_id`）防止重複留評

**理由**：評論影響商譽，需嚴格驗證。UNIQUE constraint 提供最後防線，即使並發操作也不會重複插入。

### D6：候補列表只顯示活躍狀態

帳號頁只載入 `status IN ('waiting', 'notified')` 的候補記錄，`confirmed`、`expired`、`cancelled` 的記錄不顯示。

**理由**：已確認的候補轉為正式預約後不需再顯示；過期/取消的候補對用戶無操作意義。

## Risks / Trade-offs

- **[一次性載入效能]** → 若用戶有大量訂單（>100筆），初次載入可能稍慢。目前以「帳號頁用戶通常訂單量有限」為前提接受此風險。
- **[Client 端狀態與 Server 資料不同步]** → 取消訂單/預約後，Client 直接更新本地 state（樂觀更新），不重新 fetch。若操作失敗則還原。
