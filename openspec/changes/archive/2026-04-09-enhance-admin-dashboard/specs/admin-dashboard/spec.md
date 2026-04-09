## MODIFIED Requirements

### Requirement: 儀表板統計卡片顯示產品、體驗與總營收
儀表板 SHALL 顯示 6 張統計卡片（手機 2 欄、桌機 3 欄排列）：
1. 今日商品訂單數
2. 今日體驗預約數
3. 本月產品營收（`orders` 表，`payment_status = 'paid'`）
4. 本月體驗營收（`experience_bookings` 表，`status = 'confirmed'`，透過 session join 篩選月份）
5. 本月總營收（產品營收 + 體驗營收）
6. 待出貨訂單數（`order_status in ['new', 'preparing']`）

#### Scenario: 本月同時有商品訂單與體驗預約時
- **WHEN** 本月商品已付款營收為 NT$10,000，體驗已確認營收為 NT$3,600
- **THEN** 卡片分別顯示「NT$10,000」、「NT$3,600」、「NT$13,600」

#### Scenario: 本月僅有商品訂單無體驗預約時
- **WHEN** 本月體驗預約為 0 筆
- **THEN** 體驗營收卡片顯示「NT$0」，總營收等於產品營收

### Requirement: 快速連結包含體驗管理入口
儀表板底部快速連結 SHALL 包含「體驗管理」連結，導向 `/admin/experiences/bookings`。

#### Scenario: 點擊體驗管理快速連結
- **WHEN** 管理者點擊「體驗管理」快速連結
- **THEN** 導向 `/admin/experiences/bookings` 預約管理頁面
