## Why

後台管理系統（含認證、訂單管理、商品管理、評論管理）已上線運作，但缺乏規格文件。本文件為逆向文件化成果，記錄現有後台功能的完整規格，作為後續開發的基準線。

## What Changes

這是一份現況基準線文件，描述已實作的功能，非新功能規劃。

- 後台認證：密碼登入、HMAC token、HttpOnly Cookie、IP Rate Limiting
- 訂單管理：列表、詳情、狀態更新（含點數發放、庫存/折價券還原）、出貨通知 Email
- 商品管理：列表、更新價格/庫存/上下架
- 評論管理：顯示/隱藏評論（軟刪除）
- 體驗預約管理：已在 `booking-system-baseline` 中記錄

## Capabilities

### New Capabilities

- `admin-auth`: 後台密碼認證（HMAC token、Rate Limiting、Cookie Session）
- `admin-order-management`: 後台訂單管理（列表、狀態更新、點數發放、出貨通知）
- `admin-product-management`: 後台商品管理（價格、庫存、上下架）
- `admin-review-moderation`: 後台評論審核（顯示/隱藏）

### Modified Capabilities

（本文件為首次建立，無既有規格需更新）

## Impact

**前台路由**：`/admin`（登入頁）、`/admin/(protected)/`（需認證）

**API 端點**：
- `POST /api/admin/auth`（登入）、`DELETE /api/admin/auth`（登出）
- `GET /api/admin/orders`（訂單列表）
- `GET/PATCH /api/admin/orders/[id]`（訂單詳情/更新）
- `GET /api/admin/products`（商品列表）
- `PATCH /api/admin/products/[id]`（更新商品）
- `PATCH /api/admin/reviews/[id]`（更新評論可見性）

**外部依賴**：Resend（出貨通知 Email）、Supabase（資料操作）

---

> **備注**：本文件為既有專案的逆向文件化成果，非事前規格書。
> 建立日期：2026-04-08
