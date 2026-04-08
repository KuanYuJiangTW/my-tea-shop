## 1. 色票常數

- [x] 1.1 `ProductsClient.tsx`：定義 `COLOR_OPTIONS` 常數陣列，包含 10 個色票物件（`{ label, value }`，`value` 為 Tailwind 漸層 class）

## 2. 表單 UI

- [x] 2.1 `ProductsClient.tsx`：`EMPTY_CREATE_FORM.color` 預設值改為 `COLOR_OPTIONS[0].value`
- [x] 2.2 `ProductsClient.tsx`：新增商品表單的 `color` 欄位改為色票選擇器 UI（色塊 grid，選中顯示 ring）

## 3. 驗收測試

- [ ] 3.1 開啟新增商品表單 → 顯示 10 個漸層色票，第一個預設選中
- [ ] 3.2 點擊任一色票 → 該色票顯示選中 ring，其餘取消選中
- [ ] 3.3 不選色票直接送出 → 商品建立成功，`color` 欄位有預設值
- [ ] 3.4 前台商品卡片 → 正確顯示所選漸層背景色
