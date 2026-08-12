## ADDED Requirements

### Requirement: 商品評價的資料模型與體驗評價對齊
系統 SHALL 以獨立資料表 `product_reviews` 儲存商品評價，欄位包含 `product_id`、`rating`、`comment`、`source`、`display_name`、`reviewed_at`、`is_visible`，並保留 `order_id` 與 `user_id` 供投稿階段使用。

#### Scenario: 建立資料表
- **WHEN** 執行 `supabase/add_product_reviews.sql`
- **THEN** 建立 `product_reviews`，`is_visible` 預設 `true`，`rating` 有 1–5 的 CHECK 約束

#### Scenario: 保留投稿階段欄位
- **WHEN** 階段一手動建檔
- **THEN** `order_id` 與 `user_id` 為 NULL，不影響寫入

### Requirement: 評價來源必填且前台明示
系統 SHALL 要求每則評價帶有 `source`（`site` / `line` / `facebook` / `other`），且前台對 `source <> 'site'` 的評價 SHALL 顯示來源標註。

#### Scenario: 手動建檔的評價
- **WHEN** 後台新增一則 `source = 'line'` 的評價
- **THEN** 前台該則評價顯示來源標註（例如「來自 LINE 的顧客回饋」）

#### Scenario: 缺少來源
- **WHEN** 後台送出的資料未指定 `source`
- **THEN** 系統回傳 HTTP 400 `{ error: "參數錯誤" }`，不寫入

#### Scenario: 站內投稿的評價
- **WHEN** 評價 `source = 'site'`
- **THEN** 前台不顯示來源標註

### Requirement: 後台可新增商品評價並切換顯示狀態
系統 SHALL 提供後台介面新增商品評價（商品、星等、內容、顯示名稱、來源、原始出處備註、評價日期），並可切換 `is_visible`。

#### Scenario: 新增評價
- **WHEN** 管理員送出完整欄位
- **THEN** 寫入 `product_reviews` 並回傳 `{ id }`

#### Scenario: 隱藏評價
- **WHEN** 管理員將某則評價設為 `is_visible = false`
- **THEN** 前台不再顯示該則評價，資料不刪除

### Requirement: 前台只顯示 is_visible = true 的商品評價
系統 SHALL 在前台查詢中過濾 `is_visible = false` 的評價，並透過 RLS Policy 實現。

#### Scenario: 公開讀取商品評價
- **WHEN** 任何訪客查詢某商品的評價
- **THEN** 只回傳 `is_visible = true` 的評價

### Requirement: 星等彙總僅在評價數達門檻時顯示平均
系統 SHALL 在評價數 ≥ 3 時顯示平均星等與則數；評價數 < 3 時 SHALL 只顯示評價列表，不顯示平均星等。

#### Scenario: 評價數足夠
- **WHEN** 某商品有 3 則以上可見評價
- **THEN** 顯示平均星等（一位小數）與則數

#### Scenario: 評價數不足
- **WHEN** 某商品有 1–2 則可見評價
- **THEN** 顯示評價列表，不顯示平均星等

#### Scenario: 沒有評價
- **WHEN** 某商品沒有可見評價
- **THEN** 不顯示評價區塊（不顯示「暫無評價」）

### Requirement: 商品卡加入星等不得改變卡片高度
系統 SHALL 在商品卡加入星等彙總後維持卡片總高 632px；若無法在既有間距內吸收，SHALL 改為只在商品列表頁顯示星等、商品卡不顯示。

#### Scenario: 高度可吸收
- **WHEN** 加入星等列後量測商品卡總高仍為 632px
- **THEN** 商品卡顯示星等彙總

#### Scenario: 高度無法吸收
- **WHEN** 加入星等列後商品卡總高不等於 632px
- **THEN** 商品卡不顯示星等，改由列表頁其他位置呈現
