## 1. 安裝套件

- [x] 1.1 安裝 recharts：`npm install recharts`
- [x] 1.2 確認 recharts types 可用（recharts 內建 TypeScript 定義，無需額外安裝）

## 2. 擴展 Dashboard 資料查詢

- [x] 2.1 在 `dashboard/page.tsx` 的 `getStats()` 中新增今日體驗預約數查詢（`experience_bookings` where `status='confirmed'` and booking created today）
- [x] 2.2 新增本月體驗營收查詢（join `experience_sessions` 篩選 `session_date` 在本月，`status='confirmed'` 的 `total_price` 加總）
- [x] 2.3 新增近 5 筆體驗預約查詢（依 `created_at` 降序，join `experience_sessions` 和 `experience_types` 取得場次日期與體驗名稱）
- [x] 2.4 新增近 6 個月月份彙總查詢（查詢 6 個月內的 `orders` 和 `experience_bookings`，在 JS 端按月份 reduce 成圖表資料）

## 3. 新增 RevenueChart Client Component

- [x] 3.1 建立 `src/app/admin/(protected)/dashboard/RevenueChart.tsx`（`"use client"`）
- [x] 3.2 使用 Recharts `ResponsiveContainer`、`LineChart`、`Line`、`XAxis`、`YAxis`、`Tooltip`、`Legend` 渲染折線圖
- [x] 3.3 產品營收折線使用綠色（`#7D9B84`），體驗營收折線使用琥珀色（`#D97706`）
- [x] 3.4 Tooltip formatter 格式化為 `NT$X,XXX`
- [x] 3.5 在 `dashboard/page.tsx` 中以 `next/dynamic` + `ssr: false` 動態引入 RevenueChart，並提供 loading placeholder

## 4. 更新統計卡片版型

- [x] 4.1 將統計卡片從 3 張改為 6 張：今日訂單、今日體驗預約、本月產品營收、本月體驗營收、本月總營收、待出貨
- [x] 4.2 調整 grid 版型為 `grid-cols-2 sm:grid-cols-3`，RWD 兩行顯示
- [x] 4.3 各卡片加上對應圖示（體驗預約用日曆 icon，體驗營收用茶葉 icon，總營收用合計 icon）

## 5. 新增最近體驗預約列表

- [x] 5.1 在最新訂單列表下方新增「最近體驗預約」區塊（白色卡片，含標題列和查看全部連結）
- [x] 5.2 列表每列顯示：預約者姓名、體驗類型名稱、場次日期、人數、金額
- [x] 5.3 每列可點擊連結至 `/admin/experiences/bookings`
- [x] 5.4 無資料時顯示「目前尚無預約」提示文字

## 6. 更新快速連結

- [x] 6.1 快速連結從 2 個改為 3 個：待出貨訂單、管理產品、體驗管理（連結至 `/admin/experiences/bookings`）
- [x] 6.2 調整快速連結 grid 版型為 `grid-cols-1 sm:grid-cols-3`
