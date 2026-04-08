## 1. DELETE API

- [x] 1.1 `src/app/api/admin/products/[id]/route.ts`：新增 DELETE handler，刪除指定 id 的商品並回傳 `{ ok: true }`

## 2. 後台 UI 刪除功能

- [x] 2.1 `ProductsClient.tsx`：新增 `confirmDeleteId` state（`number | null`）追蹤待確認刪除的商品
- [x] 2.2 `ProductsClient.tsx`：新增 `deleting` state（`boolean`）追蹤刪除中狀態
- [x] 2.3 `ProductsClient.tsx`：非編輯狀態下，每筆商品操作區新增「刪除」按鈕，點擊設定 `confirmDeleteId`
- [x] 2.4 `ProductsClient.tsx`：新增確認 modal，顯示商品名稱，含「確認刪除」與「取消」按鈕
- [x] 2.5 `ProductsClient.tsx`：實作 `deleteProduct(id)` 函式，呼叫 DELETE API，成功後從 `products` state 移除該筆並關閉 modal

## 3. 驗收測試

- [x] 3.1 點擊刪除按鈕 → modal 出現並顯示正確商品名稱
- [x] 3.2 點擊取消 → modal 關閉，商品列表不變
- [x] 3.3 點擊確認刪除 → 商品從列表消失，Supabase 該筆資料已移除
- [x] 3.4 編輯狀態中的商品 → 刪除按鈕不顯示
