## Why

會員點數系統（points-system-improvements）已完成 58 項任務的實作，涵蓋點數發放/折抵/退還、升降等、Cron 排程、後台管理、Rate Limit、異常監測等功能。目前僅有基礎 unit test（`points.test.ts` 27 個）、淺層 integration test（`points-integration.test.ts` 31 個）、以及新增的改善測試（`points-improvements.test.ts` 20 個），總計 78 個測試。

**不足之處：**
- Cron routes（expiry-notify、expiry-sweep、anomaly-scan、reset-annual-spend）完全沒有 route-level 測試
- Admin API routes（points-adjustment、points-export、campaigns audit log）沒有 route-level 測試
- `issuePoints` 的 `is_flagged` 寫入邏輯無針對性測試
- Rate limit 在 checkout routes（stripe/ecpay）的整合未測試
- 升降等 + tier_history 寫入的完整流程未端對端驗證
- 年度重置 RPC fallback 邏輯無測試
- 前端元件（AccountClient 保級預警、CheckoutClient tier hint）無 render 測試

需要補足自動化測試以確保回歸安全與業務邏輯正確性。

## What Changes

- 新增 Cron route unit tests：測試 4 個 cron endpoint 的授權驗證、查詢邏輯、寫入行為
- 新增 Admin API unit tests：測試 points-adjustment 驗證邏輯、points-export CSV 產出、campaign audit log 寫入
- 強化 points 核心 unit tests：補測 `issuePoints` flagging、`deductPoints`/`refundPoints` 邊界、`calculateEarning` 活動倍率組合
- 新增 rate limit integration tests：測試 stripe/ecpay checkout 的 429 回應
- 新增升降等 integration tests：完整測試 `updateMembershipSpend` → `checkAndUpgradeTier` → `tier_history` 流程
- 新增年度重置 tests：測試 RPC 成功路徑 + fallback 路徑 + tier_history 降等寫入
- 建立共用 test helper：統一 Supabase mock 工廠，減少各測試檔的重複 mock 程式碼

## Capabilities

### New Capabilities
- `points-cron-tests`: 4 個 Cron route 的 unit tests（auth、查詢、寫入、錯誤處理）
- `points-admin-api-tests`: Admin API endpoints 的 unit tests（adjustment 驗證、export CSV、audit log）
- `points-core-unit-tests`: 核心 points 模組的補強 unit tests（flagging、邊界值、活動倍率組合）
- `points-integration-tests`: Rate limit、升降等流程、年度重置的 integration tests
- `points-test-helpers`: 共用 mock 工廠與 test utilities

### Modified Capabilities

（無既有 spec 需修改，此 change 純新增測試）

## Impact

- **新增檔案**：~6 個測試檔 + 1 個共用 helper
  - `src/__tests__/points/cron-expiry-notify.test.ts`
  - `src/__tests__/points/cron-expiry-sweep.test.ts`
  - `src/__tests__/points/cron-anomaly-scan.test.ts`
  - `src/__tests__/points/cron-annual-reset.test.ts`
  - `src/__tests__/points/admin-api.test.ts`
  - `src/__tests__/points/core-extended.test.ts`
  - `src/__tests__/helpers/supabase-mock.ts`
- **修改檔案**：可能微調 `vitest.config.ts` 配置
- **依賴**：僅使用現有的 vitest + vi.mock，不新增套件
- **風險**：純測試程式碼，不影響 production code
