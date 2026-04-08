## 1. 相簿 UI 實作

- [x] 1.1 `src/app/experiences/[slug]/page.tsx`：import `ProductLightbox` 與 `useState`（改為 client component 或抽出子元件）
- [x] 1.2 在左側欄「注意事項」下方新增 Gallery 區塊：縮圖格線，`content.gallery` 為空時不渲染
- [x] 1.3 縮圖點擊後開啟 `ProductLightbox`，傳入 gallery 照片陣列，支援左右切換

## 2. 驗收測試

- [x] 2.1 Sanity 有相簿照片時，前台顯示縮圖格線
- [x] 2.2 Sanity 相簿為空時，不顯示相簿區塊
- [x] 2.3 點擊縮圖 → lightbox 開啟，可左右切換
