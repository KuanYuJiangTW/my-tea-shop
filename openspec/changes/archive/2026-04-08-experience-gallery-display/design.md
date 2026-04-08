## Context

`content.gallery`（`string[]`）已由 `getExperienceContent` 從 Sanity 取得並傳入 `ExperienceDetailPage`，但頁面從未渲染它。修正只在前台 UI 層，無需異動資料層、API 或 Sanity schema。

## Goals / Non-Goals

**Goals:**
- 在 `/experiences/[slug]` 頁面顯示 Sanity 相簿照片的縮圖格線
- 點擊縮圖可用 lightbox 放大瀏覽
- gallery 為空時不顯示此區塊

**Non-Goals:**
- 修改 Sanity schema 或 GROQ query
- 修改資料層（`lib/experiences.ts`）
- 在列表頁（`/experiences`）顯示相簿

## Decisions

**複用 `ProductLightbox` 元件**
`src/components/ProductLightbox.tsx` 已實作 lightbox 功能（支援多張照片、鍵盤導航），直接複用以避免重複程式碼。

**Gallery 區塊位置**
放在「注意事項」下方、退款政策上方的左側欄，讓右側日曆欄不受影響。若照片較多，也可考慮橫跨全寬放在左右欄下方，但目前以最小改動為原則。

## Risks / Trade-offs

- `cdn.sanity.io` 已在 `next.config.ts` 的 `remotePatterns`，`next/image` 可正常顯示 → 無風險
- `ProductLightbox` 的 `LightboxPhoto` 型別需要 `productName`/`productNameEn`，傳入體驗名稱即可
