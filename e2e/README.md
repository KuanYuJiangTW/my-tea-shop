# e2e/ — 目前尚未接通，請勿當成可執行的測試

**狀態：骨架，跑不起來。** 這批 spec 在 `abae014`（會員點數系統）一次加入後未再變動，也從未實際執行過。

不要因為看到這個目錄就把 e2e 排進驗收計畫——2026-07 有一個 session 就是這樣被誤導的。要驗前端行為，現階段請自行在 scratchpad 安裝 playwright（見下方「臨時驗證」）。

## 為什麼跑不起來

1. **`package.json` 沒有 playwright 依賴**
   `@playwright/test` 與 `playwright` 都不在 dependencies／devDependencies，也沒有 `test:e2e` script。
   注意：CLAUDE.md 寫「瀏覽器已預裝、不要跑 playwright install」——那句只保證**瀏覽器 binary**（`/opt/pw-browsers`），不保證 npm 套件在 `node_modules`。

2. **路由對不上**
   spec 用 `page.goto("/login")`，但本專案沒有這個路由，實際是 `/auth/login`。

3. **選擇器對著不存在的 DOM 寫**
   `data-testid="product-card"`、`data-testid="add-to-cart"` 在 `src/` 裡出現在 **0 個檔案**。

4. **需要外部前置條件**
   每個 spec 都要登入 + 真實資料。`checkout-product.spec.ts` 的註解自己寫著「前置：需要 staging 環境 + 測試帳號有點數餘額」。相關環境變數 `E2E_BASE_URL`／`E2E_TEST_EMAIL`／`E2E_TEST_PASSWORD` 目前無人提供。

## 要真的接通，需要做這五件事（另立 change）

1. 補依賴：`@playwright/test` 進 devDependencies，並加 `test:e2e` script
2. 修路由：`/login` → `/auth/login`，其餘 `goto()` 目標逐一核對（`/admin/dashboard`、`/admin/orders` 等尚未查證）
3. 在元件加 `data-testid`：至少 `product-card`、`add-to-cart`，以及各 spec 引用到的其他選擇器
4. 備測試帳號與 staging 環境：測試帳號需有點數餘額；設定 `E2E_BASE_URL`／`E2E_TEST_EMAIL`／`E2E_TEST_PASSWORD`
5. 加 npm script 並接上 CI（Vercel 或 GitHub Actions）

這五件事有相依順序，1→2→3 可先做，4 需要店主提供環境，5 最後。

**建議的第一步**：先為 `/process` 寫一個 spec。它不需要登入、不碰資料庫，可以用來證明整條 harness 通了，再回頭處理結帳與點數那幾條高風險流程（那些才是最需要 e2e 覆蓋的地方）。

## 臨時驗證（在接通之前）

不要為了驗證就往 repo 的 `package.json` 加依賴。改在 scratchpad 開獨立 package：

```bash
cd "$SCRATCHPAD" && npm init -y
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install playwright
```

腳本裡用預裝瀏覽器：

```js
import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
```

兩個坑：

- **等待條件**不要用 `networkidle` 或裸 `waitForTimeout`——沙箱代理會擋掉字型與圖片，networkidle 可能在 React hydration 完成前就返回，導致假陰性。請等該狀態自己的 DOM 證據（`waitForSelector` 等到 aria 屬性或文字出現）。
- **收埠口**用 `fuser -k <port>/tcp`，不要用 `pkill -f "next start"`——`-f` 比對整個命令列，會把你自己的 shell 一起殺掉。
