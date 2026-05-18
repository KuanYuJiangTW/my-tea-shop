## 1. Database Schema & Migration Scripts

- [x] 1.1 建立 `member_tiers` 表並 seed 三個等級（standard/silver/gold）
- [x] 1.2 建立 `user_membership` 表（user_id, tier_id, annual_spend, annual_reset_at, tier_upgraded_at）
- [x] 1.3 建立 `points_campaigns` 表（完整 schema 含 campaign_type, multiplier, target 欄位）
- [x] 1.4 修改 `orders` 表：新增 coupon_discount, points_discount, subtotal 欄位（INTEGER DEFAULT 0）
- [x] 1.5 新增 `orders` 表 CHECK constraint：total_amount = GREATEST(subtotal + shipping_fee - coupon_discount - points_discount, 0)
- [x] 1.6 修改 `point_transactions` 表：新增 multiplier 欄位（NUMERIC DEFAULT 1.0）、type 加入 'refund'、新增 expires_at 欄位
- [x] 1.7 建立 `coupon_templates` 表（通用碼用：id, code, discount_amount, min_order_amount, max_uses, max_uses_per_user, expires_at, is_active）
- [x] 1.8 建立 `coupon_usages` 表（記錄通用碼使用：template_id, user_id, order_id, used_at）
- [x] 1.9 共用函式 `updateMembershipSpend`（累計年消費 + 自動升等）— 改為 application-level
- [x] 1.10 修改 `experience_bookings` 表：新增 coupon_discount 欄位（INTEGER DEFAULT 0），為未來體驗折價券支援預留
- [x] 1.11 撰寫完整 SQL migration 腳本（合併以上所有 DDL）

## 2. Data Migration

- [x] 2.1 撰寫遷移腳本：舊 point_transactions.points ÷ 100 轉換（含 dry-run 模式）
- [x] 2.2 撰寫遷移腳本：backfill orders 的 coupon_discount 和 points_discount 欄位
- [x] 2.3 撰寫遷移腳本：為現有用戶建立 user_membership 記錄（依歷史消費計算等級）
- [x] 2.4 確保遷移腳本具有冪等性（重跑不會破壞資料）
- [ ] 2.5 在 staging 環境執行遷移並驗證結果

## 3. Backend API — Points Earning (產品 + 體驗統一)

- [x] 3.1 修改 `api/admin/orders/[id]/route.ts`：發放點數改為 `earnBase × tier.points_rate × multiplier`
- [x] 3.2 修改 `api/admin/experience-bookings/[id]/route.ts`：發放點數改為共用 `issuePoints`
- [x] 3.3 修改 `api/cron/complete-bookings/route.ts`：發放邏輯與 3.2 統一（修正 ÷10 bug）
- [x] 3.4 抽取共用函式 `src/lib/points.ts` → `issuePoints()` 避免邏輯分歧
- [x] 3.5 實作活動倍率查詢邏輯（查詢當前適用 campaigns，取最高倍率）
- [x] 3.6 實作首購判斷邏輯（該用戶是否有過 earn 記錄）
- [x] 3.7 `updateMembershipSpend()` 更新年消費並觸發升等（產品 + 體驗都有）
- [x] 3.8 發放點數時記錄 multiplier 欄位 + expires_at（12 個月）

## 4. Backend API — Points Redemption (產品 + 體驗統一)

- [x] 4.1 修改 `api/ecpay/checkout/route.ts`：折抵邏輯改為 1:1、自選金額、查詢用戶 tier 取 max_discount_rate
- [x] 4.2 修改 `api/ecpay/experience-checkout/route.ts`：折抵邏輯同步改為 1:1 + 等級上限
- [x] 4.3 驗證最低 10 點、最高依等級上限、餘額充足 → 共用 `validateRedemption()`
- [x] 4.4 修改訂單寫入：分別存 coupon_discount 和 points_discount
- [x] 4.5 修改 `api/user/points/route.ts`：回傳 tier 資訊、有效餘額（排除過期點數）
- [x] 4.6 修改產品訂單取消邏輯：退還已扣點數（type='refund'）+ 恢復折價券
- [x] 4.7 修正體驗預約取消 `bookings/[id]/cancel/route.ts`：type='refund'
- [x] 4.8 修正體驗預約後台取消 `admin/experience-bookings/[id]/cancel/route.ts`：type='refund'
- [x] 4.9 修改 `api/stripe/checkout/route.ts`：同步改為新制
- [x] 4.10 修改 `api/paypal/create-order/route.ts`：同步改為新制（含 rollback refundPoints）

