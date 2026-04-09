# 霧抉茶 任務清單

> 此為既有專案基準線，所有功能均已實作完成。

---

## 第一步：電商核心

### 購物車
- [x] CartContext 狀態管理（addToCart / removeFromCart / updateQuantity / clearCart）
- [x] localStorage 持久化（key: `wujuetea_cart`）
- [x] 登入後從 Supabase `cart_items` 載入（伺服器為權威來源）
- [x] 登入狀態變更時防抖 500ms 同步至 Supabase（upsert + delete）
- [x] 登出時清空購物車
- [x] 商品規格 ID 編碼（150g / 75g +10000 / teabag +20000）
- [x] 購物車頁進入時呼叫 `/api/products/stock` 預檢庫存並自動調整數量

### 結帳流程
- [x] CheckoutClient 表單（姓名、電話、Email、縣市、地址、超商門市）
- [x] 前端欄位驗證（姓名≥2字、手機格式、縣市22選一、地址≥4字、超商門市必選）
- [x] 已登入自動從 `profiles` 帶入聯絡資料
- [x] 未登入導向 `/auth/login?redirect=/checkout`
- [x] 付款方式：線上付款（online）/ 貨到付款（cod）
- [x] 配送方式：宅配（home, NT$250）/ 超商（cvs, NT$60）/ 滿千免運
- [x] 折價券：手動輸入 + 下拉選單 + 自動帶入最優券
- [x] 積分折抵：最少 200 點、100 倍數、上限 10%

### 後端訂單建立（`POST /api/orders`）
- [x] 後端重新查詢商品真實價格（不信任前端金額）
- [x] 商品存在、規格合法、庫存充足驗證
- [x] 後端計算運費
- [x] Supabase session 驗證（未登入 401）
- [x] 折價券後端驗證（歸屬、未使用、未過期、達最低消費）
- [x] 積分折抵後端驗證（餘額、倍數、上限）
- [x] 原子性庫存扣減 RPC（`decrement_stock`，競態防超賣）
- [x] 訂單建立後標記折價券已使用
- [x] 訂單建立後扣除積分（`point_transactions` insert 負值）
- [x] 發送訂單確認 Email（只送帳號已驗證 email）

### 綠界 ECPay 金流
- [x] `POST /api/ecpay/checkout`：建立 pending 訂單 + 產生 AIO 表單參數（SHA256 CheckMacValue）
- [x] `POST /api/ecpay/return`：驗簽 + 付款成功後扣庫存 + 寄確認信（T 前綴訂單）
- [x] `POST /api/ecpay/result`：轉址至 `/order/result`
- [x] `POST /api/ecpay/cvs-map`：產生超商地圖表單參數（獨立物流 API 金鑰）
- [x] `POST /api/ecpay/cvs-callback`：接收門市選擇，postMessage 回主視窗
- [x] 超商地圖彈窗流程（window.open + form submit + message event）
- [x] Origin 驗證（防 CSRF）

### 訂單管理
- [x] `POST /api/orders/[id]/cancel`：使用者取消（限 `new` 狀態）
- [x] 取消時還原庫存（COD 或 ECPay 已付款才還原）
- [x] 取消時還原折價券（`used_at = null`）
- [x] 取消時退還積分（insert 正值）
- [x] `PATCH /api/orders/[id]/address`：修改宅配地址（`new` / `preparing` 狀態，home 類型）

---

## 第二步：體驗預約系統

### Schema 與資料庫
- [x] `experience_types` 資料表（5 種體驗類型）
- [x] `experience_sessions` 資料表（場次，unique: type+date+time）
- [x] `experience_bookings` 資料表（預約，含退款欄位）
- [x] `booking_participants` 資料表（參加者資料）
- [x] `waitlist_entries` 資料表（候補清單）
- [x] `experience_reviews` 資料表（評價，unique on booking_id）
- [x] Trigger `trg_booking_participants`：自動維護場次 `current_participants` 與 `status`
- [x] 5 種體驗類型預設資料（茶藝體驗、烤茶、採茶、紅茶製作、淺漬茶果酒）

### 場次查詢
- [x] `GET /api/experience-sessions`：按 slug + year + month 查詢月份場次
- [x] 回傳 `availableSpots`（可報名名額）

### 預約流程
- [x] `POST /api/bookings`：建立 `pending_payment` 預約
- [x] 場次 `status === "open"` 驗證
- [x] 剩餘名額驗證
- [x] 茶果酒 18+ `adultConfirmed` 後端驗證
- [x] 計算 `participants_due_at`（session_date - 5 天）
- [x] `POST /api/ecpay/experience-checkout`：產生 AIO 表單（B 前綴 tradeNo）
- [x] ECPay return：B 前綴付款成功 → `status = "confirmed"` + 寄確認信
- [x] `GET /api/bookings/[id]`：預約詳情（含 session、participants）
- [x] `POST /api/bookings/[id]/cancel`：使用者取消（退款梯度計算）
- [x] 取消後通知候補者（fire-and-forget）
- [x] 取消後寄取消確認 Email

### 退款梯度
- [x] ≥ 7 天：100%
- [x] 3–6 天：50%
- [x] 1–2 天：20%
- [x] < 24 小時：0%
- [x] 待付款直接取消不退款

