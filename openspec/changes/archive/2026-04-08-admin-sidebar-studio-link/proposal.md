## Why

目前後台有兩套管理系統並存：`/admin`（場次、預約、評價）與 `/studio`（Sanity，體驗文案、圖片、新活動上架）。管理員需要手動輸入網址才能到達 Sanity Studio，不方便。在 `/admin` 側欄加一個「內容管理」連結，讓兩套系統可以無縫切換。

## What Changes

- 在 `AdminSidebar` 的導航清單末端新增「內容管理」連結，點擊後以新分頁開啟 `/studio`
- 連結視覺上與現有導航項目一致，但帶有外部連結圖示以區分「離開後台」的行為

## Capabilities

### New Capabilities

（無需新增規格，這是純 UI 變更）

### Modified Capabilities

- `admin-auth`: `/admin` 側欄新增 Sanity Studio 入口連結

## Impact

**修改檔案**：`src/app/admin/AdminSidebar.tsx`
**無 API 變動、無資料庫變動**
