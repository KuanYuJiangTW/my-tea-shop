## Why

目前儀表板只顯示商品訂單的統計數字，缺少視覺化圖表與體驗預約的收入數據，無法讓管理者快速掌握整體業績全貌。補強後可作為 SaaS 後台作品集的核心展示。

## What Changes

- 新增近 6 個月「產品營收 vs 體驗營收」趨勢折線圖（Recharts）
- 將「本月營收」拆分為：產品營收、體驗營收、總營收三張卡片
- 新增今日體驗預約數統計卡片
- 新增「最近體驗預約」列表（類似現有最新訂單列表）
- 新增「待確認體驗場次」快速連結（本月有場次但尚未達開課人數）
- 調整統計卡片排版，支援更多卡片的 RWD 顯示

## Capabilities

### New Capabilities
- `dashboard-revenue-chart`: 近 6 個月營收趨勢圖（產品 + 體驗分色折線，Recharts）
- `dashboard-experience-stats`: 體驗預約相關統計（今日預約數、本月體驗營收）

### Modified Capabilities
- `admin-dashboard`: 儀表板資料查詢擴展（加入 experience_bookings 收入）、統計卡片版型調整

## Impact

- `src/app/admin/(protected)/dashboard/page.tsx`：新增 experience_bookings 查詢、傳入圖表資料
- 新增 `src/app/admin/(protected)/dashboard/RevenueChart.tsx`：Client Component（Recharts）
- 安裝 `recharts` 套件
- Supabase 查詢新增：`experience_bookings`（status=confirmed）月份彙總
