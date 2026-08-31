# checkout-flow Specification

## Purpose
結帳流程的配送地區選擇（台灣境內與國際），以及運費計算統一改用共用函式、不在前端硬編碼費率。

## Requirements

### Requirement: 國際配送選項

結帳頁 SHALL 提供「配送地區」選擇，分為台灣境內與國際配送。

#### Scenario: 選擇國際配送
- **WHEN** 使用者點選「國際配送」
- **THEN** 隱藏宅配/超商選項，顯示國家下拉選單與國際地址表單
- **THEN** 付款方式僅顯示 PayPal（隱藏 ECPay 和貨到付款）

#### Scenario: 切回台灣境內
- **WHEN** 使用者從國際配送切回台灣境內
- **THEN** 恢復宅配/超商選項與所有付款方式

#### Scenario: 國際運費即時顯示
- **WHEN** 選定國家且購物車有商品
- **THEN** 即時計算並顯示運費金額與預估配送天數
- **THEN** 若達免運門檻，顯示「免運費」

#### Scenario: 超重提示
- **WHEN** 購物車商品總重超過 2000g
- **THEN** 國際配送選項 disabled，顯示「超過國際配送限重 2kg」提示


### Requirement: 運費計算統一化

結帳頁的運費計算 SHALL 改用 API 回傳或共用函式計算，不再於前端硬編碼費率。

#### Scenario: 結帳頁顯示的運費與建單結果一致
- **WHEN** 使用者在結帳頁選定配送方式，購物車內容確定
- **THEN** 頁面顯示的運費取自 API 回傳或 `calculateShippingFee()`，與建單時實際計算的金額一致
  ——費率以 `shipping-constants.ts` 的 `DOMESTIC_FEES` 為單一真相，前端不另行複製數字
