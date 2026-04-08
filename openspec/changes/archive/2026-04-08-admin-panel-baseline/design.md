## Context

後台管理系統為單一管理員使用的內部工具，不對外開放。認證採用環境變數密碼 + HMAC-SHA256 token，儲存於 HttpOnly Cookie。後台 API 不使用 Supabase Auth，而是以 `admin_session` cookie 驗證身份。

## Goals / Non-Goals

**Goals:**
- 記錄後台認證與各管理功能的技術設計決策

**Non-Goals:**
- 多管理員帳號、角色權限控制
- 後台 UI 元件設計細節

## Decisions

### D1：後台認證採密碼 + HMAC token，不使用 Supabase Auth

登入時比對 `ADMIN_PASSWORD` 環境變數，成功後計算 `HMAC-SHA256(password, "wujue-admin-v1")` 作為 session token，寫入 HttpOnly、SameSite=Strict Cookie，有效期 7 天。

**驗證流程**：每個後台 API route 需自行讀取 `admin_session` cookie 並驗證 token 是否正確（`computeAdminToken(ADMIN_PASSWORD)` 比對）。

**理由**：後台僅單一管理員，Supabase Auth 的多用戶模型過重；HMAC token 無需儲存 session，重啟後仍有效。

### D2：Login Rate Limiting 為 In-Memory，Instance 級別

每個 IP 在 15 分鐘視窗內最多 5 次失敗嘗試，超過後鎖定至視窗結束。失敗回應固定延遲 800ms 增加暴力破解成本。

**限制**：Vercel serverless 多 instance 時，不同 instance 的計數器不共享。已足以防止一般暴力破解，不需 Redis。

### D3：訂單狀態更新附帶副作用（點數、庫存、折價券還原）

`PATCH /api/admin/orders/[id]` 在狀態改變時觸發副作用：
- **new → completed**：防重複檢查後發放點數（`type: "earn"`），積分 = 商品小計 - 折扣
- **任意 → cancelled**：還原折價券（`used_at = null`）、還原點數（插入正值記錄）、還原庫存（僅 COD 或已付款 ECPay）

**理由**：副作用與狀態更新在同一 API 完成，避免後台需要多步驟操作。

### D4：出貨通知 Email 由後台手動觸發

`PATCH /api/admin/orders/[id]` 支援 `sendShippingEmail: true` 參數，後台可在更新出貨狀態時同時寄出通知，失敗不影響狀態更新（catch 後只 console.error）。

### D5：評論管理為軟刪除（is_visible）

`PATCH /api/admin/reviews/[id]` 只更新 `is_visible` 欄位，不實際刪除資料。前台查詢僅顯示 `is_visible = true` 的評論。

## Risks / Trade-offs

- **[In-memory Rate Limiter 多 instance 失效]** → 可接受風險，攻擊者需命中同一 instance 才能繞過；若需更嚴格可改用 Redis。
- **[後台 API 無 Supabase RLS 保護]** → 後台使用 service role key，完全繞過 RLS，需確保 `admin_session` cookie 驗證正確實作於每個 route。
- **[點數發放防重複依賴 DB 查詢]** → 每次更新 completed 時查詢 `earn` 記錄，並非 DB-level unique constraint，理論上並發操作可能重複發放。
