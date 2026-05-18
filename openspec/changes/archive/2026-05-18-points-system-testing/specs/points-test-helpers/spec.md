## ADDED Requirements

### Requirement: 共用 Supabase mock 工廠
系統 SHALL 提供 `src/__tests__/points/helpers/supabase-mock.ts` 作為共用 test helper。

#### Scenario: createChainMock 產生完整 query chain
- **WHEN** 呼叫 `createChainMock({ data: [...], error: null })`
- **THEN** 回傳物件支援 `.select().eq().gt().lt().gte().lte().or().order().limit().single().in().is()` 全部 chain 方法

#### Scenario: createTableRouter 根據 table name 自動路由
- **WHEN** 設定 `createTableRouter({ point_transactions: mockData1, user_membership: mockData2 })`
- **THEN** `supabase.from("point_transactions")` 回傳 mockData1 的 chain，`supabase.from("user_membership")` 回傳 mockData2 的 chain

#### Scenario: createCronRequest 產生授權 request
- **WHEN** 呼叫 `createCronRequest("my-secret")`
- **THEN** 產生 NextRequest 物件，headers 包含 `authorization: Bearer my-secret`

#### Scenario: createCronRequest 無參數產生未授權 request
- **WHEN** 呼叫 `createCronRequest()`
- **THEN** 產生 NextRequest 物件，不帶 authorization header

### Requirement: helper 向下相容
helper 不 SHALL 破壞現有測試檔。現有 `points.test.ts`、`points-integration.test.ts`、`points-improvements.test.ts` 仍使用各自的 mock，不強制遷移。

#### Scenario: 新測試檔使用 helper 而舊檔不受影響
- **WHEN** 新測試檔 import helper，舊測試檔不 import
- **THEN** 全部測試 suite 正常通過
