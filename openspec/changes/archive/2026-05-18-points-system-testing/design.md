## Context

會員點數系統已完成實作（58 tasks），目前有 3 個測試檔共 78 個測試。測試框架為 Vitest，使用 `vi.mock` 搭配 `vi.hoisted` 模式 mock Supabase client。現有測試主要覆蓋 `points.ts` 核心函式和部分 checkout business logic，但 cron routes、admin API routes、以及跨模組整合流程缺乏測試。

現有 mock 模式存在重複程式碼問題：每個測試檔都獨立建立相似的 Supabase chain mock（`.select().eq().gt().or()` 等），維護成本高。

## Goals / Non-Goals

**Goals:**
- 為 4 個 Cron route 建立完整 unit tests（auth、正常執行、錯誤處理）
- 為 Admin API routes 建立 unit tests（input 驗證、成功/失敗路徑）
- 補強 points 核心模組的邊界與組合測試
- 建立共用 Supabase mock helper，統一 mock 建立方式
- 目標：新增 ~80-100 個測試，達到 points 系統 ~170+ 測試覆蓋

**Non-Goals:**
- 不寫 E2E / browser 測試（Playwright specs 已存在但暫不執行）
- 不測試前端 React 元件 render（需 testing-library，不在此 scope）
- 不修改 production code（純測試程式碼）
- 不追求 100% coverage，聚焦業務關鍵路徑

## Decisions

### 1. 測試檔案結構：以功能模組分目錄

```
src/__tests__/points/
  helpers/
    supabase-mock.ts        # 共用 mock 工廠
  cron-expiry-notify.test.ts
  cron-expiry-sweep.test.ts
  cron-anomaly-scan.test.ts
  cron-annual-reset.test.ts
  admin-adjustment.test.ts
  admin-export.test.ts
  admin-campaigns-audit.test.ts
  core-extended.test.ts
  rate-limit-integration.test.ts
```

**理由**：與現有 `__tests__/paypal/` 目錄結構一致，按功能模組分群更容易定位和維護。

### 2. Mock 策略：共用 helper + route-level 測試

建立 `supabase-mock.ts` 提供：
- `createChainMock(data, error)` — 產生完整的 Supabase query chain
- `createTableRouter(config)` — 根據 `.from()` 參數自動路由到對應 mock
- `createCronRequest(secret)` — 產生帶 authorization header 的 NextRequest

**理由**：現有 3 個測試檔都各自建立類似的 chain mock，共用後可減少 ~60% mock 樣板碼。

### 3. Cron route 測試方式：直接 import handler + mock dependencies

直接 import route 的 GET handler，mock `@/lib/supabase` 和 `@/lib/email`，驗證：
- 無授權 → 401
- 正常資料 → 正確的 DB 操作 + 正確 response
- DB 錯誤 → 500
- 空資料 → 早期返回

**理由**：Next.js route handler 是普通 async function，可直接 import 呼叫，不需啟動 server。

### 4. 不新增套件

僅使用 vitest + 現有 vi.mock。不引入 `@testing-library/react`、`msw` 或其他測試框架。

**理由**：保持依賴輕量，現有 mock 模式已足夠覆蓋 API 層測試。

## Risks / Trade-offs

- **Mock 與實際行為偏離風險** → 測試命名清楚標示假設，mock 設定盡量貼近 Supabase 實際回傳格式
- **Cron route 直接 import 可能觸發副作用** → 用 `vi.mock` 在 import 前攔截所有外部依賴
- **共用 helper 過度抽象** → 保持 helper API 簡單（最多 3-4 個 export），複雜 case 仍在測試檔內自訂
