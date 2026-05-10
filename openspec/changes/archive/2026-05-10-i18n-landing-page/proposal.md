## Why

茶葉電商目前僅有中文介面，無法觸及英語市場，也無法作為作品集中展示多語系能力的案例。加入英文支援可強化 Upwork 接案競爭力，讓客戶直接看到 i18n 實作能力。

## What Changes

- 安裝並設定 `next-intl`，以 URL-based locale 方式區分語言（`/` 為中文，`/en/` 為英文）
- 建立 `messages/zh.json` 與 `messages/en.json`，涵蓋前台所有 UI 字串
- 新增語言切換元件，讓使用者可在中英文之間切換
- 首頁（Landing Page）、商品列表、體驗列表等主要前台頁面完成雙語翻譯
- Admin 後台、API routes、ECPay 金流流程**不做 i18n**（維持原狀）

## Capabilities

### New Capabilities
- `i18n-routing`: URL-based locale 路由設定（next-intl middleware、routing config）
- `i18n-ui-strings`: 前台 UI 文案的雙語翻譯（messages JSON + useTranslations hooks）
- `i18n-language-switcher`: 語言切換元件（Header 上的中/英切換按鈕）

### Modified Capabilities
- `experience-booking`: 體驗預約流程的前台文案納入翻譯（booking form、狀態標籤等）

## Impact

- **新增套件**：`next-intl`
- **新增檔案**：`messages/zh.json`、`messages/en.json`、`src/i18n/routing.ts`、`src/i18n/request.ts`、`middleware.ts`（更新）
- **影響範圍**：所有前台頁面元件（`src/app/` 下非 admin 的頁面）需改用 `useTranslations` hook 取得文案
- **不影響**：`src/app/admin/`、`src/app/api/`、ECPay 回調、Supabase schema
- **風險點**：`middleware.ts` 改動後需確認 admin 登入路由不受 locale 攔截
