## Why

業主想在後台自己決定哪一款茶山體驗要出現在網站上（例如季節過了、人手不夠、還沒準備好的新體驗），但現在唯一的辦法是進 Supabase 改 `experience_types.is_active`。這個欄位前台其實已經在用：列表、詳細頁、sitemap、AI 客服都只取上架中的體驗。問題在於後台沒有按鈕可以切換。

另外，盤點時發現「下架」目前**擋不住新預約**：建立預約的 API、預約頁、「想來但沒訂到」登記都沒有檢查體驗是否上架。客人只要手上有舊的場次連結，還是能訂到、也能付款。如果下架只是把卡片藏起來，業主會以為已經關掉了，實際上卻還在收單。這是開關上線前必須一起補上的缺口。

## What Changes

- 後台「茶山體驗 → 排序與季節」（`/admin/experiences/ordering`）每一列加上「上架／下架」開關，外觀沿用商品、組合商品的綠色滑動開關；下架的那一列變灰並標「前台不顯示」。
- 新增後台 API `PATCH /api/admin/experience-types/[id]`，只接受 `{ is_active: boolean }`。這支 API 受後台登入保護，會寫入稽核日誌，並在切換後立即清除前台快取，所以按下後幾秒內就生效，不必等 1 小時的 ISR。
- 切換前跳出確認視窗：下架時列出這款體驗還有幾個未來的開放場次、幾筆有效預約（下架不會取消這些預約）；上架時提醒「客人會立刻看得到、可以預約」。
- **已下架的體驗不接受新的預約入口**：
  - `POST /api/bookings` 對已下架體驗的場次回 409
  - `/experiences/booking/[sessionId]` 對已下架體驗導回 `/experiences`
  - `POST /api/experience-interest` 對已下架體驗回 400
- 後台「場次管理」的體驗下拉選單改成列出全部體驗，下架的標「（未上架）」。這樣可以先把場次排好，再把體驗打開。
- 不在本次範圍：`public/llms.txt` 是寫死的檔案，不會跟著開關變動。後台開關旁會加一行提醒，並另外記入 BACKLOG（改成依資料庫自動產生）。

## Capabilities

### New Capabilities
- `experience-visibility`：後台切換體驗上架／下架、前台顯示範圍、切換後的快取清除與稽核紀錄。

### Modified Capabilities
- `experience-booking`：新增「已下架體驗不接受新預約」的需求。原本只檢查場次狀態是不是 `open`，現在還要檢查體驗本身有沒有上架。

## Impact

- **新增**：`src/app/api/admin/experience-types/[id]/route.ts`
- **修改（前台／高風險）**：`src/app/api/bookings/route.ts`（預約與金流入口）、`src/app/experiences/booking/[sessionId]/page.tsx`、`src/app/api/experience-interest/route.ts`
- **修改（後台）**：`src/app/admin/(protected)/experiences/ordering/OrderingClient.tsx`、`src/app/admin/(protected)/experiences/sessions/page.tsx`
- **資料庫**：不改結構。沿用既有的 `experience_types.is_active`（正式站 2026-11-07 查證：7 款中 6 款上架，`egret-half-day` 刻意下架）。
- **不受影響**：已成立的預約、提醒信 cron、取消與退款流程、候補確認（見 design.md D5）。
