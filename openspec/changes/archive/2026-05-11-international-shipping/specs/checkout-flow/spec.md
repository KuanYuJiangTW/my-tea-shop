## ADDED Requirements

### Requirement: 國際配送選項

結帳頁新增「配送地區」選擇，分為台灣境內與國際配送。

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

## MODIFIED Requirements

### Requirement: 運費計算統一化

現有結帳頁的運費計算邏輯改用 API 回傳或共用函式計算，不再前端硬編碼。
