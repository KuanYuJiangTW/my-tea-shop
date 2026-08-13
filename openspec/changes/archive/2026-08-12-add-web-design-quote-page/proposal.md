# Proposal: 風土數位報價頁（add-web-design-quote-page）

## Why

taiwantea.store 本身就是一個完整的客製電商作品（三金流、預約系統、雙語、AI SEO），但目前沒有任何入口把「看中網站品質的訪客」轉化為接案商機。新增報價頁讓這些訪客能直接看到三階報價、留下需求資料並透過 LINE 即時聯絡，成為「風土數位」（Terroir Digital）接案品牌的第一個銷售漏斗。

## What Changes

- 新增 `/web-design` 行銷頁：品牌敘事（風土數位／「每個生意，都有自己的風土」）、三階報價卡（NT$ 39,000／98,000／250,000 起，中階為主推）、加購項目、維護月費方案、常見問題、報價效期與商業條款
- 新增六題諮詢表單（認識管道、產業與品牌、痛點複選、預算區間、上線時程、聯絡方式），寫入新資料表 `web_inquiries`
- 表單送出成功後引導加 LINE 即時聯絡（LINE 帳號先以設定值留位，待業主提供）
- 新增 admin 通知：收到新諮詢時寄信到 `ADMIN_EMAIL`（沿用現有寄信機制）
- `Footer` 新增「本網站設計開發：風土數位」徽章連結（雙語），連到 `/web-design`
- 頁面與表單全部雙語（zh-TW／EN），字串進 `messages/`

## Capabilities

### New Capabilities

- `web-design-quote-page`: 報價頁的內容結構與展示行為——品牌敘事、三階報價、加購與維護方案、FAQ、商業條款、Footer 入口、雙語與 SEO metadata
- `web-inquiry-form`: 諮詢表單的提交行為——欄位驗證、寫入 `web_inquiries`（RLS：匿名可寫、僅 admin 可讀）、admin email 通知、送出後的 LINE 導流

### Modified Capabilities

（無——不變更任何既有能力的需求。Footer 僅新增一個連結，不改既有行為規格。）

## Impact

- 新增：`src/app/web-design/`（頁面與 server action）、Supabase migration（`web_inquiries` 表＋RLS 政策）、`messages/` 兩語系字串、對應測試
- 修改：`src/components/Footer.tsx`（加徽章連結）
- 不碰：金流、庫存扣減、auth／2FA、既有資料表與 RLS、cron
- 風險評估：不在高風險區核心，但含**新表 RLS**——政策照 CLAUDE.md 鐵律 4 於實作後跑完整測試驗證
