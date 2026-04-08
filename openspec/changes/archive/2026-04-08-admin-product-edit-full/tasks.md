## 1. 型別與 SELECT 補齊

- [x] 1.1 `ProductsClient.tsx`：`Product` type 新增 `name_en`、`category`、`origin`、`altitude`、`weight`、`description`、`color`、`image_url`、`image_url2` 欄位
- [x] 1.2 `page.tsx`：SELECT 補齊上述欄位

## 2. PATCH API 擴充

- [x] 2.1 `[id]/route.ts`：PATCH handler 新增 `name_en`、`category`、`origin`、`altitude`、`weight`、`description`、`color`、`image_url`、`image_url2` 欄位支援
- [x] 2.2 `[id]/route.ts`：所有 PATCH 儲存都觸發 revalidation（不限於 is_active 變動）

## 3. 編輯表單 UI 擴充

- [x] 3.1 `ProductsClient.tsx`：`EditState` type 新增所有內容欄位
- [x] 3.2 `ProductsClient.tsx`：`startEdit()` 初始化新增欄位（從 product 帶入現有值）
- [x] 3.3 `ProductsClient.tsx`：`saveProduct()` 送出時包含所有新欄位
- [x] 3.4 `ProductsClient.tsx`：編輯展開區塊加入「內容資料」子區塊（名稱、英文名稱、分類、產地、海拔、重量、描述、色票、圖片 URL）

## 4. 驗收測試

- [ ] 4.1 點擊編輯 → 展開區塊顯示「內容資料」與「規格售價與庫存」兩個子區塊
- [ ] 4.2 修改描述後儲存 → Supabase 資料更新，前台立即反映
- [ ] 4.3 切換色票後儲存 → 前台商品卡片背景色更新
- [ ] 4.4 修改圖片 URL 後儲存 → 前台商品圖片更新