## 5. Backend API — Points Campaigns CRUD

- [x] 5.1 建立 `api/admin/campaigns/route.ts`：GET（列表 + 篩選）、POST（新增，含 multiplier ≤ 10 驗證）
- [x] 5.2 建立 `api/admin/campaigns/[id]/route.ts`：PATCH（編輯，禁止編輯已結束活動）、DELETE（停用 soft delete）
- [x] 5.3 加入 admin auth guard 保護（由 admin layout middleware 統一保護）

## 6. Backend API — Coupon Management CRUD

- [x] 6.1 建立 `api/admin/coupons/route.ts`：GET（列表含使用率統計）、POST（新增批次券/通用碼）
- [x] 6.2 建立 `api/admin/coupons/[id]/route.ts`：PATCH（編輯未過期券）、DELETE（停用）
- [x] 6.3 修改結帳流程支援通用碼兌換：驗證 code 存在、未過期、次數未滿、用戶未超限
- [x] 6.4 通用碼使用後寫入 `coupon_usages` 記錄
- [x] 6.5 加入 admin auth guard 保護（由 admin layout middleware 統一保護）

## 7. Frontend — Checkout Points UI

- [x] 7.1 修改 `CheckoutClient.tsx`：移除舊 checkbox，改為數字輸入框（min/max + 全部使用按鈕）
- [x] 7.2 前端即時計算：依用戶等級顯示最低/最高範圍、餘額、即時折抵金額
- [x] 7.3 整合通用碼輸入：除了原有的批次券下拉，支援手動輸入通用碼驗證
- [x] 7.4 顯示折扣摘要：分別顯示折價券折扣和點數折抵金額
- [x] 7.5 修改 BookingFlow 體驗預約點數 UI：同步改為 1:1 + 等級上限 + 數字輸入

## 8. Frontend — Admin Campaign Management Page

- [x] 8.1 建立 `admin/(protected)/campaigns/page.tsx`：活動列表 + 狀態 badge
- [x] 8.2 建立活動新增/編輯表單（名稱、倍率、類型、時間、適用範圍）
- [x] 8.3 建立停用確認 dialog（inline 停用按鈕）
- [x] 8.4 在 AdminSidebar 加入「行銷管理」群組（點數活動 + 折價券）

## 9. Frontend — Admin Coupon Management Page

- [x] 9.1 建立 `admin/(protected)/coupons/page.tsx`：分頁顯示批次券和通用碼
- [x] 9.2 建立折價券新增表單（批次：選擇發放對象；通用：設定碼和次數限制）
- [x] 9.3 顯示使用率統計（發放數、已使用、使用率 %）
- [x] 9.4 建立編輯/停用功能

## 10. Frontend — Dashboard Financials

- [x] 10.1 修改 `dashboard/page.tsx` 產品營收查詢：從 `payment_status='paid'` 改為 `order_status='completed'`
- [x] 10.2 修改 `dashboard/page.tsx` 體驗營收查詢：從 `status='confirmed'` 改為 `status='completed'`
- [x] 10.3 修改 RevenueChart 的 6 個月圖表資料：體驗也改用 completed + created_at 篩選
- [x] 10.4 新增查詢：本月折價券消耗、點數消耗、未兌現點數總額、本月點數發放
- [x] 10.5 新增行銷成本卡片 UI（折價券消耗 / 點數消耗 / 本月發放 / 未兌現點數）
- [x] 10.6 新增「本月現金流」卡片（產品 paid + 體驗 confirmed/completed）
- [x] 10.7 修改 RevenueChart：加入折扣消耗趨勢線

## 11. Frontend — Account Page (Member Tier Display)

