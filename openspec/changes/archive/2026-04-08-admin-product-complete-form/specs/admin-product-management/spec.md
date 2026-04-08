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
- `color`（顏色標籤）
- `image_url`（封面圖片 URL）
- `image_url2`（第二張圖片 URL）
- `stock_quantity`、`price_75g`、`stock_75g`、`price_tea_bag`、`stock_tea_bag`（售價與庫存，同現有欄位）

#### Scenario: 填寫完整欄位後新增商品
- **WHEN** 管理員在新增表單填寫 slug、售價及所有內容欄位後送出
- **THEN** 系統建立商品並將所有欄位寫入 Supabase，回傳 HTTP 201

#### Scenario: 僅填必填欄位新增商品
- **WHEN** 管理員只填 slug 和 150g 售價後送出
- **THEN** 系統建立商品，`name` 預設為 slug，其餘選填欄位為 null，回傳 HTTP 201

#### Scenario: 填寫圖片 URL
- **WHEN** 管理員在 `image_url` 欄位輸入有效的圖片網址後送出
- **THEN** `image_url` 欄位寫入 Supabase，前台商品頁可顯示該圖片
