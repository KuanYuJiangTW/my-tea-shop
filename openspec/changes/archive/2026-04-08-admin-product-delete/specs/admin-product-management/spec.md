## ADDED Requirements

### Requirement: 後台可刪除商品
系統 SHALL 提供 `DELETE /api/admin/products/[id]`，將指定商品從 Supabase `products` 資料表中永久刪除。

#### Scenario: 成功刪除商品
- **WHEN** 管理員呼叫 `DELETE /api/admin/products/[id]`
- **THEN** 系統刪除該筆商品並回傳 HTTP 200 `{ ok: true }`

#### Scenario: 刪除不存在的商品
- **WHEN** 管理員呼叫 `DELETE /api/admin/products/[id]`，但該 id 不存在
- **THEN** 系統回傳 HTTP 200 `{ ok: true }`（冪等）

### Requirement: 後台刪除商品前須顯示確認對話框
系統 SHALL 在管理員點擊刪除按鈕後，顯示含商品名稱的確認 modal，管理員點擊確認後才執行刪除；點擊取消則關閉 modal 不執行任何操作。

#### Scenario: 點擊刪除顯示確認 modal
- **WHEN** 管理員點擊商品列的「刪除」按鈕
- **THEN** 畫面顯示確認 modal，內容包含該商品名稱

#### Scenario: 確認刪除
- **WHEN** 管理員在確認 modal 點擊「確認刪除」
- **THEN** 系統呼叫 DELETE API，成功後該商品從列表消失，modal 關閉

#### Scenario: 取消刪除
- **WHEN** 管理員在確認 modal 點擊「取消」
- **THEN** modal 關閉，商品列表不變

#### Scenario: 編輯中的商品不顯示刪除按鈕
- **WHEN** 商品處於編輯狀態（已展開編輯表單）
- **THEN** 該商品的刪除按鈕不顯示
