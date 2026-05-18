## 0. 共用 Test Helper

- [x] 0.1 建立 `src/__tests__/points/helpers/supabase-mock.ts`：`createChainMock(data, error)` 函式
- [x] 0.2 新增 `createTableRouter(config)` — 根據 `.from()` table name 自動路由到對應 mock
- [x] 0.3 新增 `createCronRequest(secret?)` — 產生帶/不帶 authorization header 的 NextRequest
- [x] 0.4 確認 helper 與現有測試共存（跑全部 vitest 通過）

## 1. Cron Route Tests — points-expiry-notify

- [x] 1.1 建立 `src/__tests__/points/cron-expiry-notify.test.ts`
- [x] 1.2 測試：無授權 header → 401
- [x] 1.3 測試：正確授權但無到期點數 → 200 + 不發 email
- [x] 1.4 測試：7 天內到期 → 按 user 聚合、發 email、更新 notification_sent_7d
- [x] 1.5 測試：3 天內到期 → 同上但 notification_sent_3d
- [x] 1.6 測試：同用戶多筆到期正確聚合金額

## 2. Cron Route Tests — points-expiry-sweep

- [x] 2.1 建立 `src/__tests__/points/cron-expiry-sweep.test.ts`
- [x] 2.2 測試：無授權 → 401
- [x] 2.3 測試：無過期點數 → `{ ok: true, swept: 0 }`
- [x] 2.4 測試：掃描過期點數 → 寫入 points_expiry_events + 標記 swept_at
- [x] 2.5 測試：DB 查詢錯誤 → 500

## 3. Cron Route Tests — points-anomaly-scan

- [x] 3.1 建立 `src/__tests__/points/cron-anomaly-scan.test.ts`
- [x] 3.2 測試：無異常 → `{ ok: true, anomalies: 0 }` + 不發 email
- [x] 3.3 測試：有 flagged 記錄 → 發 email，flaggedCount > 0
- [x] 3.4 測試：超額折抵（> 500）→ excessiveRedeemCount > 0
- [x] 3.5 測試：剛好 500 不算超額
- [x] 3.6 測試：同時有 flagged + 超額 → email 包含兩類摘要

## 4. Cron Route Tests — reset-annual-spend

- [x] 4.1 建立 `src/__tests__/points/cron-annual-reset.test.ts`
- [x] 4.2 測試：無授權 → 401
- [x] 4.3 測試：RPC 成功路徑 → mode: "rpc" + tier_history 寫入
- [x] 4.4 測試：RPC 失敗 fallback → 逐筆處理 + tier_history 寫入
- [x] 4.5 測試：降等正確判斷（spend 低於門檻）
- [x] 4.6 測試：未降等不寫 tier_history

## 5. Admin API Tests — points-adjustment

- [x] 5.1 建立 `src/__tests__/points/admin-adjustment.test.ts`
- [x] 5.2 測試：缺少必要欄位 → 400
- [x] 5.3 測試：未填 adminNote → 400
- [x] 5.4 測試：points = 0 → 400
- [x] 5.5 測試：扣點超過餘額 → 400 + 顯示目前餘額
- [x] 5.6 測試：加點成功 → type = "adjustment", expires_at 有值
- [x] 5.7 測試：扣點成功 → type = "adjustment", expires_at = null

## 6. Admin API Tests — points-export

- [x] 6.1 建立 `src/__tests__/points/admin-export.test.ts`
- [x] 6.2 測試：無 userId 參數匯出全部 → CSV 格式 + BOM
- [x] 6.3 測試：帶 userId 參數 → 查詢包含 eq("user_id")
- [x] 6.4 測試：CSV header 包含所有欄位
- [x] 6.5 測試：DB 錯誤 → 500

## 7. Admin API Tests — campaigns audit log

- [x] 7.1 建立 `src/__tests__/points/admin-campaigns-audit.test.ts`
- [x] 7.2 測試：GET history → 回傳 audit log 陣列
- [x] 7.3 測試：PATCH 修改 → 寫入 audit log（action=update, changed_fields, old/new values）
- [x] 7.4 測試：DELETE 停用 → 寫入 audit log（action=deactivate）
- [x] 7.5 測試：無歷史 → 回傳空陣列

## 8. 核心 Points 模組補強

- [x] 8.1 建立 `src/__tests__/points/core-extended.test.ts`
- [x] 8.2 測試：issuePoints multiplier > 5 → is_flagged = true
- [x] 8.3 測試：issuePoints multiplier <= 5 → is_flagged = false
- [x] 8.4 測試：deductPoints(0) 不寫入
- [x] 8.5 測試：deductPoints 正常扣點 → 負值 + type=redeem
- [x] 8.6 測試：refundPoints(0) 不寫入
- [x] 8.7 測試：refundPoints 正常退還 → 正值 + type=refund
- [x] 8.8 測試：calculateEarning 無活動 → 倍率 1x
- [x] 8.9 測試：calculateEarning 多個 global → 取最高
- [x] 8.10 測試：calculateEarning first_purchase 對首購生效
- [x] 8.11 測試：calculateEarning first_purchase 對非首購不生效
- [x] 8.12 測試：getValidBalance 正值+負值=正確餘額
- [x] 8.13 測試：getValidBalance 全過期=0
- [x] 8.14 測試：getValidBalance 無交易=0

## 9. Rate Limit Integration Tests

- [x] 9.1 新增 rate limit 相關測試至 `src/__tests__/points/rate-limit-integration.test.ts`
- [x] 9.2 測試：validate-coupon 超過 10 次 → 429
- [x] 9.3 測試：不同 IP 互不影響
- [x] 9.4 測試：stripe checkout rate limit → 429
- [x] 9.5 測試：ecpay checkout rate limit → 429

## 10. 最終驗證

- [x] 10.1 跑全部 vitest，確認所有測試通過（新增 + 既有）
- [x] 10.2 確認 TypeScript 無型別錯誤
- [x] 10.3 統計最終測試數量
