## Context

目前儀表板（`/admin/dashboard`）為純 Server Component，查詢三個數字（今日訂單數、本月商品營收、待出貨數）與最新 5 筆訂單。所有資料來自 `orders` 表，完全沒有 `experience_bookings` 的資料。需要：
1. 擴展資料查詢：加入體驗預約的統計與月份彙總
2. 新增 Client Component 來渲染互動圖表（Recharts）
3. 調整版型以容納更多卡片與圖表區塊

## Goals / Non-Goals

**Goals:**
- 統計卡片拆分為：產品營收、體驗營收、總營收，並保留今日訂單、今日體驗預約、待出貨
- 近 6 個月趨勢折線圖（產品 vs 體驗），使用 Recharts
- 最近體驗預約列表（類似現有最新訂單）
- 快速連結補充體驗管理入口

**Non-Goals:**
- 不實作即時更新（WebSocket / polling）
- 不製作自訂日期範圍篩選器
- 不修改 experience_bookings 資料結構
- 不做角色權限細分（儀表板僅供 admin 使用）

## Decisions

**決策 1：圖表使用 Recharts 而非 Chart.js**
- 理由：Recharts 是 React 原生元件，無需 canvas ref 操作，和 Next.js Client Component 整合更簡潔
- 替代方案考量：Chart.js 需要 useEffect + ref，在 SSR 環境容易有 hydration 問題

**決策 2：圖表為獨立 Client Component（`RevenueChart.tsx`）**
- 理由：Recharts 使用瀏覽器 API，必須是 Client Component；Dashboard page 本身繼續保持 Server Component，資料在 server side 查詢後以 props 傳入
- 好處：chart 資料不需要額外 client-side fetch，SSR 直出資料

**決策 3：月份彙總在 server 端計算，不依賴 Supabase RPC**
- 理由：避免增加 DB 函式維護負擔；6 個月的訂單資料量有限（幾百筆），在 JS 端 reduce 效能可接受
- 做法：一次查詢 6 個月的 orders 和 experience_bookings，在 getStats() 中按月份 reduce

**決策 4：統計卡片從 3 張擴展到 6 張**
- 版型：手機 `grid-cols-2`，桌機 `grid-cols-3`（兩行）
- 新增：產品營收、體驗營收、總營收（取代原「本月營收」一張）、今日體驗預約數

## Risks / Trade-offs

- [Recharts bundle size ~300KB] → 使用 dynamic import + `ssr: false` 避免 SSR 錯誤，code splitting 讓首次載入不受影響
- [6 個月查詢可能返回大量訂單行] → 只 select 需要的欄位（created_at, total_amount），不抓詳細資料
- [experience_bookings 退款後狀態] → 只計算 `status = 'confirmed'` 的預約，已取消不算入營收

## Migration Plan

1. 安裝 recharts：`npm install recharts`
2. 修改 `dashboard/page.tsx`：擴展 getStats()，傳入圖表資料 props
3. 新增 `dashboard/RevenueChart.tsx`（Client Component）
4. 調整 dashboard 版型（卡片 + 圖表 + 最近預約區塊）
5. 無資料庫 migration，無 rollback 需求（純前端 + 查詢變更）

## Open Questions

- 無
