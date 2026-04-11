## Why

後台管理 API 路由完全依賴 middleware 保護，路由層本身無任何身份驗證邏輯，一旦 middleware 設定疏漏或未來新增路由忘記納入保護範圍，攻擊者即可直接存取敏感管理功能。同時圖片上傳無 MIME 驗證、超商回調無簽章驗證、公開 API 無速率限制，這些漏洞合計構成中高風險攻擊面，應在上線狀態下儘快修補。

## What Changes

- **新增 `withAdminAuth` wrapper**：所有 `/api/admin/*` 路由在 handler 入口強制驗證 `admin_session` cookie，不再單靠 middleware
- **圖片上傳加入 MIME 白名單驗證**：`upload-image` 路由驗證 `file.type` 及副檔名，只允許 `jpg`、`jpeg`、`png`、`webp`
- **ECPay 超商回調加入 CheckMacValue 驗證**：`cvs-callback` 路由比對綠界回傳的簽章，拒絕偽造請求
- **公開 API 加入速率限制**：`/api/experiences`、`/api/bookings`、`/api/orders` 等路由套用 IP-based rate limiting，防止 DDoS 與暴力列舉

## Capabilities

### New Capabilities
- `admin-api-auth-guard`: 後台 API 路由層級身份驗證，提供可複用的 `withAdminAuth` higher-order function
- `upload-image-validation`: 圖片上傳的 MIME 類型與副檔名白名單驗證
- `public-api-rate-limiting`: 公開 API 路由的 IP-based 速率限制

### Modified Capabilities
- `cvs-pickup`: 超商地圖回調新增 CheckMacValue 簽章驗證需求

## Impact

- `src/lib/admin-auth-guard.ts`（新增）
- `src/app/api/admin/experience-sessions/route.ts`
- `src/app/api/admin/products/route.ts`
- `src/app/api/admin/products/[id]/route.ts`
- `src/app/api/admin/reviews/[id]/route.ts`
- `src/app/api/admin/experience-bookings/[id]/route.ts`
- `src/app/api/admin/upload-image/route.ts`
- `src/app/api/ecpay/cvs-callback/route.ts`
- `src/app/api/experiences/route.ts`
- `src/app/api/bookings/route.ts`
- `src/app/api/orders/route.ts`
- `src/lib/rate-limit.ts`（已有 contact 用的實作，擴充）
