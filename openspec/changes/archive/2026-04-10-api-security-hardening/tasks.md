## 1. 建立 withAdminAuth Wrapper

- [x] 1.1 建立 `src/lib/admin-auth-guard.ts`，export `withAdminAuth(handler)` function，內部使用 `computeAdminToken` + `timingSafeEqual` 驗證 `admin_session` cookie，驗證失敗回傳 HTTP 401
- [x] 1.2 更新 `src/app/api/admin/experience-sessions/route.ts`，GET 和 POST handler 套用 `withAdminAuth`
- [x] 1.3 更新 `src/app/api/admin/products/route.ts`，GET 和 POST handler 套用 `withAdminAuth`
- [x] 1.4 更新 `src/app/api/admin/products/[id]/route.ts`，PATCH 和 DELETE handler 套用 `withAdminAuth`
- [x] 1.5 更新 `src/app/api/admin/reviews/[id]/route.ts`，PATCH handler 套用 `withAdminAuth`
- [x] 1.6 更新 `src/app/api/admin/experience-bookings/[id]/route.ts`，PATCH handler 套用 `withAdminAuth`
- [x] 1.7 更新 `src/app/api/admin/upload-image/route.ts`，POST handler 套用 `withAdminAuth`

## 2. 圖片上傳 MIME 驗證

- [x] 2.1 在 `src/app/api/admin/upload-image/route.ts` 定義允許的 MIME 類型白名單（`image/jpeg`、`image/png`、`image/webp`）和副檔名白名單（`jpg`、`jpeg`、`png`、`webp`）
- [x] 2.2 在檔案大小驗證之後、上傳之前，加入 MIME 類型與副檔名雙重驗證，不符合時回傳 HTTP 400

## 3. CVS Callback 簽章驗證

- [x] 3.1 確認 `.env.local` 與 Vercel 環境變數中有 `ECPAY_LOGISTICS_HASH_KEY` 和 `ECPAY_LOGISTICS_HASH_IV`（若沒有，先向綠界取得物流 API 金鑰並設定）
- [x] 3.2 在 `src/app/api/ecpay/cvs-callback/route.ts` 解析 form body 後，計算 `CheckMacValue` 並與回調資料比對，不符合時回傳 HTTP 400

## 4. 公開 API 速率限制

- [x] 4.1 將 `src/app/api/contact/route.ts` 中的 in-memory rate limiting 邏輯抽取成共用函數（建議放在 `src/lib/rate-limit.ts`，若已存在則擴充）
- [x] 4.2 在 `src/app/api/experiences/route.ts` 套用速率限制（100 req/min per IP）
- [x] 4.3 在 `src/app/api/orders/route.ts` 套用速率限制（20 req/min per IP），插入於現有登入驗證之前
- [x] 4.4 在 `src/app/api/bookings/route.ts` 套用速率限制（20 req/min per IP），插入於現有登入驗證之前
