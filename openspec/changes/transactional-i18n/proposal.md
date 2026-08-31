## Why

英文站有國際配送與 PayPal，但**交易動線的兩個出口都只會講中文**：國際客人用英文站買完、用 PayPal 付完款，收到的訂單確認信是全中文；結帳出錯時看到的也是中文，即使前端已經備好英文字串。

這不是「翻譯還沒補完」，是兩個**機制**問題：

1. `EmailOrderData`／`ShippingEmailData` 沒有語系欄位，信件樣板無從分歧。同一個 `src/lib/email.ts` 裡，**體驗開課申請信與接案諮詢信都已經有 `locale` 欄位與 `isEn` 分支**——只有最早寫的商品訂單信沒補。
2. `CheckoutClient.tsx` 四處寫 `json.error ?? t("errors.…")`，而 `POST /api/orders` 有 18 個寫死中文的 `error` 字串。因為 `json.error` 一定存在，`?? t(…)` 那個英文 fallback **一次都不會執行**——程式碼看起來有做雙語，那行是死的。

2026-08-31 的平行稽核抓到這兩項並逐條查證（`src/lib/paypal.ts:243` 確實呼叫 `sendOrderEmails`，而 PayPal 是國際訂單唯一的付款方式）。`messages/zh.json` 與 `en.json` 本身是健康的（1344/1344 key 對齊、零缺漏），所以問題全部落在「沒有走 next-intl 的地方」。

## What Changes

- 訂單相關信件（確認信、出貨信）依**客戶下單時的語系**決定內容語言，沿用 `email.ts` 既有的 `locale` + `isEn` 分歧寫法。
- 語系**持久化在訂單上**。出貨信是後台事後手動觸發的，當下沒有 request locale 可讀——不存起來就寄不出正確語言。
- `POST /api/orders` 的錯誤回應改為帶**穩定的錯誤代碼**，前端以代碼查 `messages/` 取字串；原本的中文字串保留為 `message` 供後台日誌與除錯，但前端不再直接顯示它。
- 前端把 `json.error ?? t(…)` 改成「以代碼查表為主、查無代碼才退回通用訊息」，讓 fallback 真的有機會執行。
- **不在本次範圍**：其他寫死中文的頁面（候補確認頁、補填參加者資料頁）、分頁標題的 `generateMetadata` 化、後端其餘 41 個路由的錯誤訊息。那些同樣是稽核抓到的，但不在交易主動線上，另案處理。

## Capabilities

### New Capabilities

- `transactional-email-locale`: 交易信件的語系來源、持久化位置、雙語內容要求，以及語系缺漏時的回退行為

### Modified Capabilities

- `checkout-flow`: 新增「結帳錯誤訊息必須可在地化」的需求——API 回傳錯誤代碼、前端負責呈現
- `admin-order-management`: 「後台可手動觸發出貨通知 Email」需求補上語系要求（依訂單持久化的語系，而非後台操作者的語系）

## Impact

**資料**
- `orders` 需新增語系欄位。⚠️ **`orders` 的建表 SQL 從未進版控**（2026-08-31 稽核發現），本次要補一份 migration，並順帶把該表現有結構撈進 repo。

**程式**
- `src/lib/email.ts`：`EmailOrderData`／`ShippingEmailData` 加語系欄位；`sendCustomerEmail`／`sendShippingEmail` 加英文樣板
- `src/lib/paypal.ts:243`、`src/app/api/ecpay/*`：建立 `EmailOrderData` 時帶入語系
- `src/app/api/orders/route.ts`：18 處錯誤回應改帶代碼
- `src/app/api/admin/orders/[id]/route.ts:162`：出貨信讀訂單語系
- `src/app/checkout/CheckoutClient.tsx:408/428/459/489`：改以代碼查表
- `messages/zh.json`／`en.json`：新增錯誤代碼對應的字串

**風險**
- 錯誤代碼是**對外契約**，一旦前端依賴就不能隨意改名。
- 既有訂單沒有語系欄位，回填策略需明確（見 design）。
- 高風險區：本次動到 `POST /api/orders` 與金流回呼路徑，改完必跑 `npm run test`（CLAUDE.md 鐵律 4）。
