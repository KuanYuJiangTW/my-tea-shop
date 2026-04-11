## Context

體驗預約積點系統的 API（`PATCH /api/admin/experience-bookings/[id]`）已實作 `status = "completed"` 的積點發放邏輯（含防重複），目前缺少的是觸發入口：後台沒有「標記完成」按鈕，也沒有自動完成機制。

`vercel.json` 已有 cron 設定（`/api/cron/experience-reminders`），架構上直接新增一個 cron entry 即可，無需額外基礎設施。

## Goals / Non-Goals

**Goals:**
- 後台活動已過的 `confirmed` 預約顯示「標記完成」按鈕，管理員可立即手動觸發
- Vercel Cron 每日凌晨掃描，將活動結束超過 7 天、仍為 `confirmed` 的預約自動標記 `completed` 並發積點
- 後台新增「已完成」篩選 tab
- 後台活動已過但未完成的預約顯示黃底提示，讓管理員一眼識別
- 前台會員中心顯示「已完成」狀態

**Non-Goals:**
- 不新增 `pending_completion` 中間狀態（保持狀態機簡單）
- No-show 不另設處理流程（付款了就發積點，管理員若要阻止可在 7 天內用「代為取消」）
- 不實作場次取消連動（不在本 change 範圍）

## Decisions

### 1. Cron Job 直接呼叫內部邏輯，不走 PATCH API

Cron route（`/api/cron/complete-bookings`）直接使用 Supabase admin client 查詢並更新，原因：
- 不需要走 HTTP → 自己呼叫自己
- `withAdminAuth` 守衛需要 session，Cron 環境沒有 session
- 積點發放邏輯複製自 PATCH route，一起搬進共用 helper 或 inline 處理

### 2. 7 天緩衝期

`session_date + start_time + 7 天 < NOW()` 才觸發自動完成。選 7 天的理由：
- 給管理員足夠的工作週（含週末）
- 不會讓會員等太久（最壞情況 7 天後才拿到積點）

### 3. 後台「標記完成」按鈕只在活動已過時顯示

條件：`b.status === "confirmed" && sessionDateTime < new Date()`

不新增額外狀態欄位，透過現有 `session.session_date + session.start_time` 判斷。

### 4. Cron 安全性

Cron route 以 `CRON_SECRET` env var 驗證（與 experience-reminders 一致），請求 header 帶 `Authorization: Bearer <CRON_SECRET>`，Vercel 會自動附加此 header。

## Risks / Trade-offs

- **[Risk] 積點計算邏輯重複** → 將 `earnPoints` 計算與 insert 邏輯抽成 helper function，讓 PATCH route 與 Cron route 共用，避免日後維護分歧。
- **[Risk] Cron 跑兩次（重複觸發）** → 已有防重複邏輯（查詢 booking_id 的 earn 記錄），重複跑安全。
- **[Trade-off] No-show 不處理** → 管理員須在 7 天內主動用「代為取消」阻止積點，否則自動發放。此為業主決策，已確認可接受。

## Migration Plan

1. 建立 `src/lib/booking-points.ts`（可選）：抽取積點發放邏輯
2. 建立 `src/app/api/cron/complete-bookings/route.ts`
3. 在 `vercel.json` 新增 cron entry（`0 2 * * *`，每日凌晨 2 點）
4. 更新 `AdminBookingsClient.tsx`：加按鈕、tab、黃底提示
5. 更新 `AccountClient.tsx` 與 `account/page.tsx`：已完成狀態顯示
6. 無 DB migration 需求
