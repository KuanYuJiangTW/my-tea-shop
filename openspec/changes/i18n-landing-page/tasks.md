## 1. 安裝與基礎設定

- [x] 1.1 安裝 `next-intl`：`npm install next-intl`
- [x] 1.2 建立 `src/i18n/routing.ts`：定義 `locales = ["zh", "en"]`、`defaultLocale = "zh"`，使用 `defineRouting`
- [x] 1.3 建立 `src/i18n/request.ts`：使用 `getRequestConfig` 從 `messages/{locale}.json` 載入翻譯
- [x] 1.4 建立（或更新）`middleware.ts`：整合 `createNavigation` / next-intl middleware，`matcher` 排除 `/admin`、`/api`、`/_next`、靜態檔案

## 2. 翻譯檔案

- [x] 2.1 建立 `messages/zh.json`：涵蓋 `common`、`home`、`products`、`experiences`、`cart`、`account`、`experienceBooking` namespace，將現有中文 UI 字串整理進去
- [x] 2.2 建立 `messages/en.json`：逐一翻譯 `zh.json` 的所有 key 為英文

## 3. Layout 與 Provider 設定

- [x] 3.1 更新 `src/app/layout.tsx`（root layout）：包上 `NextIntlClientProvider`，傳入 `messages` 與 `locale`
- [x] 3.2 確認 `src/app/admin/layout.tsx` 不受 next-intl provider 影響（admin 有獨立 layout，應已分離）

## 4. 語言切換元件

- [x] 4.1 建立 `src/components/LanguageSwitcher.tsx`：Client Component，使用 `useLocale()` 取得當前語言，使用 next-intl 的 `useRouter` + `usePathname` 切換語言，保留當前路徑
- [x] 4.2 將 `LanguageSwitcher` 加入 `src/components/Header.tsx` 右側，中文顯示「中 / EN」樣式

## 5. 前台頁面翻譯

- [x] 5.1 翻譯 `Header`、`Footer`：導覽連結、購物車、登入等文案改用 `t("common.xxx")`
- [x] 5.2 翻譯首頁（`src/app/page.tsx`）：Hero 標語、品牌介紹、CTA 按鈕
- [x] 5.3 翻譯商品列表頁（`src/app/products/page.tsx` 及相關元件）：頁面標題、篩選器、排序、加入購物車
- [x] 5.3a 翻譯商品分類按鈕（烏龍茶→Oolong、紅茶→Black Tea）：加入 `categoryOolong`、`categoryBlack` 翻譯 key
- [x] 5.3b 翻譯產品卡片內容（`ProductCard.tsx`）：商品名稱、描述、產地、分類標籤依 locale 切換中英文顯示
- [x] 5.3c 產品資料新增英文欄位（`descriptionEn`、`originEn`）：更新 Product type、`lib/products.ts` 從 Supabase 讀取
- [x] 5.3d Admin 後台產品管理加入英文欄位：編輯/新增表單新增「產地（英文）」、「商品描述（英文）」輸入框
- [x] 5.3e Supabase products 表加 `description_en`、`origin_en` 欄位（需手動執行 SQL migration）
- [x] 5.4 翻譯商品詳情頁（`src/app/products/[slug]/page.tsx`）：描述、規格、按鈕文案（此頁不存在，跳過）
- [x] 5.5 翻譯體驗列表頁（`src/app/experiences/page.tsx`）：體驗類型標籤、立即預約按鈕
- [x] 5.6 翻譯體驗詳情頁（`src/app/experiences/[id]/page.tsx`）：說明文案、預約表單標籤
- [x] 5.7 翻譯購物車頁（`src/app/cart/page.tsx`）：小計、結帳按鈕、空購物車提示
- [x] 5.8 翻譯帳戶頁（`src/app/account/AccountClient.tsx`）：訂單狀態標籤、預約狀態標籤、操作按鈕
- [x] 5.9 翻譯關於我們頁的茶園與製茶記錄相簿（`PhotoGallery.tsx`）：12 張照片的標題、描述、alt 改用翻譯 key

