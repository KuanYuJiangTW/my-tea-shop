## 1. 預約入口補檢查（高風險區：先做、先測）

- [x] 1.1 先寫回歸測試 `src/__tests__/bookings/inactive-experience.test.ts`（照 `admin-ordering-api.test.ts` 的 supabase mock 寫法）：上架中可預約、下架回 409「此體驗目前未開放預約」、join 為 null 回 409 而非 500，且三種情況下都不會呼叫 insert
- [x] 1.2 `src/app/api/bookings/route.ts`：在 `session.status !== "open"` 之後、名額檢查之前加 `if (!expType?.is_active)` → 409（design D4）
- [x] 1.3 對 1.2 跑 `reverse-verify`：暫時拿掉檢查，確認 1.1 會紅，再改回來
- [x] 1.4 `src/app/experiences/booking/[sessionId]/page.tsx`：體驗已下架時 `redirect("/experiences?error=unavailable")`
- [x] 1.5 `src/app/api/experience-interest/route.ts`：寫入前查 `experience_types` 的 `is_active`，下架或不存在 → 400「此體驗目前未開放」；在 `interest-api.test.ts` 補上對應案例（不寫入、不寄信）
- [x] 1.6 確認付款與候補路徑**沒有**被加上 is_active 檢查（`ecpay/experience-checkout`、`waitlist/[id]/confirm`；體驗付款只有 ECPay 一條路，PayPal 沒有體驗付款路由），並在測試註解說明這是刻意的（design D5）
- [x] 1.7 `/experiences` 列表頁讀 `?error=unavailable`，顯示一行提示「這個體驗目前沒有開放預約」（中英文字串放 `messages/`）。目前這個參數沒有任何頁面處理，既有的 cancelled 導向也一樣，被導回來的客人看不到任何說明
- [x] 1.8 （實作時補）`src/app/api/waitlist/route.ts`：加入候補也是新入口，已下架 → 409，不寫入、不增加候補人數；測試併在 `inactive-experience.test.ts`

## 2. 後台 API

- [x] 2.1 新增 `src/app/api/admin/experience-types/[id]/route.ts` 的 PATCH，用 `withAdminAuth(..., "update_experience_active")` 包起來；body 只接受 `{ is_active: boolean }`，其餘回 400；id 不存在回 404
- [x] 2.2 更新成功後呼叫 `revalidatePath("/", "layout")`；失敗時回 500 且不清快取（design D3）
- [x] 2.3 測試 `src/__tests__/experiences/admin-experience-active.test.ts`：400（型別錯、多帶欄位）、404、200 時有呼叫 revalidatePath、500 時沒有呼叫；並確認 `route-auth-coverage.test.ts` 會自動涵蓋新路由
- [x] 2.4 決定 design 的 Open Question：由 `GET /api/admin/experience-ordering` 一併回傳每款體驗的「未來 open 場次數」與「有效預約數」（偏好），或另開 GET；寫進 design.md 的決策

## 3. 後台畫面

- [x] 3.1 `OrderingClient.tsx`：每列加上上架／下架開關（沿用 `BundlesClient.tsx` 的綠色滑動開關樣式），下架的列變灰並標「前台不顯示」
- [x] 3.2 確認視窗：下架時顯示未來場次數、有效預約數，以及「這些不會被取消」；上架時顯示「客人會立刻看得到並可以預約」（design D7）
- [x] 3.3 開關旁加一行提醒：「`llms.txt` 不會自動更新，下架後請告訴工程師」
- [x] 3.4 `sessions/page.tsx`：體驗選單改列全部體驗，下架的附「（未上架）」（design D6）
- [x] 3.5 對照 `docs/design-system.md` 檢查開關與灰階列的對比；用 `contrast-audit` 量測灰階列文字是否符合 AA
  - 2026-11-07 在 PR 預覽站實測：原本的灰底 `#F1EEE8` 上 `tea-text-light` 只有 3.36，而且整頁淡色字本來在白底上就只有 3.9（既有問題）
  - 業主選擇整頁一起修：灰底改成 `tea-cream`／`tea-cream-dark`，15 處 `text-tea-text-light` 改成 `text-tea-text-muted`
  - 未處理（不屬於本頁的淡色字）：側欄群組小標 3.05、季節標籤「白字＋`tea-green`」3.05，兩者都是共用樣式
  - 深色模式不適用（design-system 2.4：深色模式目前沒有啟用）
  - 修正後重量（在已登入的預覽頁套用同樣的 class 替換）：111 個文字節點中，下架列最低 4.52、白底 5.13；剩下 4 個不合格都是既有的「季節中」綠色標籤（3.05），不在本次範圍

