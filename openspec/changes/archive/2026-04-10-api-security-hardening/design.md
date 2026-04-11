## Context

目前所有 `/api/admin/*` 路由的身份驗證完全由 `src/proxy.ts`（Next.js middleware）把關。middleware 驗證 `admin_session` cookie 後放行，但路由 handler 本身沒有任何驗證邏輯。這在「防禦深度」原則上是不足的，且未來新增路由時容易遺漏 middleware 保護範圍。

圖片上傳、超商回調、公開 API 三個問題各自獨立，但都屬於「輸入信任邊界未設防」的同一類問題。

現有基礎設施：
- `src/lib/admin-token.ts`：`computeAdminToken()` 使用 HMAC-SHA256 計算 token
- `src/proxy.ts`：已有 `timingSafeEqual` 比對 cookie
- `src/app/api/contact/route.ts`：已有 in-memory rate limiting 實作可參考
- `src/lib/ecpay.ts`：已有 `computeCheckMacValue()` 可用於 cvs-callback 驗證

## Goals / Non-Goals

**Goals:**
- 每個 admin API 路由 handler 自行驗證身份，不依賴單一 middleware
- 圖片上傳僅接受 `image/jpeg`、`image/png`、`image/webp`
- cvs-callback 驗證 ECPay 回傳的 CheckMacValue
- 公開 API 套用每 IP 速率限制，防止濫用

**Non-Goals:**
- 不實作 2FA（範圍太大，列為獨立 change）
- 不改用分散式 Redis rate limiting（Vercel KV 需額外費用，現有 in-memory 方案先補齊覆蓋面）
- 不改動 middleware（保留雙層保護）
- 不實作 audit log

## Decisions

### 1. `withAdminAuth` Higher-Order Function

**決定**：建立 `src/lib/admin-auth-guard.ts`，export `withAdminAuth(handler)` wrapper。

**理由**：
- 比「每個路由 copy-paste 驗證邏輯」更易維護
- 比「在 layout 做 Server Component 驗證」更完整（API 路由不過 layout）
- 採用與 proxy.ts 相同的 `computeAdminToken` + `timingSafeEqual`，行為一致

**替代方案考慮**：在每個路由直接 inline 驗證 → 重複程式碼，未來修改需到處改，排除。

### 2. MIME 驗證策略

**決定**：同時驗證 `file.type`（Content-Type）和副檔名白名單，不驗證檔案 magic bytes。

**理由**：
- magic bytes 驗證需要額外 npm 套件（如 `file-type`），增加依賴
- Supabase Storage 在 bucket 層面有額外保護
- 攻擊者若能上傳到 Supabase Storage，最終仍受 Storage 的 CDN 保護，無法執行
- 雙重驗證（MIME + 副檔名）已大幅降低風險，符合「不過度工程化」原則

### 3. 公開 API Rate Limiting

**決定**：複用現有 `src/app/api/contact/route.ts` 的 in-memory 實作，抽成共用函數。

**理由**：
- 已有可運作的實作，不重複發明
- Vercel Serverless 多實例問題：免費方案下單一 region 通常只有少量實例，影響有限
- 限制設定：GET 類（experiences）100 req/min，POST 類（bookings、orders）20 req/min

**替代方案**：Vercel KV（Redis）→ 需付費，目前非必要，排除。

### 4. CVS Callback 驗證

**決定**：使用現有 `computeCheckMacValue()` 驗證 `CheckMacValue` 欄位，使用**物流專用** HASH_KEY/IV（`ECPAY_LOGISTICS_HASH_KEY` / `ECPAY_LOGISTICS_HASH_IV`）。

**理由**：ECPay 物流 API 使用與金流不同的金鑰，必須區分。

## Risks / Trade-offs

- **In-memory rate limiting 在多實例下效果打折** → 可接受，是現有架構下的最佳平衡；未來若升級 Vercel Pro 可改用 KV
- **withAdminAuth 增加每個請求的 crypto 計算** → 影響極小（HMAC-SHA256 < 1ms）
- **cvs-callback 若物流 HASH_KEY 未設定** → 驗證失敗，回傳 401，選超商功能中斷 → 需確保環境變數完整

## Migration Plan

1. 建立 `withAdminAuth` → 更新所有 admin 路由 → 部署
2. 更新 upload-image 驗證 → 部署
3. 更新 cvs-callback 驗證（確認物流 HASH_KEY 環境變數存在後）→ 部署
4. 新增公開 API rate limiting → 部署

每步獨立可部署，無 breaking change，無需 rollback 策略。
