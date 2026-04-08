## Context

後台產品列表每筆商品點擊「編輯」後展開編輯區塊。現有 `EditState` 只包含 `name`、`is_active`、`price`、`stock_quantity`、`price_75g`、`stock_75g`、`price_tea_bag`、`stock_tea_bag`。PATCH API 同樣只接受這些欄位。其他欄位（`name_en`、`category`、`origin`、`altitude`、`weight`、`description`、`color`、`image_url`、`image_url2`）新增後無法在後台修改。

`Product` type 目前也缺少這些欄位，`page.tsx` 的 SELECT 也需要同步補齊。

## Goals / Non-Goals

**Goals:**
- `EditState` 新增所有內容欄位
- 編輯 UI 加入「內容資料」子區塊，包含新欄位與色票選擇器
- PATCH API 接受所有新欄位
- `Product` type 與 SELECT 補齊欄位
- 儲存後觸發 revalidation（與現有 is_active 邏輯一致，擴大為任何儲存都觸發）

**Non-Goals:**
- 不修改新增商品表單（已完整）
- 不新增圖片上傳功能

## Decisions

**編輯展開後分兩個子區塊**

現有「各規格售價與庫存」區塊維持不動，在其上方新增「內容資料」區塊，包含名稱、描述、圖片、色票等。視覺上與新增表單的分區邏輯一致。

**色票選擇器與新增表單共用 `COLOR_OPTIONS` 常數**

`COLOR_OPTIONS` 已定義在 `ProductsClient.tsx`，直接複用，無需重複定義。

**儲存任何欄位都觸發 revalidation**

原本只有 `is_active` 變動才觸發。擴大為所有 PATCH 儲存都觸發，確保商品名稱、圖片等內容更新後前台立即反映。

## Risks / Trade-offs

- [編輯區塊變長] → 分兩個子區塊降低視覺複雜度
- [revalidation 頻率增加] → 每次儲存都觸發，但商品編輯頻率低，影響可忽略
