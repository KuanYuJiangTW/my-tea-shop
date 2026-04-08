## ADDED Requirements

### Requirement: 後台側欄提供 Sanity Studio 快速入口
後台側欄 SHALL 在導航清單末端顯示「內容管理」連結，點擊後以新分頁開啟 `/studio`。

#### Scenario: 點擊內容管理連結
- **WHEN** 管理員點擊側欄的「內容管理」連結
- **THEN** 瀏覽器以新分頁開啟 `/studio`，原後台分頁保持不變

#### Scenario: 內容管理連結帶有外部連結視覺提示
- **WHEN** 側欄渲染完成
- **THEN** 「內容管理」連結旁顯示外部連結圖示，提示使用者將離開後台
