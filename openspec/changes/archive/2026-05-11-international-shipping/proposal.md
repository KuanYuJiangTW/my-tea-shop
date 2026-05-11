## Why

茶藝店目前僅支援台灣境內配送（宅配到府 / 超商取貨），國際客人（日本、歐洲、澳洲為主力）無法下單購買茶葉寄到海外。PayPal Phase 1 已完成，國際金流管道已通，現在需要補上國際配送能力，讓海外客人可以用 PayPal 付款並填寫國際地址收件。

## What Changes

- 新增「國際配送」配送方式（`deliveryType: "international"`），與現有宅配/超商取貨共存
- 新增國際運費計算：依中華郵政 ePacket 資費表，按寄達國家區域與包裹重量計算運費
- 新增國際運費區域與國家資料表（`shipping_zones` + `shipping_countries`），可由管理員調整
- 國際訂單免運門檻 NT$2,500（國內維持 NT$1,000）
- 結帳頁新增國際地址表單（國家、州/省、城市、街道、郵遞區號）
- 國際訂單付款方式僅顯示 PayPal（隱藏 ECPay / 貨到付款）
- 國際配送時電話驗證改用寬鬆規則，支援國際電話格式（如 +81-90-xxxx）
- 運費計算邏輯從 5 個 API route 抽出為共用函式，前後端拆分（`shipping-constants.ts` + `shipping.ts`）
- 商品配送重量支援後台自訂（DB 欄位 + 後台 UI + 常量 fallback）
- 國際訂單 PayPal Order 帶入收件地址（Seller Protection）
- 後台與會員中心支援顯示國際地址，訂單列表標示「國際」標籤
- 訂單確認信支援國際地址格式
- 結帳頁顯示國際訂單注意事項（關稅、退貨、配送天數）
- 自動化測試 180+ tests，上線前 `npm run test` 一鍵驗證

## Scope

- **開放地區**：18+ 國家（日本、韓國、新加坡、泰國、越南、印尼、馬來西亞、菲律賓、以色列、德國、法國、英國、挪威、波蘭、丹麥、紐西蘭、澳洲、美國、加拿大）
- **不含中國大陸**：大陸需獨立金流（支付寶/微信）、進口食品檢驗檢疫（CIQ 備案）、跨境電商海關申報、茶葉農產品衛生許可等，工作量相當於獨立 Phase。未來大陸客人需求量大時，以 Phase 3 專門處理

## Capabilities

### New Capabilities

- `international-shipping`: 國際配送功能（運費區域管理、國際地址表單、ePacket 費率計算、免運門檻、後台配送重量管理）
- `shipping-calculator`: 共用運費計算函式（前後端拆分、抽出現有 5 處重複邏輯、統一支援國內/國際計算）

### Modified Capabilities

- `product-ordering`: DeliveryType 新增 "international"，運費計算改用共用函式，PayPal 帶入國際收件地址
- `checkout-flow`: 結帳頁新增國際配送選項、國際地址表單、國際電話驗證、國際訂單僅顯示 PayPal
- `order-management`: 訂單顯示與管理支援國際地址格式，訂單列表標示國際訂單
- `order-result`: 訂單結果頁顯示國際配送預估天數與關稅提醒

## Impact

**資料表**：
- 新增 `shipping_zones`（運費區域：東亞I/II、西亞、歐洲I/II、大洋洲、美洲）
- 新增 `shipping_countries`（國家與區域對照：18+ 國家，含 RLS 政策）
- `products` 新增 `shipping_weight_150g`、`shipping_weight_75g`、`shipping_weight_teabag` 欄位
- `orders.shipping_address` JSONB 擴展支援 `type: "international"` 格式

**API 端點（修改）**：
- `POST /api/paypal/create-order` — 支援 international deliveryType + 國際運費 + PayPal shipping 地址
- `POST /api/orders` — 運費計算改用共用函式
- `POST /api/ecpay/checkout` — 運費計算改用共用函式
- `POST /api/stripe/checkout` — 運費計算改用共用函式

**API 端點（新增）**：
- `GET /api/shipping/countries` — 回傳可配送國家清單與運費區域（含費率供前端即時計算）

**新增檔案**：
- `src/lib/shipping-constants.ts` — 純常量 + 純函式（前後端共用）
- `src/lib/shipping.ts` — async 運費計算（僅後端）
- `supabase/add_shipping_tables.sql` — DB migration
- `src/__tests__/international/` — 自動化測試（6 個測試檔，~67 新測試）

**前端修改**：
- `src/app/checkout/CheckoutClient.tsx` — 國際配送 UI、國際電話驗證
- `src/app/admin/(protected)/orders/[id]/page.tsx` — 後台國際地址顯示
- `src/app/admin/(protected)/products/ProductsClient.tsx` — 後台商品配送重量管理
- `src/app/account/AccountClient.tsx` — 會員中心國際地址顯示
- `src/lib/email.ts` — 郵件模板國際地址

**外部依賴**：無新增（運費為資料庫查表，不呼叫外部 API）

**翻譯**：`messages/zh.json`、`messages/en.json` 新增國際配送相關翻譯鍵

**測試**：180+ tests（67 新測試 + 113 現有 PayPal 測試回歸驗證）
