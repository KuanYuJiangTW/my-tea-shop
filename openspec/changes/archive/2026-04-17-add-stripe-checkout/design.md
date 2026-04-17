## Context

專案使用 ECPay（綠界）作為唯一線上金流，但 ECPay 僅服務台灣市場。為了向國際客戶展示金流整合能力（Upwork 接案用途），需要新增一個國際通用的金流選項。現有結帳流程採用「跳轉外部頁面」模式（前端 form POST 至 ECPay），webhook 回調處理付款確認。

## Goals / Non-Goals

**Goals:**
- 新增 Stripe Checkout (hosted page) 作為第三種付款方式
- 複用現有訂單驗證邏輯（價格、庫存、優惠券、積點）
- 與 ECPay 共存，不影響現有付款流程
- Stripe 未設定時不顯示選項（graceful degradation）

**Non-Goals:**
- 不做 Stripe Elements（自建表單）— Checkout hosted page 展示效果更好且實作量更小
- 不為體驗預約接 Stripe — ECPay 已夠用，保持範圍可控
- 不做幣種轉換 — 統一使用 TWD
- 不做 Stripe 退款 API — 退款走後台人工處理

## Decisions

### 1. 使用 Stripe Checkout Session 而非 Stripe Elements
- **選擇**: Hosted Checkout Page
- **替代方案**: Stripe Elements（自建嵌入式表單）
- **理由**: 與現有 ECPay 的「跳轉外部頁面」模式一致；自帶 Apple Pay / Google Pay；test mode 無需真實商家帳號；實作量最小

### 2. 訂單前綴 `S` 區分 Stripe 訂單
- **選擇**: `S${Date.now()}` 格式
- **替代方案**: 用 Stripe Session ID 作為 trade no
- **理由**: 與現有前綴規則一致（T = ECPay 商品、B = ECPay 體驗），方便後台識別付款來源

### 3. 複用現有 orders 表，payment_method 欄位新增 "stripe" 值
- **選擇**: 不新增資料表
- **替代方案**: 新建 stripe_orders 表
- **理由**: 訂單結構完全相同，只是付款管道不同。避免資料分散，後台管理統一

### 4. 回調 URL 使用 `?stripe=success|cancel` 而非僅 `?session_id=`
- **選擇**: 明確的 query param 區分來源
- **理由**: ResultClient 需要區分 ECPay（RtnCode）和 Stripe 的回調，避免誤判

### 5. Email 中 paymentMethod 統一為 "online"
- **選擇**: Stripe webhook 寄信時傳 `paymentMethod: "online"`
- **理由**: 現有 email template 只認 "online" | "cod"，避免為 Stripe 新建 template

## Risks / Trade-offs

- **[TWD 小數問題]** → Stripe unit_amount 直接使用整數 TWD（無小數），與 ECPay 一致
- **[Webhook 重複觸發]** → 使用 `.eq("payment_status", "pending")` 條件更新，確保冪等性
- **[庫存競態]** → 複用現有 `decrement_stock` RPC（原子性），與 ECPay 相同的 stock_issue 處理
- **[Stripe 未設定]** → checkout route 檢查 `STRIPE_SECRET_KEY` 存在才處理，否則回 503
