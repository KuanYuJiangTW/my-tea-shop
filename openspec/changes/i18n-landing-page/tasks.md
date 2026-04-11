## 1. 安裝與基礎設定

- [ ] 1.1 安裝 `next-intl`：`npm install next-intl`
- [ ] 1.2 建立 `src/i18n/routing.ts`：定義 `locales = ["zh", "en"]`、`defaultLocale = "zh"`，使用 `defineRouting`
- [ ] 1.3 建立 `src/i18n/request.ts`：使用 `getRequestConfig` 從 `messages/{locale}.json` 載入翻譯
- [ ] 1.4 建立（或更新）`middleware.ts`：整合 `createNavigation` / next-intl middleware，`matcher` 排除 `/admin`、`/api`、`/_next`、靜態檔案

## 2. 翻譯檔案

- [ ] 2.1 建立 `messages/zh.json`：涵蓋 `common`、`home`、`products`、`experiences`、`cart`、`account`、`experienceBooking` namespace，將現有中文 UI 字串整理進去
- [ ] 2.2 建立 `messages/en.json`：逐一翻譯 `zh.json` 的所有 key 為英文

## 3. Layout 與 Provider 設定

- [ ] 3.1 更新 `src/app/layout.tsx`（root layout）：包上 `NextIntlClientProvider`，傳入 `messages` 與 `locale`
- [ ] 3.2 確認 `src/app/admin/layout.tsx` 不受 next-intl provider 影響（admin 有獨立 layout，應已分離）

## 4. 語言切換元件

- [ ] 4.1 建立 `src/components/LanguageSwitcher.tsx`：Client Component，使用 `useLocale()` 取得當前語言，使用 next-intl 的 `useRouter` + `usePathname` 切換語言，保留當前路徑
- [ ] 4.2 將 `LanguageSwitcher` 加入 `src/components/Header.tsx` 右側，中文顯示「中 / EN」樣式

## 5. 前台頁面翻譯

- [ ] 5.1 翻譯 `Header`、`Footer`：導覽連結、購物車、登入等文案改用 `t("common.xxx")`
- [ ] 5.2 翻譯首頁（`src/app/page.tsx`）：Hero 標語、品牌介紹、CTA 按鈕
- [ ] 5.3 翻譯商品列表頁（`src/app/products/page.tsx` 及相關元件）：頁面標題、篩選器、排序、加入購物車
- [ ] 5.4 翻譯商品詳情頁（`src/app/products/[slug]/page.tsx`）：描述、規格、按鈕文案
- [ ] 5.5 翻譯體驗列表頁（`src/app/experiences/page.tsx`）：體驗類型標籤、立即預約按鈕
- [ ] 5.6 翻譯體驗詳情頁（`src/app/experiences/[id]/page.tsx`）：說明文案、預約表單標籤
- [ ] 5.7 翻譯購物車頁（`src/app/cart/page.tsx`）：小計、結帳按鈕、空購物車提示
- [ ] 5.8 翻譯帳戶頁（`src/app/account/AccountClient.tsx`）：訂單狀態標籤、預約狀態標籤、操作按鈕

## 6. 驗證測試

- [ ] 6.1 本機測試：訪問 `/` 顯示中文、訪問 `/en/` 顯示英文
- [ ] 6.2 本機測試：語言切換按鈕在各頁面正確切換，路徑保留
- [ ] 6.3 本機測試：`/admin/login` 正常顯示，不受 locale middleware 影響
- [ ] 6.4 本機測試：API 呼叫（`/api/bookings`、`/api/products` 等）正常，無 locale 干擾
- [ ] 6.5 本機測試：英文環境下的體驗預約流程表單文案正確顯示
