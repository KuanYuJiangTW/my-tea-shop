## Context

商品購物系統為既有已上線功能。支援兩種付款流程（COD / ECPay）與兩種配送方式（宅配 / 超商取貨）。庫存管理採原子性 RPC 防止競態條件，折價券與點數折抵在結帳時即時驗證並鎖定。

## Goals / Non-Goals

**Goals:**
- 記錄商品購物與 ECPay 金流的技術設計決策
- 作為後續功能開發的參考基準

**Non-Goals:**
- 重新設計現有金流邏輯
- 說明前台購物車 UI 實作細節

## Decisions

### D1：後端完全不信任前端傳來的金額

所有商品單價、運費、折扣均在後端重新計算，前端只傳 `productId`、`quantity`、`spec`。

**理由**：防止惡意竄改請求金額。這也導致 COD（`/api/orders`）與 ECPay（`/api/ecpay/checkout`）有高度相似的驗證邏輯（目前為兩份獨立程式碼）。

### D2：庫存扣減時機因付款方式而異

| 付款方式 | 庫存扣減時機 |
|---------|------------|
| COD | 訂單建立時（`POST /api/orders`）即扣減 |
| ECPay | 付款成功後（`POST /api/ecpay/return` callback）才扣減 |

**理由**：COD 等同確認購買意圖；ECPay 未付款前不應佔用庫存。
**取消還原**：COD 取消或 ECPay 已付款訂單取消，才需還原庫存。

庫存操作透過 Supabase RPC（`decrement_stock` / `increment_stock`）執行，以原子性防止競態條件超賣。若付款成功後庫存扣減失敗（極端競態），訂單狀態標記為 `stock_issue` 供人工處理。

### D3：ECPay 以 MerchantTradeNo 前綴區分訂單類型

- `T` 開頭（`T{timestamp}`）：商品訂單
- `B` 開頭（`B{timestamp}`）：體驗預約

`/api/ecpay/return`（server-side callback）透過前綴判斷要更新哪張資料表。

**理由**：ECPay 只有一個 ReturnURL，需要在 callback 內自行路由。

### D4：超商地圖選取透過 postMessage 回傳

流程：前台開啟彈窗 → 後台轉向 ECPay 物流地圖 → 使用者選取門市 → ECPay 回調 `/api/ecpay/cvs-callback` → 用 `window.opener.postMessage` 傳回門市資料 → 彈窗關閉。

**理由**：ECPay 物流地圖為第三方 iframe/跳轉頁，只能透過 server callback + postMessage 傳回門市選取結果。

### D5：點數折抵上限為訂單（扣折價券後）金額的 10%

`最大折抵 = floor((subtotal + shippingFee - couponDiscount) × 0.1)`
每 100 點折抵 NT$1，最少 200 點，須為 100 的倍數。

**理由**：防止點數過度折抵影響毛利，保留最低 90% 的訂單金額。

### D6：訂單狀態機

```
new → preparing → shipped → completed
new → cancelled（使用者主動取消）
new → stock_issue（付款成功但庫存扣減失敗，需人工處理）
```

使用者只能取消 `new` 狀態的訂單。`new` / `preparing` 狀態可修改宅配地址。

## Risks / Trade-offs

- **[COD 與 ECPay 驗證邏輯重複]** → 目前為兩份獨立程式碼，日後若改價格/規則需同步修改兩處。
- **[ECPay 付款後庫存競態]** → 以 `stock_issue` 狀態標記並人工處理，屬可接受風險。
- **[點數餘額計算為全量掃描]** → 每次使用點數都 `SELECT * FROM point_transactions WHERE user_id = ?`，資料量大時可能變慢，可考慮加 balance 快取欄位。
