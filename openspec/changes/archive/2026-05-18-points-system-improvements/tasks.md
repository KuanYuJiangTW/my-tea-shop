## 0. 效能與穩定性修復（已完成）

- [x] 0.1 `getValidBalance()` 改為 DB 層過濾（正向/負向分別查詢 + partial index）
- [x] 0.2 `updateMembershipSpend()` 改用 RPC atomic increment（`increment_annual_spend`）
- [x] 0.3 `getActiveMultiplier()` 首購判斷移至迴圈外（避免 N+1）
- [x] 0.4 建立 `supabase/points_system_rpc.sql`（RPC function + indexes）

## 1. Database Schema — 新增表與欄位

- [x] 1.1 建立 `tier_history` 表（user_id, from_tier, to_tier, reason, triggered_by, admin_id, changed_at）
- [x] 1.2 建立 `campaign_audit_log` 表（campaign_id, changed_fields, old_values, new_values, admin_id, changed_at）
- [x] 1.3 建立 `points_expiry_events` 表（user_id, points_expired, expired_at, created_at）
- [x] 1.4 修改 `point_transactions` 表：type 加入 'adjustment'、新增 admin_id 和 admin_note 欄位、新增 is_flagged 布林欄位
- [x] 1.5 修改 `point_transactions` 表：新增 notification_sent_7d 和 notification_sent_3d 布林欄位
- [x] 1.6 撰寫完整 SQL migration 腳本（合併以上）

## 2. 點數到期通知

- [x] 2.1 建立 email 模板：點數到期提醒（7 天版 + 3 天版）
- [x] 2.2 建立 `api/cron/points-expiry-notify/route.ts`：查詢即將到期點數 + 發送 email
- [x] 2.3 7 天通知邏輯：查詢 expires_at 在 7 天內且 notification_sent_7d = false 的正值記錄
- [x] 2.4 3 天通知邏輯：同上但 3 天 + notification_sent_3d
- [x] 2.5 發送後標記已通知（update notification_sent_7d/3d = true）
- [x] 2.6 加入 vercel.json cron schedule（每日 UTC 01:00）

## 3. 升等通知與保級預警

- [x] 3.1 修改 `checkAndUpgradeTier()`：升等時寫入 `tier_history` 記錄
- [x] 3.2 升等時發送 email 通知（新等級、新回饋率、新折抵上限）
- [x] 3.3 修改 `AccountClient.tsx`：偵測近期升等事件，顯示「恭喜升等」banner
- [x] 3.4 修改 `AccountClient.tsx`：11-12 月顯示保級預警（距離保級差額）
- [x] 3.5 修改結帳頁：點數輸入區顯示「您為 XX 會員，本次最高可折抵 NT$YY」
- [x] 3.6 修��年度重置 Cron：降等時也寫入 `tier_history`（reason='annual_reset'）

## 4. 點數負債報表

- [x] 4.1 建立 `api/cron/points-expiry-sweep/route.ts`：掃描已過期點數，寫入 `points_expiry_events`
- [x] 4.2 儀表板新增「未兌現點數負債」即時計算（有效正值點數總和）
- [x] 4.3 儀表板新增「本月過期沖銷」金額（本月 points_expiry_events 加總）
- [x] 4.4 加入 vercel.json cron schedule（每日 UTC 02:00）
- [x] 4.5 確認 earnBase = subtotal 的邏輯在所有發放路徑一致

## 5. 通用碼 Rate Limit

- [x] 5.1 修改 `api/user/validate-coupon/route.ts`：加入 per-IP rate limit（10 次/分鐘）
- [x] 5.2 修改所有 checkout routes 的通用碼驗證段：加入 rate limit check
- [x] 5.3 前端處理 429 回應：顯示「操作太頻繁，請稍後再試」

## 6. 點數異常監測

- [x] 6.1 修改 `issuePoints()`：multiplier > 5 時設 is_flagged = true
- [x] 6.2 建立 `api/cron/points-anomaly-scan/route.ts`：掃描當日超額折抵 + flagged 記錄
- [x] 6.3 超額定義：同一 user_id 當日 redeem 總和 > 500
- [x] 6.4 發現異常時發送摘要 email 給管���員
- [x] 6.5 加入 vercel.json cron schedule（每日 UTC 03:00）

## 7. 後台手動調整點數

- [x] 7.1 建立 `api/admin/points-adjustment/route.ts`：POST（加/扣點數 + admin_note + admin_id）
- [x] 7.2 驗證：必填 admin_note、扣點不可使餘額為負
- [x] 7.3 建立 `admin/(protected)/members/[id]/points/page.tsx`：調整介面 + 歷史列表
- [x] 7.4 建立點數明細 CSV 匯出 API `api/admin/points-export/route.ts`

## 8. Campaign Audit Log

- [x] 8.1 修改 `api/admin/campaigns/[id]/route.ts` PATCH：寫入 `campaign_audit_log`
- [x] 8.2 修改 DELETE（停用）：寫入 audit log
- [x] 8.3 建立 `api/admin/campaigns/[id]/history/route.ts`：GET 變更歷史
- [x] 8.4 活動詳情頁顯示變更歷史 timeline

## 9. 等級歷史

- [x] 9.1 修改所有升/降等路徑：寫入 `tier_history`
- [x] 9.2 建立 `api/admin/members/[id]/tier-history/route.ts`：GET
- [x] 9.3 帳戶頁顯示簡易等級歷史（最近 5 筆）
- [x] 9.4 後台會員詳情頁顯示完整等級歷史

## 10. 年度重置效能改善

- [x] 10.1 改為 RPC 批次 update annual_spend（一次 UPDATE 全表）
- [x] 10.2 降等判斷改為 batch select + batch update（減少逐筆 round trip）

## 11. UX 微調

- [x] 11.1 通用碼套用成功 toast 動畫
- [x] 11.2 點數到期提醒加上具體日期（「X 月 X 日到期」）
- [x] 11.3 結帳頁點數折抵成功後顯示折抵金額 highlight 動畫

## 12. 測試

- [x] 12.1 unit test：到期通知篩選邏輯
- [x] 12.2 unit test：異常監測閾值判斷
- [x] 12.3 unit test：手動調整點數驗證
- [x] 12.4 integration test：rate limit 觸發 429
- [x] 12.5 integration test：campaign audit log 寫入正確
- [x] 12.6 integration test：tier_history 記錄升/降等
