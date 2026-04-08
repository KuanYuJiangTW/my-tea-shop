## Context

所有修改皆為純 Tailwind CSS class 調整，無邏輯變更。目標斷點：
- 手機：375px（iPhone SE/14 等主流機型）
- 小平板：640px（sm:）
- 平板：768px（md:）
- 桌機：1024px+（lg:）

## Goals / Non-Goals

**Goals:**
- 手機上不出現水平捲軸（除有 overflow-x-auto 包裝的表格外）
- 表格在手機上可水平滑動閱讀
- 所有可點擊元素在手機上至少 44×44px 觸控區域
- 多欄 grid/flex 在小螢幕自動換行

**Non-Goals:**
- 改變功能邏輯或 UI 結構
- 新增 RWD 之外的視覺改版
- 針對超大螢幕（2xl:）的優化

## Decisions

**表格一律加 `overflow-x-auto` wrapper**
後台管理表格欄位多，手機不可能完整顯示，水平滑動是最合理的操作方式。

**Grid 欄位漸進式：`grid-cols-1 sm:grid-cols-2 md:grid-cols-4`**
避免 640px 直接跳到 4 欄過擠，增加 sm: 中間層。

**相簿改 `grid-cols-2 sm:grid-cols-3`**
手機 2 欄讓縮圖夠大，桌機/平板才用 3 欄。

## Risks / Trade-offs

- 表格欄位順序與寬度維持原樣，不做欄位隱藏（保持資料完整性優先）
- Modal `mx-2 sm:mx-4` 在 320px 極窄手機可能仍稍擠，但屬邊緣情況
