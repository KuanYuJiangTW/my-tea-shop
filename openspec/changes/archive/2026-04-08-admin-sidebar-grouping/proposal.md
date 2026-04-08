## Why

目前後台側欄的導航項目全部平鋪，無法一眼看出各功能的歸屬。將項目依業務群組分類，讓管理員更直觀地知道「體驗管理、評價管理、內容管理」都屬於茶山體驗，「訂單管理、產品管理」屬於商品業務。

## What Changes

重構 `AdminSidebar` 的導航結構：

- **移除**：現有平鋪式單層導航
- **新增**：分組式導航，含群組標題
  - 儀表板（獨立，不分組）
  - **茶山體驗** 群組：體驗管理、評價管理、內容管理（→ /studio，新分頁）
  - **商品** 群組：訂單管理、產品管理

## Capabilities

### New Capabilities

（純 UI 重構，無新功能）

### Modified Capabilities

- `admin-auth`: 後台側欄改為分組式導航結構

## Impact

**修改檔案**：`src/app/admin/AdminSidebar.tsx`
**無 API 變動、無資料庫變動**
