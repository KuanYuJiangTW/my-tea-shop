## 1. 預約入口補檢查（高風險區：先做、先測）

- [ ] 1.1 先寫回歸測試 `src/__tests__/bookings/inactive-experience.test.ts`（照 `admin-ordering-api.test.ts` 的 supabase mock 寫法）：上架中可預約、下架回 409「此體驗目前未開放預約」、join 為 null 回 409 而非 500，且三種情況下都不會呼叫 insert
- [ ] 1.2 `src/app/api/bookings/route.ts`：在 `session.status !== "open"` 之後、名額檢查之前加 `if (!expType?.is_active)` → 409（design D4）
- [ ] 1.3 對 1.2 跑 `reverse-verify`：暫時拿掉檢查，確認 1.1 會紅，再改回來
- [ ] 1.4 `src/app/experiences/booking/[sessionId]/page.tsx`：體驗已下架時 `redirect("/experiences?error=unavailable")`
- [ ] 1.5 `src/app/api/experience-interest/route.ts`：寫入前查 `experience_types` 的 `is_active`，下架或不存在 → 400「此體驗目前未開放」；在 `interest-api.test.ts` 補上對應案例（不寫入、不寄信）
- [ ] 1.6 確認付款與候補路徑**沒有**被加上 is_active 檢查（`ecpay/experience-checkout`、`waitlist/[id]/confirm`；體驗付款只有 ECPay 一條路，PayPal 沒有體驗付款路由），並在測試註解說明這是刻意的（design D5）
- [ ] 1.7 `/experiences` 列表頁讀 `?error=unavailable`，顯示一行提示「這個體驗目前沒有開放預約」（中英文字串放 `messages/`）。目前這個參數沒有任何頁面處理，既有的 cancelled 導向也一樣，被導回來的客人看不到任何說明

## 2. 後台 API

- [ ] 2.1 新增 `src/app/api/admin/experience-types/[id]/route.ts` 的 PATCH，用 `withAdminAuth(..., "update_experience_active")` 包起來；body 只接受 `{ is_active: boolean }`，其餘回 400；id 不存在回 404
- [ ] 2.2 更新成功後呼叫 `revalidatePath("/", "layout")`；失敗時回 500 且不清快取（design D3）
- [ ] 2.3 測試 `src/__tests__/experiences/admin-experience-active.test.ts`：400（型別錯、多帶欄位）、404、200 時有呼叫 revalidatePath、500 時沒有呼叫；並確認 `route-auth-coverage.test.ts` 會自動涵蓋新路由
- [ ] 2.4 決定 design 的 Open Question：由 `GET /api/admin/experience-ordering` 一併回傳每款體驗的「未來 open 場次數」與「有效預約數」（偏好），或另開 GET；寫進 design.md 的決策

## 3. 後台畫面

- [ ] 3.1 `OrderingClient.tsx`：每列加上上架／下架開關（沿用 `BundlesClient.tsx` 的綠色滑動開關樣式），下架的列變灰並標「前台不顯示」
- [ ] 3.2 確認視窗：下架時顯示未來場次數、有效預約數，以及「這些不會被取消」；上架時顯示「客人會立刻看得到並可以預約」（design D7）
- [ ] 3.3 開關旁加一行提醒：「`llms.txt` 不會自動更新，下架後請告訴工程師」
- [ ] 3.4 `sessions/page.tsx`：體驗選單改列全部體驗，下架的附「（未上架）」（design D6）
- [ ] 3.5 對照 `docs/design-system.md` 檢查開關與灰階列的對比；用 `contrast-audit` 量測灰階列文字是否符合 AA

## 4. 驗證與收尾

- [ ] 4.1 `/verify` 全綠（測試＋型別＋lint 0 error＋build）
- [ ] 4.2 本機 dev server 實測：下架一款**沒有預約、也不是 `egret-half-day`** 的體驗 → 列表、詳細頁（404）、sitemap 中英文都消失 → 用舊的預約頁網址打開會被導走 → 切回上架。全程不動 `egret-half-day`（刻意下架，見 design 風險）
- [ ] 4.3 派 checker 依 specs 的每個 Scenario 驗收，附 file:line 與測試輸出
- [ ] 4.4 `openspec/BACKLOG.md` 新增兩項：`llms.txt` 改成依資料庫產生；`experience-ordering` 既有 PATCH 沒有稽核紀錄的缺口
- [ ] 4.5 部署後在正式站實測一次「下架 → 1 分鐘內中英文列表都消失 → 上架」，結果記進 WORKLOG
