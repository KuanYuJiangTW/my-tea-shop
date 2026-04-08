## 1. 後台認證

- [x] 1.1 實作 `computeAdminToken(password)`（HMAC-SHA256 簽名）
- [x] 1.2 實作 `POST /api/admin/auth`（timing-safe 比對、設定 HttpOnly Cookie）
- [x] 1.3 實作 `DELETE /api/admin/auth`（清除 Cookie、登出）
- [x] 1.4 實作 In-memory Rate Limiter（15分鐘 / 5次失敗 / 800ms 延遲）
- [x] 1.5 後台登入頁 `/admin`（LoginForm.tsx）
- [x] 1.6 後台受保護路由 layout 驗證 `admin_session` Cookie

## 2. 後台訂單管理

- [x] 2.1 實作 `GET /api/admin/orders`（全訂單列表，依時間降序）
- [x] 2.2 實作 `GET /api/admin/orders/[id]`（單筆訂單詳情）
- [x] 2.3 實作 `PATCH /api/admin/orders/[id]`（白名單狀態更新）
- [x] 2.4 訂單完成時發放點數（防重複查詢、earn 記錄、1年到期）
- [x] 2.5 訂單取消時還原折價券、點數、庫存
- [x] 2.6 支援 `sendShippingEmail` 觸發出貨通知（失敗不影響主流程）
- [x] 2.7 後台訂單列表頁（OrdersClient.tsx，含篩選）
- [x] 2.8 後台訂單詳情頁（OrderActions.tsx，狀態操作介面）

## 3. 後台商品管理

- [x] 3.1 實作 `GET /api/admin/products`（所有商品列表，含下架）
- [x] 3.2 實作 `PATCH /api/admin/products/[id]`（partial update，支援 null 停用規格）
- [x] 3.3 後台商品列表頁（ProductsClient.tsx，含價格/庫存/上下架編輯）

## 4. 後台評論管理

- [x] 4.1 實作 `PATCH /api/admin/reviews/[id]`（更新 `is_visible`）
- [x] 4.2 後台評論列表頁（AdminReviewsClient.tsx，含隱藏/顯示操作）
- [x] 4.3 前台評論 RLS Policy：只顯示 `is_visible = true`

## 5. 後台介面結構

- [x] 5.1 後台側邊欄（AdminSidebar.tsx）
- [x] 5.2 後台受保護路由 Layout（`(protected)/layout.tsx`）
- [x] 5.3 後台 Dashboard 頁（`/admin/(protected)/dashboard`）
