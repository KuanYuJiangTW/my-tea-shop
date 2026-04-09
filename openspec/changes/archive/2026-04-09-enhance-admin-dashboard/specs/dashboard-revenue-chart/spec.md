## ADDED Requirements

### Requirement: 近 6 個月營收趨勢圖
儀表板 SHALL 顯示一張折線圖，呈現過去 6 個月（含當月）的「產品營收」與「體驗營收」趨勢，兩條折線分色顯示。

#### Scenario: 有歷史資料時顯示折線圖
- **WHEN** 管理者訪問 `/admin/dashboard`
- **THEN** 頁面顯示折線圖，X 軸為月份標籤（如「1月」「2月」），Y 軸為金額（NT$），產品營收為綠色線，體驗營收為琥珀色線

#### Scenario: 某月無資料時顯示為零
- **WHEN** 某月份沒有任何已付款訂單或已確認體驗預約
- **THEN** 該月份在折線圖上的值顯示為 0，折線不中斷

#### Scenario: 圖表 hover 顯示數值
- **WHEN** 使用者將滑鼠移到折線圖的某個資料點上
- **THEN** 顯示 Tooltip，包含該月產品營收與體驗營收的金額

### Requirement: 圖表使用動態載入避免 SSR 錯誤
RevenueChart Client Component SHALL 透過 `next/dynamic` 以 `ssr: false` 方式引入，確保不在 server 端渲染 Recharts。

#### Scenario: 頁面首次載入時圖表區域顯示 loading placeholder
- **WHEN** 使用者首次載入儀表板頁面
- **THEN** 圖表區域先顯示 loading skeleton 或空白框，待 JS 載入後再渲染折線圖
