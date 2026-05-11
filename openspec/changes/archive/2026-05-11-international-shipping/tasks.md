## 1. 資料庫與基礎設施

- [x] 1.1 建立 shipping_zones 與 shipping_countries 資料表 migration（含 RLS 政策：public read）
- [x] 1.2 插入 ePacket 7 區費率種子資料與 18+ 國家對照
- [x] 1.3 products 表新增 shipping_weight_150g、shipping_weight_75g、shipping_weight_teabag 欄位（integer, nullable, 單位 g）

## 2. 共用運費計算函式

- [x] 2.1 建立 src/lib/shipping-constants.ts：DEFAULT_SPEC_WEIGHT_G 常量、getItemWeightG()（商品自訂值 > fallback）、calcTotalWeightG()、calcDomesticFee()
- [x] 2.2 建立 src/lib/shipping.ts：calculateShippingFee()（async，查 DB 取國際費率，import from shipping-constants）
- [x] 2.3 替換 POST /api/orders 中的硬編碼運費為 calculateShippingFee()
- [x] 2.4 替換 POST /api/ecpay/checkout 中的硬編碼運費為 calculateShippingFee()
- [x] 2.5 替換 POST /api/stripe/checkout 中的硬編碼運費為 calculateShippingFee()
- [x] 2.6 替換 POST /api/paypal/create-order 中的硬編碼運費為 calculateShippingFee()

## 3. 型別與 API

- [x] 3.1 Product 型別新增 shippingWeight150g?、shippingWeight75g?、shippingWeightTeabag? 欄位
- [x] 3.2 DeliveryType 新增 "international"，擴展 CheckoutForm 與 CreateOrderRequest 介面加入國際地址欄位（internationalAddress）
- [x] 3.3 建立 GET /api/shipping/countries 端點，回傳可配送國家清單與運費資訊（含 base_fee、per_extra 供前端即時計算）
- [x] 3.4 更新 POST /api/paypal/create-order：支援 international deliveryType、國際 shipping_address、PayPal shipping 地址傳遞（Seller Protection）

## 4. 結帳頁 UI

- [x] 4.1 CheckoutClient 新增「配送地區」選擇器（台灣境內 / 國際配送）
- [x] 4.2 國際配送時顯示國家下拉選單與國際地址表單（addressLine1/2, city, state, postalCode）
- [x] 4.3 國際配送時僅顯示 PayPal 付款（隱藏 ECPay / COD）
- [x] 4.4 國際配送時電話驗證改用寬鬆規則（允許國際格式 +xx-xxx-xxxx）
- [x] 4.5 載入時 fetch /api/shipping/countries 快取費率，選國家時前端即時算運費（零延遲）
- [x] 4.6 即時顯示國際運費、總重與預估配送天數（使用 getItemWeightG + calcTotalWeightG）
- [x] 4.7 購物車總重超過 2000g 時 disabled 國際配送並顯示超重提示
- [x] 4.8 顯示國際訂單注意事項（關稅、退貨、配送天數聲明）

## 5. 訂單管理與顯示

- [x] 5.1 管理後台訂單詳情頁支援顯示國際地址格式
- [x] 5.2 管理後台訂單列表國際訂單顯示「國際」標籤與目的地國家
- [x] 5.3 會員中心訂單顯示國際地址與國旗
- [x] 5.4 國際訂單禁止修改收件地址
- [x] 5.5 訂單結果頁顯示預估配送天數與關稅提醒

## 6. 後台商品配送重量管理

- [x] 6.1 管理後台商品編輯頁新增「配送重量」區塊：3 個輸入框（150g / 75g / 茶包），placeholder 顯示預設值（如「預設 200g」），留空即使用預設
- [x] 6.2 儲存時寫入 products 表對應欄位，空值存 null

## 7. 郵件與翻譯

- [x] 7.1 更新 src/lib/email.ts 訂單確認信支援國際地址格式（EmailOrderData.shippingAddress 擴展 type: "international"）
- [x] 7.2 新增國際配送相關 i18n 翻譯鍵（zh.json / en.json）

## 8. 自動化測試

- [x] 8.1 建立 src/__tests__/international/helpers.ts（共用測試資料：國際地址、mock 費率、mock 國家清單）
- [x] 8.2 shipping-calculator.test.ts：運費核心邏輯 ~21 tests（國內 4 scenario + 國際 7 區費率 + 免運/超重/邊界值 + calcTotalWeightG 混合規格 + 自訂重量 vs fallback + DEFAULT_SPEC_WEIGHT_G 驗證）
- [x] 8.3 phone-validation.test.ts：電話驗證 ~10 tests（台灣格式、日本/美國/英國/澳洲國際格式、無效格式拒絕）
- [x] 8.4 create-order-international.test.ts：國際訂單 API ~15 tests（正常建立、缺欄位拒絕、不支援國家、超重拒絕、PayPal shipping 地址傳遞、rollback）
- [x] 8.5 shipping-countries-api.test.ts：國家清單 API ~6 tests（正常回傳、is_active 過濾、費率資訊完整性、DB 錯誤處理）
- [x] 8.6 integration-verification.test.ts：系統完整性 ~15 tests（檔案存在、翻譯鍵、DeliveryType 型別、CreateOrderRequest 結構、code pattern 檢查）
- [x] 8.7 更新現有 PayPal 測試，配合 calculateShippingFee 重構（確保 113+ 測試仍通過）
- [x] 8.8 執行全部測試確認 180+ tests 全部通過
