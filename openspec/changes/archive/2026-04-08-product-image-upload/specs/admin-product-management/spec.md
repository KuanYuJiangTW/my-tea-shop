## ADDED Requirements

### Requirement: 管理員可上傳商品圖片至 Supabase Storage
系統 SHALL 提供 `POST /api/admin/upload-image` API，接受單張圖片檔案，上傳至 Supabase Storage `product-images` bucket，回傳公開圖片 URL。

#### Scenario: 成功上傳圖片
- **WHEN** 管理員呼叫 `POST /api/admin/upload-image` 附帶圖片檔案與商品 slug
- **THEN** 系統將圖片儲存至 `product-images/{slug}/{timestamp}-{filename}`，回傳 HTTP 200 與圖片公開 URL

#### Scenario: 未授權請求
- **WHEN** 未登入的使用者呼叫上傳 API
- **THEN** 系統回傳 HTTP 401

### Requirement: 後台商品圖片區塊改為檔案上傳器
系統 SHALL 在新增商品與編輯商品的圖片區塊，提供檔案選擇器取代純文字 URL 輸入，支援最多 5 張圖片，並顯示縮圖預覽。

#### Scenario: 選擇圖片後立即上傳並顯示預覽
- **WHEN** 管理員點擊「選擇圖片」並選取圖片檔案
- **THEN** 系統立即上傳至 Supabase Storage，成功後顯示縮圖預覽

#### Scenario: 達到上限後無法繼續新增
- **WHEN** 已上傳 5 張圖片
- **THEN** 「選擇圖片」按鈕隱藏或停用，不允許繼續上傳

#### Scenario: 刪除已上傳圖片
- **WHEN** 管理員點擊縮圖上的刪除按鈕
- **THEN** 該圖片 URL 從 gallery 移除，縮圖消失

#### Scenario: 送出新增/儲存時 gallery 寫入資料庫
- **WHEN** 管理員送出新增商品或儲存編輯
- **THEN** `gallery` 欄位寫入所有已上傳圖片的 URL 陣列
