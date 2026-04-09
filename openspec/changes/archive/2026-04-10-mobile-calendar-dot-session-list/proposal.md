## Why

手機版體驗詳情頁的月曆，將完整場次按鈕（時間 + 剩餘人數兩行）塞進約 47px 寬的格子，導致內容溢出、觸控目標過小，嚴重影響行動裝置上的瀏覽與預約體驗。

## What Changes

- 月曆格子改為只顯示「日期數字 + 彩色圓點」，不再在格內放完整按鈕
- 使用者點選日期後，月曆下方展開該日的場次清單（每個場次為一張完整卡片）
- 場次卡片顯示：時間、剩餘人數、狀態標籤、預約按鈕，觸控目標從 ~47×20px 放大為整行
- 手機版月曆移至體驗資訊欄位上方，讓使用者不必先捲過大量文字才能選場次

## Capabilities

### New Capabilities
- `experience-calendar-mobile`: 月曆採「圓點指示 + 點選展開場次清單」的行動裝置優化互動模式

### Modified Capabilities
- `experience-detail`: 手機版版面順序調整，月曆優先顯示於體驗資訊之前

## Impact

- 修改 `src/app/experiences/[slug]/ExperienceCalendar.tsx`（主要改動）
- 修改 `src/app/experiences/[slug]/page.tsx`（調整 column order）
- 不影響 booking flow（`/experiences/booking/[sessionId]`）
- 不新增 npm 套件
