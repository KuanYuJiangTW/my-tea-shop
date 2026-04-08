## MODIFIED Requirements

### Requirement: 後台側欄提供 Sanity Studio 快速入口
後台側欄 SHALL 在「茶山體驗」群組內顯示「內容管理」連結，點擊後以新分頁開啟 `/studio`。

#### Scenario: 點擊內容管理連結
- **WHEN** 管理員點擊側欄「茶山體驗」群組內的「內容管理」連結
- **THEN** 瀏覽器以新分頁開啟 `/studio`，原後台分頁保持不變

#### Scenario: 內容管理連結帶有外部連結視覺提示
- **WHEN** 側欄渲染完成
- **THEN** 「內容管理」連結旁顯示外部連結圖示，提示使用者將離開後台

## ADDED Requirements

### Requirement: 後台側欄採分組式導航結構
後台側欄 SHALL 將導航項目依業務分組顯示，包含：
- 儀表板（獨立項目）
- **茶山體驗** 群組：體驗管理、評價管理、內容管理
- **商品** 群組：訂單管理、產品管理

#### Scenario: 側欄顯示分組標題
- **WHEN** 管理員查看後台側欄
- **THEN** 「茶山體驗」與「商品」群組標題以小字樣式顯示於對應項目上方

#### Scenario: 群組內項目的 active 狀態
- **WHEN** 管理員目前在 `/admin/experiences` 頁面
- **THEN** 「體驗管理」項目顯示 active 樣式，其餘項目不顯示