- [x] 11.1 修改 `AccountClient.tsx`：顯示會員等級名稱、回饋率 badge
- [x] 11.2 點數餘額改為顯示 "NT$XX 可折抵"（取代原本的點數數字）
- [x] 11.3 年消費進度條（當前消費 → 下一等級門檻）
- [x] 11.4 帳戶頁顯示「30 天內到期點數」提醒

## 12. Unit Tests

- [x] 12.1 測試金額恆等式：subtotal + shipping - coupon - points = total（多種組合）
- [x] 12.2 測試點數發放計算：各等級 × 各倍率的排列組合
- [x] 12.3 測試折抵驗證：最低 10 點、各等級上限、餘額不足
- [x] 12.4 測試等級升等邏輯：累計達門檻自動升、不降等
- [x] 12.5 測試活動倍率選擇：多活動取最高、過期活動不適用
- [x] 12.6 測試通用碼驗證：次數上限、每人限用、過期
- [x] 12.7 測試 getValidBalance：排除已過期、計入 refund

## 13. API Integration Tests

- [x] 13.1 測試產品結帳流程：含折價券 + 點��折抵 + 正確寫入各欄位
- [x] 13.2 測試體驗預約結帳流程：點數折抵 1:1 + 等級上限 + 正確寫入
- [x] 13.3 測試產品訂單完成流程：正確發放點數 + 更新年消費 + 升等
- [x] 13.4 測試體驗預約完成流程（Admin + Cron）��發放���輯一致、multiplier 正���
- [x] 13.5 測試產品��單取消流程：點數退還（type=refund）+ 折價券恢復 + 營收不計入
- [x] 13.6 測試體驗預約取消流���：依退款比例退還點數（type=refund）、不計入營收
- [x] 13.7 測試 campaigns CRUD API：新增/編輯/停用/列表篩選
- [x] 13.8 測試 coupons CRUD API：批次��放/通用碼兌換/使���率統計
- [x] 13.9 測試儀表板數據一致性：產品（completed）+ 體驗（completed）加總 vs 逐筆驗算
- [x] 13.10 測試體驗 Cron 與 Admin 手動完成的點數發放結果一致

## 14. E2E Tests (Playwright)

- [x] 14.1 產品結帳流程 E2E：登入 → 加入商品 → 調整點數折抵 → 完成結帳 → 驗證金額
- [x] 14.2 體驗預約結帳 E2E：登入 → 預約體驗 → 點數折抵 → 付款 → 驗證金額
- [x] 14.3 後台活動管理 E2E：登入後台 → 新增活動 → 編輯 → 停用
- [x] 14.4 後台折價券管理 E2E：新增通用碼 → 前台兌換 → 確認使用率更新
- [x] 14.5 儀表板數據 E2E：建立訂單 → 標記完成 → 驗證儀表板數字正確

## 15. Manual Verification (Staging)

- [ ] 15.1 執行遷移腳本，確認舊資料正確轉換（產品訂單 + 體驗預約 + 點數）
- [ ] 15.2 使用綠界測試環境下單（產品），確認實際扣款金額與顯示一致
- [ ] 15.3 使用綠界測試環境預約（體驗），確認含點數折抵的扣款金額正確
- [ ] 15.4 確認 PayPal/Stripe sandbox 金額正確
- [ ] 15.5 後台 UI 視覺和 RWD 檢查
- [ ] 15.6 確認儀表板「確認營收」= 所有 completed 訂單 total_amount 加總
- [ ] 15.7 確認儀表板「確認營收」= 所有 completed 體驗 total_price 加總
- [ ] 15.8 確認「收款金額」-「確認營收」= 「待履約」金額
- [ ] 15.9 確認體驗 Cron 與 Admin 手動完成發放的點數一致

## 16. 年度消費重置 Cron

- [x] 16.1 建立 `api/cron/reset-annual-spend/route.ts`（每年 1/1 重置 annual_spend）
- [x] 16.2 重置後依新年消費重新計算等級（未達標才降等）
- [x] 16.3 設定 Vercel Cron schedule（0 0 1 1 *）