### 參加者資料
- [x] `GET /api/bookings/[id]/participants`：取得列表（total / filled / remaining / dueAt）
- [x] `POST /api/bookings/[id]/participants`：新增參加者（status=confirmed、未逾期、未滿額）

### 候補清單
- [x] `POST /api/waitlist`：加入候補（限場次 `status === "full"`）
- [x] `notifyNextWaitlist`：先進先出 + 人數匹配，通知後 24 小時確認截止
- [x] `POST /api/waitlist/[id]/confirm`：候補確認 → 建立正式預約 → 引導付款
- [x] 確認時競態防護（二次查名額，不足則 expired + 通知下一位）
- [x] `expireWaitlistAndNotifyNext`：Cron 清理過期候補並通知下一位

### Vercel Cron（每日 UTC 01:00）
- [x] 任務1：活動前 5 天，寄參加者補填提醒
- [x] 任務2-A：活動前 3 天，人數達門檻 → 寄開課確認 Email
- [x] 任務2-B：活動前 3 天，人數不足 → 自動取消場次 + 全額退款 + 寄通知 + 管理者告警
- [x] 任務3：活動前 1 天，寄前日提醒
- [x] 任務4：清理過期候補，通知下一位
- [x] `CRON_SECRET` 保護

### 評價系統
- [x] `POST /api/reviews`：提交評價（1–5 星 + 文字）
- [x] 驗證：本人預約、`confirmed` 狀態、體驗日期已過
- [x] DB unique constraint 防重複評價（booking_id）
- [x] 後台可軟刪除（`is_visible` flag）

---

## 第三步：會員系統與管理後台

### Supabase Auth 會員系統
- [x] AuthContext（`user` / `loading`，監聽 `onAuthStateChange`）
- [x] 登入 / 註冊頁（`/auth/login`、`/auth/register`）
- [x] `GET /auth/callback`：OAuth / Magic Link code 交換
- [x] 首次登入自動建立 `profiles` 記錄
- [x] 首次登入自動發放歡迎折價券（NT$50、最低消費 NT$350、30 天有效）
- [x] 歡迎券幂等（DB unique index，重複呼叫自動忽略）
- [x] `?next=` 參數重導向（限站內路徑）

### 會員帳號頁（`/account`）
- [x] 會員資料（profiles：姓名、電話、地址）
- [x] 積分餘額 + 交易明細（earn / redeem）
- [x] 折價券清單（可用 / 已使用 / 已過期）
- [x] 訂單歷史（狀態、金額、明細展開、取消、修改地址）
- [x] 體驗預約歷史（含退款金額、參加者填寫狀態、是否已評價）
- [x] 候補名單（狀態、確認截止時間）

### 管理後台認證（獨立密碼保護）
- [x] HMAC-SHA256 Token（`computeAdminToken`，key: `"wujue-admin-v1"`）
- [x] `POST /api/admin/auth`：登入，設定 HttpOnly Cookie（7 天）
- [x] `DELETE /api/admin/auth`：登出，清除 Cookie
- [x] Rate Limit（5 次/15 分鐘/IP，in-memory Map）
- [x] Timing-safe 密碼比對（`crypto.timingSafeEqual`）
- [x] 失敗延遲 800ms
- [x] Cookie: `HttpOnly; Secure; SameSite=Strict`
- [x] 後台頁面 `robots: noindex`

### 後台儀表板
- [x] 今日訂單數
- [x] 本月營收（payment_status=paid 加總）
- [x] 待出貨數（new + preparing）
- [x] 最新 5 筆訂單清單
- [x] 快捷連結（待出貨訂單、產品管理）

### 後台訂單管理
- [x] `GET /api/admin/orders`：所有訂單列表
- [x] `GET /api/admin/orders/[id]`：單一訂單詳情
- [x] `PATCH /api/admin/orders/[id]`：更新狀態（白名單驗證）
- [x] 訂單列表：狀態篩選 + 關鍵字搜尋（姓名 / Email / 訂單編號）
- [x] 訂單操作按鈕（依狀態顯示：開始備貨 / 確認出貨 / 確認收款 / 取消訂單）
- [x] 出貨確認 Modal（可填物流備註，確認後寄出貨 Email）
- [x] 狀態改 `completed` 時自動發放積分（防重複：先查無 earn 記錄）
- [x] 狀態改 `cancelled` 時還原折價券、積分、庫存

### 後台產品管理
- [x] `GET /api/admin/products`：所有產品
- [x] `PATCH /api/admin/products/[id]`：更新名稱、價格、庫存、上下架
- [x] 三規格（150g / 75g / 茶包）獨立價格與庫存管理
- [x] 一鍵切換上下架（Toggle）
- [x] 庫存顏色警示（0=紅、≤5=橘、null=灰）

### 後台體驗管理
- [x] `GET /api/admin/experience-sessions`：近 90 天場次
- [x] `POST /api/admin/experience-sessions`：新增場次（重複時段 409）
- [x] `PATCH /api/admin/experience-sessions/[id]`：切換狀態（open / cancelled）
- [x] `PATCH /api/admin/experience-bookings/[id]`：更新退款狀態（processed）
- [x] `POST /api/admin/experience-bookings/[id]/cancel`：代為取消（含退款計算、通知候補）

### 後台評價管理
- [x] `PATCH /api/admin/reviews/[id]`：切換 `is_visible`（軟刪除）
- [x] 顯示統計（全部 / 顯示中 / 已下架計數）