## 4. 驗證與收尾

- [x] 4.1 `/verify` 全綠（測試＋型別＋lint 0 error＋build）
- [x] 4.2 本機實測（**改成唯讀**：本機的 `.env.local` 連的是正式站資料庫，在本機切換就等於切換正式站，所以不做切換）。改用本來就下架的 `egret-half-day` 當樣本，2026-11-07 在 `next start` 實測：
  - 列表中英文都不顯示它，`/experiences/egret-half-day` 回 404，sitemap 裡沒有它
  - `?error=unavailable` 中英文提示都有出現，沒帶參數時不出現
  - `POST /api/experience-interest` 對 id 7 與 9999 都回 400，資料庫查證沒有寫入
  - 後台兩支 API 未登入都回 401
- [x] 4.2b 後台畫面實測（需要管理員登入，我無法代為輸入密碼）：「排序與季節」頁的開關與灰階列有正確顯示、確認視窗的場次／預約數字正確（藉此驗證 `loadImpact` 的 PostgREST 查詢語法在真實資料庫可用），然後按「取消」；「場次管理」選單出現「萬鷺朝鳳半日・等鳥茶席（未上架）」
- [x] 4.3 派 checker 依 specs 的每個 Scenario 驗收，附 file:line 與測試輸出
- [x] 4.4 `openspec/BACKLOG.md` 新增兩項：`llms.txt` 改成依資料庫產生；`experience-ordering` 既有 PATCH 沒有稽核紀錄的缺口
  - 2026-11-07 已驗證一部分：`GET /api/admin/experience-ordering` 在真實資料庫回傳的場次與預約數，和直接查 SQL 的結果一致（茶藝體驗 1 個開放場次，其餘 0；有效預約全部為 0）。`loadImpact` 的 PostgREST 語法可用。開關與確認視窗由業主操作確認。正式站「場次管理」選單：上架的 5 款在前，「萬鷺朝鳳・茶山導覽（未上架）」「萬鷺朝鳳半日・等鳥茶席（未上架）」在後
- [x] 4.5 部署後在正式站實測一次「下架 → 1 分鐘內中英文列表都消失 → 上架」，結果記進 WORKLOG
  - 2026-11-07 已驗證下架這一半：業主在預覽站刻意下架 `cattle-egret-tour`（預覽站連的是正式資料庫）。`admin_audit_logs` 寫入了 `update_experience_active`／`resource_id = "6"`，約 1 分鐘後正式站 `/experiences` 與 `/en/experiences` 都不再出現它，詳細頁回 404。依業主決定維持下架
  - 19:12 茶山導覽被切回上架（同一個 IP，來源不明），合併部署後正式站列表看得到它
  - 19:29 依業主指示在正式站後台再次下架：20 秒內 `/`、`/en`、`/experiences`、`/en/experiences` 都不再出現它，詳細頁回 404。**但 sitemap.xml 還在**（`Age: 548`、`x-vercel-cache: HIT`），見 4.6
- [x] 4.6 （上線後補）sitemap 不會跟著上下架更新：`revalidatePath("/", "layout")` 清不到 metadata route。上架 API 加清 `/sitemap.xml`，`sitemap.ts` 加 `revalidate = 3600` 當保底；測試改成檢查兩次 revalidate。**合併後要在正式站確認 sitemap 不再出現 `cattle-egret-tour`**（記在 WORKLOG）