## 6. 驗證測試

### 6-A. Middleware 與基礎路由（最優先，task 1.4 完成後即測）

- [x] 6.1 訪問 `/` 顯示中文、訪問 `/en/` 顯示英文，語言切換按鈕在各頁面正確切換並保留路徑
- [x] 6.2 `/admin` 正常顯示且可登入，Admin 所有頁面操作正常，不受 locale middleware 影響
- [x] 6.3 確認 ECPay callback 路由不被攔截：`/api/ecpay/return` 與 `/api/ecpay/result` 回應正常（405 = POST-only，路由存在）
- [x] 6.4 所有 `/api/*` 路由正常（`/api/products/stock`、`/api/experience-sessions` 等），無 locale 前綴干擾

### 6-B. 登入 / 註冊 / 導向流程（中英文各測）

- [x] 6.5 （中）`/auth/login` 正常登入，登入後導向 `/account`
- [x] 6.6 （英）`/en/auth/login` 正常登入，登入後導向 `/en/account`
- [x] 6.7 （中）未登入訪問 `/account` → 自動跳轉 `/auth/login`，登入後回到 `/account`
- [x] 6.8 （英）未登入訪問 `/en/account` → 自動跳轉 `/en/auth/login`，登入後回到 `/en/account`
- [x] 6.9 （中/英）未登入訪問體驗預約頁 → 跳轉登入，登入後 redirect 回預約頁（含 `?redirect=` 參數驗證）

### 6-C. 商品購買流程（中英文各測）

- [x] 6.10 （中）商品列表 `/products` → 點入商品詳情 → 加入購物車 → 購物車 `/cart` 顯示正確
- [x] 6.11 （英）`/en/products` → 商品詳情 → 加入購物車 → `/en/cart` 顯示正確，文案為英文
- [x] 6.12 （中）`/cart` → 結帳 `/checkout`，填寫收件資料、套用折價券，提交後跳轉 ECPay 頁面
- [x] 6.13 （英）`/en/cart` → `/en/checkout`，相同流程，表單文案為英文
- [x] 6.14 （中/英）ECPay 付款成功後，`/order/result` 正確顯示訂單成功，訂單狀態在 `/account` 更新為已確認

### 6-D. 茶山體驗預約流程（中英文各測）

- [x] 6.15 （中）`/experiences` → 體驗詳情 `/experiences/[slug]` → 日曆選場次 → 預約頁 `/experiences/booking/[sessionId]`，表單填寫正常
- [x] 6.16 （英）`/en/experiences` → `/en/experiences/[slug]` → `/en/experiences/booking/[sessionId]`，表單文案為英文
- [x] 6.17 （中）預約頁使用點數折抵，確認折抵金額計算正確，送出後跳轉 ECPay
- [x] 6.18 （英）相同點數折抵流程，英文環境下數字與文案正確
- [x] 6.19 （中/英）ECPay 體驗付款成功後，`/account` 的預約記錄狀態更新為已確認
- [x] 6.20 （中/英）體驗額滿時加入候補流程正常，`/waitlist/[id]/confirm` 確認頁可正常訪問

### 6-E. 帳戶功能（中英文各測）

- [x] 6.21 （中）`/account` 各分頁正常：訂單記錄、體驗預約、點數餘額、折價券、候補記錄
- [x] 6.22 （英）`/en/account` 各分頁正常，所有狀態標籤（待付款、已確認、已完成等）顯示英文
- [x] 6.23 （中/英）從帳戶頁取消體驗預約，確認流程正常、退款比例顯示正確
- [x] 6.24 （中/英）補填參加者資料 `/account/bookings/[id]/participants` 頁面正常顯示與提交

### 6-F. 資訊頁面與其他

- [x] 6.25 （中/英）`/about`、`/process`、`/contact`、`/faq`、`/privacy`、`/return-policy` 各頁面正常顯示
- [x] 6.26 （中/英）`/contact` 聯絡表單可正常填寫並提交
- [x] 6.27 （中/英）404 頁面正常顯示，不因 locale 路由造成異常
