# 任務：交易信件與結帳錯誤訊息的語系支援

> **動手前先讀** 本 change 的 `design.md`，特別是 D6——`orders` 的建表 SQL 從未進版控，
> **不可憑推測寫 `ALTER TABLE`**。任務 1.1 就是先把真實結構撈出來。
>
> ⚠️ **高風險區**（CLAUDE.md 鐵律 4）：本次動到 `POST /api/orders` 與 PayPal／ECPay 的
> 付款回呼路徑。改完必跑 `npm run test`，並對「英文站下單收到英文信」做反向驗證
> （`.claude/skills/reverse-verify/SKILL.md`）。
>
> 現成的雙語樣板可抄：`src/lib/email.ts` 的體驗開課申請信與接案諮詢信
> （`locale` 欄位 ＋ `const isEn = d.locale === "en"` 分歧）。

## 1. 資料層

- [ ] 1.1 跑 `supabase/audit-2026-08-31-open-questions.sql` 的 Q4，撈出 `orders` 的真實欄位結構
      （需要 Supabase MCP 的新 session，或直接在 Supabase SQL Editor 執行）
- [ ] 1.2 依 1.1 的實際輸出補一份 baseline migration 進 repo（**純記錄現況，不改動任何欄位**），
      讓未來的 repo 稽核不再對這張表失明
- [ ] 1.3 新增 migration：`orders` 增欄 `locale text NOT NULL DEFAULT 'zh' CHECK (locale IN ('zh','en'))`
      （`ADD COLUMN IF NOT EXISTS`；DEFAULT 一次解決既有訂單的回填，不另寫 backfill）

## 2. 信件樣板

- [ ] 2.1 `src/lib/email.ts`：`EmailOrderData` 與 `ShippingEmailData` 加 `locale: string` 欄位
- [ ] 2.2 `sendCustomerEmail` 加英文主旨與內文分支（照既有 `isEn` 寫法）
- [ ] 2.3 `sendShippingEmail` 加英文主旨與內文分支
- [ ] 2.4 金額、日期、配送方式等在信件中出現的**格式化字串**一併雙語化
      （不要只翻標題卻留下中文的「宅配」「超商取貨」）

## 3. 建單路徑寫入語系

- [ ] 3.1 `src/app/checkout/CheckoutClient.tsx`：建單 payload 帶入 `locale`
      （該檔 `:64` 已有 `const locale = useLocale()`，直接用）
- [ ] 3.2 `src/app/api/orders/route.ts`：接收 `locale`、驗證值域（非 `zh`/`en` 一律當 `zh`）、寫入訂單
      ——依 spec，語系缺漏或非法 **SHALL NOT 阻擋交易**
- [ ] 3.3 `src/lib/paypal.ts:243`：組 `EmailOrderData` 時帶入訂單語系
- [ ] 3.4 `src/app/api/ecpay/` 底下建立 `EmailOrderData` 的位置同樣帶入
- [ ] 3.5 `src/app/api/admin/orders/[id]/route.ts:162`：出貨信讀**訂單**的語系，不是後台介面語系

## 4. 錯誤代碼

- [ ] 4.1 盤點 `src/app/api/orders/route.ts` 全部 18 個中文 `error`，為每個指派穩定代碼
      （命名沿用 `messages/` 既有 namespace 慣例，例如 `cart.empty`）
- [ ] 4.2 改回應形狀為 `{ code, message, error }`——`error` 保留與既有消費者的相容性，值同 `message`
- [ ] 4.3 `messages/zh.json` 與 `en.json` 補上每個代碼的字串，並確認兩邊 key 完全對齊
- [ ] 4.4 補一個通用 fallback 字串（`errors.generic`），供查無代碼時使用
- [ ] 4.5 `CheckoutClient.tsx:408/428/459/489`：改成「代碼查表 → 查無則通用訊息」，
      **移除 `json.error ?? t(…)` 這個寫法**

## 5. 測試

- [ ] 5.1 訂單語系：英文站建單存 `en`、中文站存 `zh`、未帶語系存 `zh` 且建單成功
- [ ] 5.2 信件語言：`en` 訂單的確認信與出貨信為英文；`zh` 訂單內容與本變更前一致
- [ ] 5.3 出貨信取的是**訂單**語系而非操作者語系（用中文後台對 `en` 訂單觸發）
- [ ] 5.4 **錯誤訊息的在地化 fallback 真的會執行**——這是本 change 的根因，
      測試要能在有人改回「後端字串優先」時變紅
- [ ] 5.5 代碼與 `messages/` 對應完整：route 裡的每個 code 在 zh 與 en 都查得到字串（缺一個就紅）
- [ ] 5.6 反向驗證 5.4 與 5.2：退回修正、確認測試會紅、再改回
      （還原用備份檔或 `git stash`，**不要對有未提交變更的檔案下 `git checkout --`**）

## 6. 上線前

- [ ] 6.1 `/verify` 四件套全綠
- [ ] 6.2 **用真實 Resend 寄一封英文訂單信到自己信箱目視確認**——版面與用語問題單元測試看不出來
- [ ] 6.3 在 `src/app/api/orders/route.ts` 檔頭加註記：改動錯誤代碼要同步改 `messages/` 與測試
- [ ] 6.4 部署後用 `deploy-check` skill 驗正式站，並實際走一次英文站下單流程
