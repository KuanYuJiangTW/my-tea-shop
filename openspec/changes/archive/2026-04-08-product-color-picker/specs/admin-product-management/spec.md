## MODIFIED Requirements

### Requirement: 後台新增商品時可填寫完整內容欄位
系統 SHALL 在後台新增商品表單提供以下所有欄位，並於送出時寫入 Supabase `products` 資料表：

必填欄位：
- `slug`（kebab-case 格式）
- `price`（150g 售價，0 或正整數）

選填欄位：
- `name`（商品中文名稱；若未填，預設使用 slug）
- `name_en`（商品英文名稱）
- `category`（分類，例如：烏龍茶、紅茶）
- `origin`（產地，例如：梨山）
- `altitude`（海拔，例如：2000m）
- `weight`（重量規格，例如：150g / 75g）
- `description`（商品描述）
- `color`（**視覺化色票選擇器**，從預設清單選擇 Tailwind 漸層 class；預設為第一個色票，確保永遠有值）
- `image_url`（封面圖片 URL）
- `image_url2`（第二張圖片 URL）
- `stock_quantity`、`price_75g`、`stock_75g`、`price_tea_bag`、`stock_tea_bag`（售價與庫存）

#### Scenario: color 欄位顯示視覺化色票
- **WHEN** 管理員開啟新增商品表單
- **THEN** `color` 欄位顯示 10 個漸層色票，預設選中第一個

#### Scenario: 管理員選擇色票
- **WHEN** 管理員點擊某個色票
- **THEN** 該色票顯示選中狀態（ring 邊框），`color` 值更新為對應的 Tailwind class

#### Scenario: 送出時 color 永遠有值
- **WHEN** 管理員未主動選擇色票直接送出
- **THEN** `color` 欄位使用預設色票值，不送出空字串

#### Scenario: 填寫完整欄位後新增商品
- **WHEN** 管理員填寫 slug、售價及其他欄位後送出
- **THEN** 系統建立商品並將所有欄位寫入 Supabase，回傳 HTTP 201
