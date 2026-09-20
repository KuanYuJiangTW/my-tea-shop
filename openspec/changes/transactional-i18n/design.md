## Context

英文站（`/en` 前綴，middleware rewrite）有國際配送與 PayPal，但交易動線的兩個出口只講中文。

現況：
- `src/lib/email.ts` 已經有雙語的先例——`WebInquiryEmailData` 與體驗開課申請信都帶 `locale: string`，內部用 `const isEn = d.locale === "en"` 分歧樣板。**只有最早寫的 `EmailOrderData`／`ShippingEmailData` 沒有這個欄位。**
- `src/app/checkout/CheckoutClient.tsx:64` 已經有 `const locale = useLocale()`（目前只用來組路徑）。
- `POST /api/orders` **完全沒讀語系**（無 `locale` 參數、無 `Accept-Language`）。
- 出貨信由後台在 `PATCH /api/admin/orders/[id]` 事後手動觸發（`src/app/api/admin/orders/[id]/route.ts:162`），**當下沒有客戶的 request context**。

限制：
- `orders` 的建表 SQL **從未進版控**（2026-08-31 稽核發現），repo 裡查不到它的真實結構。
- 這條路徑碰金流（PayPal／ECPay 回呼都會寄信），屬 CLAUDE.md 鐵律 4 的高風險區。

## Goals / Non-Goals

**Goals:**
- 客人用哪個語言下單，就收到哪個語言的訂單確認信與出貨信
- 結帳錯誤訊息在英文站顯示英文，且**這件事要能被測試釘住**（現在的 `?? t(…)` 之所以是死的，正因為沒有任何測試證明它會執行）
- 不破壞既有的中文行為與既有訂單

**Non-Goals:**
- 不處理其他寫死中文的頁面（候補確認頁、補填參加者資料頁）與分頁標題的 `generateMetadata` 化
- 不處理後端其餘 41 個路由的錯誤訊息——先把交易主動線做對，建立可複製的模式
- 不做第三語言，也不為此建立通用的 i18n 信件框架（YAGNI；目前只有兩語）

## Decisions

### D1：語系由前端明確傳入，不讀 `Accept-Language`

`CheckoutClient` 已有 `useLocale()`，建單時把它放進 payload。

**為什麼不用 `Accept-Language`**：站上的語言由 URL 前綴決定，那才是客人**實際正在看**的語言。瀏覽器的 `Accept-Language` 可能完全不同——一個台灣人可能刻意在看英文站要送禮給國外朋友。用 header 會在這種情況下寄錯語言，而且不可預測、難以測試。

### D2：語系持久化在 `orders`，不是只存在於 request

出貨信是後台事後觸發的，當下拿不到客戶的 request locale。**不存起來就寄不出正確語言**——這是必須落地到資料表的理由，不是為了方便。

同理，任何未來的補寄、重寄、對帳信都能讀到同一份事實。

### D3：既有訂單回填為 `zh`，欄位設 `NOT NULL DEFAULT 'zh'`

既有訂單的信本來就是中文寄出的，回填 `zh` **不改變任何已發生的事實**，也不改變既有行為。用 DEFAULT 讓回填與新欄位一次到位，不需要另外寫 backfill 腳本。

### D4：API 回**錯誤代碼**，前端負責呈現

```jsonc
// 現在
{ "error": "購物車不能為空" }
// 改成
{ "code": "cart.empty", "message": "購物車不能為空" }
```

- `code` 是穩定契約，前端用它查 `messages/`
- `message` 保留中文，供後台日誌與除錯（**不再由前端直接顯示**）

**為什麼不讓 API 讀 locale 回對應語言的字串**：那會讓 API 同時負責業務與呈現，而且伺服器日誌會變成中英混雜、難以搜尋。呈現層的事留在呈現層。

**相容性**：保留既有的 `error` 欄位（值同 `message`），既有消費者不會壞——這不是 breaking change。前端改成優先讀 `code`。

### D5：前端的 fallback 順序

```
t(`errors.${code}`)  →  查無此 code 時退回 t("errors.generic")
```

**不再使用 `json.error ?? t(…)`**——那個寫法讓後端字串永遠勝出，是本次要修的根因。

### D6：先撈真實 schema，再寫 migration

`orders` 從未進版控，**不可以憑推測寫 `ALTER TABLE`**。實作第一步是跑
`supabase/audit-2026-08-31-open-questions.sql` 的 Q4，把 `orders` 的真實欄位撈出來、
補一份 baseline 進 repo，然後才加語系欄位。

## Risks / Trade-offs

- **錯誤代碼是對外契約，改名會靜默弄壞前端** → 用測試釘住 code 清單與 `messages/` 的對應（缺一個就紅），並在 route 檔頭註明「改代碼要同步改 messages 與測試」。
- **憑推測改 `orders` 結構可能與線上不符** → D6 強制先撈真實 schema；migration 只加欄位、不動既有欄位。
- **動到金流回呼路徑，改壞會影響真實訂單** → 改完必跑 `npm run test`（鐵律 4）；並對「英文站下單收到英文信」這條做反向驗證（退回修正、確認測試會紅，見 `reverse-verify` skill）。
- **英文信件樣板是新寫的，可能有版面或用語問題** → 上線前用真實 Resend 寄一封到自己信箱目視確認，不要只看單元測試。
- **語系欄位只有兩個合法值** → 存字串而非 enum，避免日後加語言要改 schema；但用 CHECK 約束擋掉打錯的值。

## Migration Plan

1. 跑 Q4 撈 `orders` 真實結構 → 補 baseline migration 進 repo（純記錄，不改動）
2. `ALTER TABLE orders ADD COLUMN locale text NOT NULL DEFAULT 'zh' CHECK (locale IN ('zh','en'))`
3. 後端：建單時寫入語系；信件樣板加英文分支
4. 前端：payload 帶語系；錯誤訊息改查代碼
5. 驗證：`npm run test` ＋ 反向驗證 ＋ 真實寄信目視確認

**回滾**：欄位有 DEFAULT，舊程式碼不讀它也不會壞；前端保留 `error` 欄位相容。任一步出問題都可單獨 revert，不需要整批退。
