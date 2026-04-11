## Context

茶葉電商目前是純中文 Next.js App Router 專案，所有 UI 字串直接寫死在元件中。沒有任何 i18n 基礎設施。Admin 後台使用獨立的 Supabase Auth middleware 保護，路由前綴為 `/admin/`。

## Goals / Non-Goals

**Goals:**
- 前台支援中文（預設）和英文兩種語言
- URL-based locale：中文用 `/`，英文用 `/en/`
- Header 加語言切換按鈕
- 首頁、商品列表、體驗列表、購物車、帳戶頁等主要前台頁面完成翻譯
- `next-intl` 的 middleware 不影響 Admin 路由

**Non-Goals:**
- Admin 後台介面翻譯
- 商品名稱、描述等資料庫內容的多語系（Supabase `description_en` 欄位屬 Phase 3，本次不做）
- 第三種語言以上
- SEO hreflang / sitemap（Phase 4，本次不做）

## Decisions

### 1. 套件：next-intl

**選擇**：`next-intl`

**理由**：官方針對 Next.js App Router 設計，支援 Server Components、`useTranslations` hook、`getTranslations`（server side）。`next-i18next` 針對 Pages Router，在 App Router 下需要額外 workaround。

### 2. Locale 策略：prefix-except-default

**選擇**：中文為 default locale（路徑不加前綴），英文加 `/en/` 前綴。

```
/           → 中文首頁
/products   → 中文商品列表
/en/        → 英文首頁
/en/products → 英文商品列表
```

**理由**：現有中文 URL 不變動，不影響 SEO 歷史；英文 URL 清楚可辨，作品集展示時一目了然。

### 3. Admin 路由排除策略

**選擇**：在 `next-intl` middleware 的 `matcher` 中排除 `/admin` 和 `/api` 路徑。

```ts
// middleware.ts
export const config = {
  matcher: ['/((?!admin|api|_next|.*\\..*).*)']
}
```

**理由**：Admin 有自己的 Supabase Auth middleware 邏輯，兩個 middleware 若都攔截同一路由會衝突。`next-intl` 的 `createMiddleware` 需整合進現有 middleware，或透過 matcher 完全分離。

**做法**：將現有 admin auth middleware 邏輯移至 `src/middleware.ts`，並在同一個 middleware 中先處理 admin/api，再交給 next-intl 處理其餘路由。

### 4. 翻譯檔案結構：扁平 namespace

**選擇**：`messages/zh.json` 和 `messages/en.json`，以頁面為 namespace 分組。

```json
{
  "common": { "addToCart": "加入購物車" },
  "home": { "hero": "..." },
  "products": { "title": "商品列表" },
  "experiences": { "bookNow": "立即預約" }
}
```

**理由**：結構清晰、方便維護，namespace 對應頁面元件，新增頁面時只需新增對應 namespace。

## Risks / Trade-offs

| 風險 | 緩解方式 |
|------|----------|
| Middleware 衝突導致 Admin 無法登入 | 部署後第一件事測試 `/admin/login`，matcher 明確排除 `/admin` |
| Server Component 與 Client Component 的 `useTranslations` 用法不同 | Server Component 用 `await getTranslations()`，Client Component 用 `useTranslations()` |
| 翻譯漏掉某些字串 | 先做主要前台頁面（首頁、商品、體驗），次要頁面（404、loading）之後補 |
| next-intl 版本與 Next.js 版本不相容 | 安裝前確認 next-intl 支援的 Next.js 版本範圍 |

## Migration Plan

1. 安裝 `next-intl`，建立 routing / request config
2. 更新 `middleware.ts`：整合 next-intl + admin auth 邏輯，matcher 排除 admin/api
3. 將前台 layout 包上 `NextIntlClientProvider`
4. 逐頁替換硬編碼字串為 `t('key')`
5. 建立語言切換元件
6. 本機測試：確認中英文切換、admin 登入、API 正常

**Rollback**：`next-intl` 的改動主要在 layout 和 middleware，若有問題 revert 這兩個檔案即可恢復。
