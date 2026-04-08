## 1. Sanity — product schema

- [x] 1.1 新增 `src/sanity/schemas/product.ts`，定義欄位：`slug`（必填）、`name`、`nameEn`、`description`（Rich Text block）、`coverImage`（image + hotspot）、`gallery`（array of image）、`category`、`origin`、`altitude`、`color`
- [x] 1.2 在 `src/sanity/schemas/index.ts` 將 `productSchema` 加入 schema 列表，使其出現在 Sanity Studio

## 2. API — POST /api/admin/products

- [x] 2.1 在 `src/app/api/admin/products/route.ts` 新增 `POST` handler，驗證必填欄位（`slug`、`price`），重複 slug 回傳 400
- [x] 2.2 `POST` handler 將選填欄位空字串轉為 `null`，`is_active` 預設 `false`，插入 Supabase `products` 資料表
- [x] 2.3 成功時回傳 HTTP 201 與完整新商品物件

## 3. UI — 後台新增商品表單

- [x] 3.1 在 `ProductsClient.tsx` 新增 `createForm` state（slug、price 及各選填商務欄位）及 `showCreate` boolean state
- [x] 3.2 在頁面標題旁新增「+ 新增商品」按鈕，點擊切換 `showCreate`
- [x] 3.3 當 `showCreate` 為 true 時，在列表上方渲染新增表單（必填：slug、150g 售價；選填：各規格）
- [x] 3.4 表單加入提示文字：「商品描述與圖片請前往 Sanity Studio 填寫」並附 `/studio` 連結
- [x] 3.5 實作前端表單驗證：slug 非空且符合 kebab-case、price 為有效正整數，未通過顯示欄位提示，不送出請求
- [x] 3.6 實作 `createProduct` 函式：呼叫 `POST /api/admin/products`，成功後將新商品 prepend 到 `products` state，收起並清空表單，顯示「商品已建立 ✓ 請前往 Studio 補充內容」訊息
- [x] 3.7 API 失敗時在表單底部顯示錯誤訊息，保留已填內容

## 4. 驗收測試

- [x] 4.1 在 Sanity Studio `/studio` 確認「商品」類型出現，可新增 document、上傳封面圖、填寫 Rich Text 描述
- [x] 4.2 填入 slug + 售價送出，確認新商品出現在後台列表頂部且狀態為「下架」
- [x] 4.3 填入重複 slug 送出，確認回傳錯誤提示「Slug 已存在」
- [x] 4.4 未填 slug 或售價直接送出，確認前端顯示驗證錯誤且無 API 請求發出
