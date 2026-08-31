# product-image-upload Specification

## Purpose
前台商品卡片的圖片來源順序：優先讀取 gallery 欄位，沒有時退回既有的單張圖片欄位。

## Requirements

### Requirement: 前台商品卡片優先讀取 gallery 欄位
系統 SHALL 在 `lib/products.ts` 的 `mapRow` 函式中，優先使用 `gallery[0]` 作為主圖、`gallery[1]` 作為副圖，若 gallery 為空則 fallback 至 `image_url`/`image_url2`，確保現有商品資料不受影響。

#### Scenario: 商品有 gallery 資料
- **WHEN** 前台讀取商品資料，`gallery` 陣列有值
- **THEN** `product.image = gallery[0]`，`product.image2 = gallery[1]`

#### Scenario: 商品無 gallery 資料（舊資料向下相容）
- **WHEN** 前台讀取商品資料，`gallery` 為空或 null
- **THEN** `product.image = image_url`，`product.image2 = image_url2`
