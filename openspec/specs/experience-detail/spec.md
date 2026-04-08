### Requirement: 體驗詳細頁面顯示 Sanity 相簿照片
系統 SHALL 在體驗詳細頁面（`/experiences/[slug]`）顯示 `content.gallery` 中的所有照片，當 gallery 陣列不為空時。

#### Scenario: gallery 有照片時顯示縮圖格線
- **WHEN** Sanity 相簿中有至少一張照片
- **THEN** 頁面顯示照片縮圖格線區塊，每張照片以 `next/image` 渲染

#### Scenario: gallery 為空時不顯示區塊
- **WHEN** Sanity 相簿為空或 gallery 欄位未設定
- **THEN** 頁面不顯示任何相簿相關 UI

#### Scenario: 點擊縮圖可放大
- **WHEN** 使用者點擊相簿中任一縮圖
- **THEN** lightbox 以全螢幕模式顯示該照片，可左右切換其他照片
