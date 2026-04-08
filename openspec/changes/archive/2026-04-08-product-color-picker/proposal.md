## Why

後台新增商品時，`color` 欄位是純文字輸入，管理員需要自行記住 Tailwind 漸層 class（如 `from-green-100 to-emerald-200`），不直觀且容易填錯或留空，導致商品卡背景顯示為白色。

## What Changes

- 後台新增商品表單的 `color` 欄位改為視覺化色票選擇器：顯示 8–10 個預設漸層色票，管理員點選即可，不需手動輸入
- 每個色票顯示對應的漸層預覽與名稱（例如：翠綠、琥珀、玫瑰）
- 預設選中第一個色票，確保 `color` 永遠有值，不會送出空字串

## Capabilities

### New Capabilities

### Modified Capabilities
- `admin-product-management`：新增商品時 `color` 欄位改為色票選擇器，取代純文字輸入。

## Impact

- `src/app/admin/(protected)/products/ProductsClient.tsx`：`color` 欄位 UI 改為色票選擇器，`EMPTY_CREATE_FORM` 預設值改為第一個色票的 class
