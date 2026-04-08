## Why

Sanity 後台已可為每個茶山體驗新增相簿照片，且 GROQ query 也已正確抓取 `gallery` 陣列，但體驗詳細頁面（`/experiences/[slug]`）從未渲染這些照片，導致相簿功能形同虛設。

## What Changes

- 在體驗詳細頁面的主內容區新增相簿（Gallery）區塊，顯示 Sanity 相簿中的所有照片
- 點擊縮圖可放大（lightbox）

## Capabilities

### New Capabilities

（無新 capability，純屬現有功能的前台渲染補完）

### Modified Capabilities

- `experience-detail`：體驗詳細頁面新增 gallery 展示區塊

## Impact

- `src/app/experiences/[slug]/page.tsx`：新增 gallery 區塊 UI
- `next.config.ts`：`cdn.sanity.io` 已在 `remotePatterns`，無需修改
