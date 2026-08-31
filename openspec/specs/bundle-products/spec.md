# bundle-products Specification

## Purpose
TBD - created by archiving change tasting-set. Update Purpose after archive.
## Requirements
### Requirement: 組合商品以獨立資料表描述其成分
系統 SHALL 以 `product_bundles`（組合本身）與 `product_bundle_items`（成分：`product_id`、`spec`、`quantity`）描述組合，SHALL NOT 將成分寫死在程式碼中。

#### Scenario: 建立組合
- **WHEN** 新增一個包含三款茶各 75g × 1 的組合
- **THEN** `product_bundles` 一列、`product_bundle_items` 三列，前台讀取後能列出三款成分名稱

#### Scenario: 成分變更
- **WHEN** 管理員調整某組合的成分
- **THEN** 前台顯示與可售量隨之改變，且**既有訂單的成分快照不受影響**

### Requirement: 組合的可售量取成分的最小可組數
系統 SHALL 以 `min(floor(成分庫存 ÷ 成分所需數量))` 計算組合可售量，SHALL NOT 另存獨立庫存欄位。

#### Scenario: 成分庫存充足
- **WHEN** 三款成分的 `stock_75g` 分別為 50、53、48，每組各需 1
- **THEN** 組合可售量為 48

#### Scenario: 單一成分耗盡
- **WHEN** 任一成分庫存為 0
- **THEN** 組合可售量為 0，前台顯示售完而非隱藏該商品

#### Scenario: 成分需求量大於 1
- **WHEN** 某成分每組需要 2 件而其庫存為 5
- **THEN** 該成分對可售量的貢獻為 2

### Requirement: 組合的庫存扣減必須是原子操作
系統 SHALL 透過單一資料庫函式 `decrement_bundle_stock(bundle_id, qty)` 在一個交易內扣減所有成分；任一成分不足時 SHALL 回滾全部扣減並回報失敗。

#### Scenario: 全部成分足夠
- **WHEN** 呼叫 `decrement_bundle_stock` 且所有成分庫存足夠
- **THEN** 所有成分的庫存各減去「所需數量 × 組數」，函式回傳成功

#### Scenario: 其中一項成分不足
- **WHEN** 第三項成分庫存不足
- **THEN** 前兩項的扣減一併回滾，三款成分庫存都維持原值，函式回報失敗

#### Scenario: 併發下單
- **WHEN** 兩筆訂單同時搶購僅剩 1 組的組合
- **THEN** 只有一筆成功，另一筆收到庫存不足，且成分庫存不會變成負數

### Requirement: 建單失敗時已扣減的庫存必須回補
系統 SHALL 在庫存扣減成功但後續步驟失敗（訂單寫入錯誤、其他品項扣減失敗）時，回補所有已扣減的庫存，SHALL NOT 留下「庫存已扣但訂單不存在」的狀態。

#### Scenario: 多品項中有一項扣減失敗
- **WHEN** 訂單含三個品項，第三項庫存不足
- **THEN** 前兩項已扣減的庫存被回補，回傳 HTTP 400 且無訂單產生

#### Scenario: 扣減成功但訂單寫入失敗
- **WHEN** 所有品項扣減成功，但 `orders` 寫入回傳錯誤
- **THEN** 所有已扣減的庫存被回補，回傳 HTTP 500 且無訂單產生

### Requirement: 組合在購物車與訂單中以單一品項存在
系統 SHALL 將組合在 `orders.items` 中記為一個項目，並附上下單當時的成分快照，SHALL NOT 展開成多個品項。

#### Scenario: 訂單明細顯示
- **WHEN** 客人購買一組品飲組
- **THEN** 訂單明細顯示一列組合名稱與價格，並可展開看到當時的三款成分

#### Scenario: 成分日後變更
- **WHEN** 組合的成分在出貨後被調整
- **THEN** 該筆歷史訂單仍顯示下單當時的成分

### Requirement: 組合缺貨時的錯誤訊息要指出是哪一款成分
系統 SHALL 在組合因庫存不足而下單失敗時，於錯誤訊息中指出不足的成分名稱。

#### Scenario: 成分缺貨
- **WHEN** 客人結帳時金萱 75g 已被其他訂單買光
- **THEN** 錯誤訊息指出是「阿里山金萱茶」不足，而非只說「庫存不足」

