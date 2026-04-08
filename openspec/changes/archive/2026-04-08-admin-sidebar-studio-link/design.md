## Context

`AdminSidebar` 使用 `navItems` 陣列統一渲染導航連結（Next.js `<Link>`）。`/studio` 是 Sanity Studio，為完全獨立的 UI，開啟後離開後台環境。

## Goals / Non-Goals

**Goals:**
- 在側欄加入 `/studio` 連結，讓管理員可快速切換至內容管理

**Non-Goals:**
- 修改 Sanity Studio 本身
- 任何認證整合（/studio 有自己的 Sanity 認證）

## Decisions

### D1：以 `<a target="_blank">` 開新分頁，而非 Next.js `<Link>`

`/studio` 是完全不同的 UI，使用者通常需要並排操作兩個系統。新分頁開啟可保留 `/admin` 的狀態，不中斷當前工作流程。

**實作方式**：不加入 `navItems` 陣列（避免 `isActive` 邏輯判斷），在 `<nav>` 末端單獨加一個 `<a>` 元素，樣式與 navItems 一致，加上小型外部連結圖示。

### D2：放在導航清單最下方，與登出按鈕之間以視覺區隔

「內容管理」性質不同於其他後台功能（它跳離後台），放在最下方、登出按鈕上方，並在 label 旁加上外部連結 icon 提示使用者行為。
