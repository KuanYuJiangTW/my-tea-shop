<div align="right">

**繁體中文** | [English](README-en.md)

</div>

<div align="center">

# 霧抉茶 Wu Jue Tea

**嘉義阿里山梅山高山茶｜自產自銷電商 + 茶藝體驗預約平台**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-2-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-008CDD?logo=stripe&logoColor=white)](https://stripe.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[線上預覽](https://taiwantea.store) · [管理後台](https://taiwantea.store/admin)

</div>

---

## 專案亮點

- **正式營運中的產品** — 非教學範例或 Demo 專案
- **完整電商流程**：商品目錄 → 購物車 → 綠界金流結帳 → 訂單追蹤 → Email 通知
- **完整預約系統**：場次日曆 → 候補自動順延 → 完課留評
- **管理後台**：營收圖表、訂單 / 預約 / 商品管理、評價審核
- **安全優先**：2FA（TOTP）、CSP nonce、RLS、HMAC 簽章 Session、API 限流、後端價格驗證
- **中英雙語（zh-TW / EN）**：含所有交易信件，使用 next-intl
- **自動化排程**：Vercel Cron 處理完課標記、活動提醒、候補過期清理

---

## 截圖

### 前台 — 電商
<table>
  <tr>
    <td align="center"><strong>首頁</strong></td>
    <td align="center"><strong>商品頁</strong></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/home.png" alt="首頁" width="100%"/></td>
    <td><img src="docs/screenshots/products.png" alt="商品頁" width="100%"/></td>
  </tr>
  <tr>
    <td align="center"><strong>購物車</strong></td>
    <td align="center"><strong>結帳頁</strong></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/cart.png" alt="購物車" width="100%"/></td>
    <td><img src="docs/screenshots/checkout.png" alt="結帳頁" width="100%"/></td>
  </tr>
</table>

### 前台 — 茶藝體驗
<table>
  <tr>
    <td align="center"><strong>體驗列表</strong></td>
    <td align="center"><strong>體驗詳情</strong></td>
    <td align="center"><strong>體驗詳情（評價）</strong></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/experiences.png" alt="體驗列表" width="100%"/></td>
    <td><img src="docs/screenshots/experience-detail.png" alt="體驗詳情" width="100%"/></td>
    <td><img src="docs/screenshots/experience-detail-02.png" alt="體驗詳情評價" width="100%"/></td>
  </tr>
  <tr>
    <td align="center"><strong>預約流程 — 選擇場次</strong></td>
    <td align="center"><strong>預約流程 — 填寫資料</strong></td>
    <td align="center"><strong>預約流程 — 確認付款</strong></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/booking.png" alt="預約選擇場次" width="100%"/></td>
    <td><img src="docs/screenshots/booking-02.png" alt="預約填寫資料" width="100%"/></td>
    <td><img src="docs/screenshots/booking-03.png" alt="預約確認付款" width="100%"/></td>
  </tr>
</table>

### 前台 — 會員中心
<table>
  <tr>
    <td align="center"><strong>預約記錄</strong></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/account.png" alt="會員中心" width="50%"/></td>
  </tr>
</table>

### 管理後台
<table>
  <tr>
    <td align="center"><strong>登入（2FA）</strong></td>
    <td align="center"><strong>儀表板</strong></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/admin.png" alt="後台登入" width="100%"/></td>
    <td><img src="docs/screenshots/admin-dashboard.png" alt="儀表板" width="100%"/></td>
  </tr>
  <tr>
    <td align="center"><strong>體驗場次管理</strong></td>
    <td align="center"><strong>預約管理</strong></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/admin-experiences.png" alt="體驗場次管理" width="100%"/></td>
    <td><img src="docs/screenshots/admin-experiences-02.png" alt="預約管理" width="100%"/></td>
  </tr>
</table>

---

## 專案簡介

**霧抉茶**是為台灣嘉義阿里山區茶農家庭打造的全端平台，涵蓋兩大核心系統：

1. **電商系統** — 商品瀏覽、購物車、ECPay 金流（信用卡 / 超商）、訂單追蹤
2. **茶藝體驗預約系統** — 5 種體驗活動、場次管理、線上預約付款、候補通知、完課後留評

---

## 技術棧

| 類別 | 技術 |
|---|---|
| **框架** | [Next.js 15](https://nextjs.org/)（App Router）+ [React 19](https://react.dev/) |
| **語言** | [TypeScript 5](https://www.typescriptlang.org/)（strict mode） |
| **樣式** | [Tailwind CSS 3](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/) |
| **資料庫 / 認證** | [Supabase](https://supabase.com/)（PostgreSQL + Auth + RLS） |
| **內容管理** | [Sanity CMS](https://www.sanity.io/)（體驗頁面內容 + 內嵌 Studio） |
| **國際化** | [next-intl](https://next-intl.dev/)（繁體中文 / English） |
| **金流 / 物流** | [ECPay 綠界](https://www.ecpay.com.tw/)（信用卡 / ATM / 超商代碼 + 超商店到店物流）+ [Stripe](https://stripe.com/)（國際信用卡 / Apple Pay / Google Pay） |
| **Email** | [Resend](https://resend.com/)（訂單 / 預約 / 候補通知） |
| **圖表** | [Recharts](https://recharts.org/)（後台收益圖表） |
| **部署** | [Vercel](https://vercel.com/) |

---

## 功能列表

### 前台 — 電商

- **商品瀏覽**：多規格選擇（150g / 75g / 茶包），即時庫存顯示，售完自動鎖定
- **購物車**：Context 狀態管理，localStorage 本地快取，Supabase 雲端同步
- **結帳流程**：宅配到府 / 超商店到店（7-11、全家、萊爾富、OK），滿額免運
- **付款方式**：線上付款（ECPay：信用卡 / ATM / 超商代碼）、Stripe 國際付款（信用卡 / Apple Pay / Google Pay）、貨到付款
- **訂單追蹤**：登入後查看歷史訂單與最新狀態，支援取消
- **優惠券 / 積點**：優惠碼驗證，完課後自動累積積點，積點折抵消費
- **Email 通知**：下單確認、出貨通知（顧客 + 商家雙份）
- **中英雙語**：全站支援繁體中文 / English 切換（next-intl）

### 前台 — 茶藝體驗預約

- **體驗瀏覽**：5 種體驗活動（茶藝體驗、焙茶工坊、採茶體驗、紅茶製作、茶果酒釀造）
- **場次日曆**：按月份查詢可預約場次，即時顯示剩餘名額
- **線上預約**：填寫參加者資料（含緊急聯絡人），ECPay 付款完成即確認
- **候補系統**：場次滿額可加入候補；有人取消時按先進先出自動通知，24 小時內確認否則順延下一位
- **完課留評**：體驗完成後可針對該場次留下評價與星等
- **帳戶中心**：查看所有預約紀錄、參加者名單、取消申請

### 前台 — 會員認證

- **登入 / 註冊**：Email 註冊、Supabase Auth 驗證
- **受保護路由**：會員中心、訂單紀錄、預約管理需登入後才可存取

### 後台（Admin）

- **雙重認證**：管理員密碼 + 2FA（OTP / TOTP），登入失敗 15 分鐘內限 5 次
- **儀表板**：今日訂單數、待處理件數、月收益折線圖
- **訂單管理**：列表篩選、查看明細、一鍵更新狀態、出貨自動寄通知信
- **商品管理**：修改售價、庫存、上下架、圖片上傳
- **體驗管理**：場次日曆、新增 / 編輯 / 取消場次、查看預約列表、更新預約狀態、退款處理
- **評價管理**：審核評價、切換可見性
- **設定**：2FA 啟用 / 停用

### 自動化（Cron Jobs）

| 任務 | 排程 | 說明 |
|---|---|---|
| `complete-bookings` | 每日 02:00 UTC | 自動標記已結束的體驗為「完成」，發放積點 |
| `experience-reminders` | 每日 01:00 UTC | 參加者補填提醒（活動前 5 天）、活動前日提醒、場次確認/取消、候補過期清理與順延通知 |

### 安全機制

- **CSP 安全標頭**：動態 nonce 防 XSS，搭配 `X-Frame-Options`、`HSTS`、`Permissions-Policy` 等完整 HTTP 安全標頭
- **ECPay 簽章驗證**：回調 `CheckMacValue` SHA256 驗證 + timing-safe 比對
- **Supabase RLS**：行級安全確保顧客只能存取自己的資料
- **Admin 認證**：HMAC 簽章 Cookie + 2FA（TOTP），全站 `/admin/*` 由 Middleware 守門
- **API 限流**：IP rate limiter（20 req/min），登入失敗 15 分鐘限 5 次
- **後端價格驗證**：結帳時後端重新計算金額，完全不信任前端數據

---

## 專案架構

```
├── messages/                             # i18n 翻譯檔
│   ├── zh.json                           # 繁體中文
│   └── en.json                           # English
│
src/
├── app/                                  # Next.js 15 App Router
│   ├── layout.tsx                        # 根版面（GA、Auth、Cart Provider）
│   ├── page.tsx                          # 首頁
│   ├── about/                            # 品牌故事
│   ├── products/                         # 商品列表
│   ├── process/                          # 製茶過程
│   ├── experiences/                      # 茶藝體驗列表
│   │   └── [slug]/                       # 體驗詳情 + 評價
│   │       └── booking/[sessionId]/      # 預約流程
│   ├── cart/                             # 購物車
│   ├── checkout/                         # 結帳
│   ├── order/result/                     # 付款結果
│   ├── waitlist/[id]/confirm/            # 候補確認頁
│   ├── account/                          # 會員中心（受保護）
│   │   └── bookings/[id]/participants/   # 預約參加者
│   ├── auth/                             # 登入 / 註冊 / OAuth callback
│   │   ├── login/                        # 登入頁
│   │   └── register/                     # 註冊頁
│   ├── contact/                          # 聯絡表單
│   ├── faq/                              # 常見問題
│   ├── privacy/                          # 隱私權政策
│   ├── return-policy/                    # 退換貨政策
│   ├── studio/                           # Sanity CMS Studio（內嵌編輯介面）
│   ├── admin/                            # 管理後台
│   │   ├── page.tsx                      # 後台登入
│   │   ├── verify-2fa/                   # 2FA 驗證
│   │   └── (protected)/                  # 受保護路由群組
│   │       ├── dashboard/                # 儀表板
│   │       ├── orders/[id]/              # 訂單管理
│   │       ├── products/                 # 商品管理
│   │       ├── experiences/              # 體驗 / 場次 / 預約管理
│   │       ├── reviews/                  # 評價管理
│   │       └── settings/                 # 設定（2FA）
│   └── api/
│       ├── orders/                       # 建立訂單、查詢、取消
│       ├── bookings/                     # 建立預約、查詢、取消、參加者
│       ├── experiences/                  # 體驗類型列表
│       ├── experience-sessions/          # 場次查詢
│       ├── waitlist/                     # 加入候補、候補確認
│       ├── reviews/                      # 建立評價
│       ├── user/coupons|points/          # 優惠券驗證、積點查詢
│       ├── products/stock/               # 商品庫存
│       ├── ecpay/                        # 綠界金流 + 物流（商品 + 體驗 + 超商地圖）
│       ├── stripe/                      # Stripe 國際金流（結帳 + Webhook）
│       ├── cron/                         # 排程任務
│       ├── admin/                        # 後台管理 API（含 2FA 設定）
│       ├── contact/                      # 聯絡表單
│       ├── revalidate/                   # ISR 快取更新
│       └── sanity-webhook/              # Sanity CMS Webhook
│
├── components/
│   ├── Header.tsx                        # 黏性導覽（RWD 漢堡選單、購物車圖示）
│   ├── Footer.tsx
│   ├── ProductCard.tsx                   # 商品卡片（多規格、庫存狀態）
│   ├── ProductLightbox.tsx               # 商品圖片燈箱
│   ├── LanguageSwitcher.tsx              # 中英語言切換
│   ├── SiteChrome.tsx                    # 自動隱藏 Header/Footer（後台路由）
│   ├── GoogleAnalytics.tsx               # GA4 整合
│   └── ui/                              # Shadcn UI 元件（button、select 等）
│
├── context/
│   ├── CartContext.tsx                   # 購物車全域狀態（localStorage + Supabase）
│   └── AuthContext.tsx                   # Supabase 認證狀態
│
├── i18n/
│   ├── routing.ts                        # Locale 路由配置（zh 預設 / en）
│   └── request.ts                        # 動態載入翻譯檔
│
├── lib/
│   ├── supabase.ts / supabase-client.ts / supabase-server.ts
│   ├── experiences.ts                    # 體驗資料查詢（Sanity + 靜態備援）
│   ├── products.ts                       # 商品資料查詢
│   ├── email.ts                          # Resend 信件（訂單 / 預約 / 候補 / 聯絡）
│   ├── waitlist.ts                       # 候補通知與過期邏輯
│   ├── admin-auth-guard.ts               # Admin 認證中介
│   ├── admin-token.ts                    # HMAC 簽章
│   ├── rate-limit.ts                     # IP 限流
│   └── utils.ts
│
├── sanity/
│   ├── schemas/                          # Sanity CMS 內容模型（體驗、商品、FAQ）
│   └── client.ts                         # Sanity Client 配置
│
├── data/
│   └── products.ts                       # 靜態商品資料（備援）
│
├── types/
│   └── index.ts                          # 全域 TypeScript 介面定義
│
└── proxy.ts                              # Middleware：i18n 偵測 + CSP nonce + Admin 路由保護
```

---

## 購物流程

```
顧客瀏覽商品
     │
     ▼
加入購物車（CartContext）
     │
     ▼
填寫結帳表單（收件資訊 + 付款 + 配送方式）
     │
     ├── 貨到付款 ──► POST /api/orders ──► 寫入 DB（pending）+ 扣庫存 + 寄信
     │
     └── 線上付款 ──► POST /api/ecpay/checkout ──► 寫入 DB（pending）
                              │
                              ▼
                      自動提交表單至綠界
                              │
             ┌────────────────┴─────────────────┐
             │                                  │
  Server 回調 /api/ecpay/return        Browser 回調 /api/ecpay/result
  （驗證簽章 → 更新 paid → 扣庫存 → 寄信）   （轉址至 /order/result）
```

## 體驗預約流程

```
瀏覽體驗 /experiences
     │
     ▼
選擇場次（月曆） /experiences/[slug]
     │
     ├── 有名額 ──► 填寫預約資料 /experiences/[slug]/booking/[sessionId]
     │                    │
     │                    ▼
     │             ECPay 付款 ──► 預約確認 Email
     │
     └── 已滿 ──► 加入候補 POST /api/waitlist
                       │
                       ▼（有人取消時）
              候補通知 Email（24 小時確認截止）
                       │
              ├── 確認 ──► GET /waitlist/[id]/confirm ──► 轉為正式預約
              └── 逾時 ──► 自動過期，通知下一位
```

---

## 本地執行

### 前置需求

- Node.js 18+
- Supabase 專案（免費方案即可）
- ECPay 測試商店帳號
- Resend 帳號並驗證寄信域名
- Sanity 專案（可選，無則使用靜態備援資料）

### 安裝步驟

```bash
# 1. 複製專案
git clone https://github.com/KuanYuJiangTW/my-tea-shop.git
cd my-tea-shop

# 2. 安裝依賴
npm install

# 3. 設定環境變數
cp .env.example .env.local
# 編輯 .env.local，填入下方所有必要欄位
```

### 環境變數

```env
# ── 網站網址 ───────────────────────────────────
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# ── Supabase ──────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ── Resend Email ──────────────────────────────
RESEND_API_KEY=
RESEND_FROM_EMAIL=霧抉茶 <noreply@your-domain.com>
ADMIN_EMAIL=

# ── 綠界金流 ──────────────────────────────────
ECPAY_MERCHANT_ID=
ECPAY_HASH_KEY=
ECPAY_HASH_IV=

# ── Stripe 國際金流（可選） ──────────────────
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# ── 綠界物流（超商店到店） ───────────────────
ECPAY_LOGISTICS_HASH_KEY=
ECPAY_LOGISTICS_HASH_IV=

# ── 管理後台 ───────────────────────────────────
ADMIN_PASSWORD=
ADMIN_TOKEN_SECRET=        # 任意隨機字串，用於 HMAC 簽章

# ── Sanity CMS（可選） ────────────────────────
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=
SANITY_WEBHOOK_SECRET=     # Sanity Webhook 驗證

# ── Google Analytics（可選） ──────────────────
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# ── Cron Secret（Vercel Cron 驗證用） ─────────
CRON_SECRET=

# ── ISR 快取更新 ─────────────────────────────
REVALIDATE_SECRET=
```

### 啟動開發伺服器

```bash
npm run dev
# 開啟 http://localhost:3000
```

### 其他指令

```bash
npm run build    # 正式環境建置
npm run start    # 啟動正式伺服器
npm run lint     # ESLint 檢查
npx tsc --noEmit # TypeScript 型別檢查
```

---

## 部署至 Vercel

```bash
npm i -g vercel
vercel --prod
```

部署後至 Vercel 後台 **Settings → Environment Variables** 填入所有環境變數。

**Cron Jobs** 設定請在 `vercel.json` 中定義（或直接使用 Vercel Dashboard 的 Cron 功能）：

```json
{
  "crons": [
    {
      "path": "/api/cron/complete-bookings",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/experience-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

> **注意**：ECPay 的 `ReturnURL` 與 `OrderResultURL` 需指向正式網域。本地測試可使用 [ngrok](https://ngrok.com/) 建立臨時公開網址。

---

## 授權

[MIT](LICENSE) © 2026 霧抉茶 Wu Jue Tea
