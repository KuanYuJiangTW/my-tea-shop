# WORKLOG — session 工作狀態（context 壓縮與斷線的保險）

> 用法：大任務開工先照模板開一節；每完成一項就更新；session 重啟或發現前文被壓縮成摘要時，先讀最後一節再動工。
> 清理規則：超過 10 節時，把「已完成」的舊節各壓縮成一行結論（規則見 playbooks/maintenance.md）。

## 模板（複製這段開新節）
```
### [YYYY-MM-DD] 任務名
- 目標：一句話
- 驗收條件：
  - [ ] 可驗證的條件（不是「做好」而是「npm run test 全綠」這種）
- 待辦：
  - [ ] …
- 決策紀錄：重要決定一行一個（為什麼選 A 不選 B）
- 狀態：進行中 ／ 已完成（證據：指令輸出或 file:line）
```

---

---

### [已歸檔] 2026-07-05 ~ 08-02 的完成工作（12 節壓縮）

> 依 MAINT-4 各壓成一行結論。**完整原文在 git 歷史**（`git log -p .claude/WORKLOG.md`）
> 與備份 `.claude/backups/WORKLOG.md.20260806.bak`。多數決策細節另存於 `lessons.md`、
> 對應的 `openspec/specs/`、或程式碼檔頭註解。**仍有效的待辦已抽出到下一節**。

1. **[07-05] 建立制度檔案**（Fable 5 建制）— 13 檔制度檔上線，CLAUDE.md 改為路由。
   `.gitignore` 由整包忽略 `.claude/` 改為白名單制；路由表用純文字路徑不用 `@`（會 eager load）。
2. **[07-28] 資安修補（高風險項）** — SEC-001 後台 2FA 可完全繞過等 6 項修畢。
   決策：git 歷史清理暫緩（金鑰已輪換、repo 刻意公開當教材）；
   `validate_admin_session` **刻意保留 anon 權限**——Edge middleware 需要它，收掉會導致後台完全登不進去。
3. **[07-28] 資安清尾（M-3 ＋ L 級 7 項）** — 全數結案。**三個「刻意不做」**：
   L-1 不跑 `npm audit fix`（`--force` 會把 Next 降到 9.3.3，不加 force 則改 328 套件修 0 漏洞）；
   L-4 保留 CSP `unsafe-inline`（有 nonce 時瀏覽器會忽略它，
   且**不可照 `openspec/specs/csp-nonce/spec.md` 補 `strict-dynamic`**——會讓 host 白名單失效、GA 與 Cloudflare Insights 掛掉）；
   L-3 PII 到期清除待保單要求釐清（個資法查證結果存於 `src/lib/pii.ts` 檔頭）。
4. **[07-29] session 教訓固化成 hook / command / skill** — `guard-commands.js`（26 案例測試全過）、
   `/verify` command、`reverse-verify` skill。決策：**hook 不是安全邊界，是防手滑的護欄**；
   攔截型 hook 必須先剝離 heredoc 與引號內容再比對，否則會擋住「提到該指令」的正常操作。
5. **[07-29~30] 製茶過程頁多茶款擴充** — `/process` 由單一烏龍擴充為 5 款茶，
   核心敘事＝**炒菁的位置**（最前＝烏龍／無＝紅茶／最後＝紅烏龍）。順手修好 `npm run lint`（補 `eslint.config.mjs`）。
   自承 8 個錯誤，最嚴重是誤讀規格刪掉 6 步店主已確認的溫度時數，**還寫測試把違規釘成正確**。
6. **[07-31] 製茶文案店主二次校對** — 依茶改場資料逐條更正 6 處事實（採摘基準、日光萎凋厚薄、揉捻時間等），
   **不得再由推論改回**。兩條教訓：共通段文案只要出現茶類名稱，就要回頭檢查五款茶是否都成立；
   **不可對 `overflow-x-auto` 容器直接下 `justify-center`**（溢出的左半邊會捲不到），要內層 `w-max mx-auto`。
7. **[08-01] 三個 stacked PR 合併上線** — main `d2fa997` → `5cb9808`。
   **坑**：合併前一個 PR 之後，後續 PR 的 base **不會**自動 retarget，
   必須先手動把 base 改成 main 再合，否則會併進錯的分支、根本上不了線。
8. **[08-01] 超商店到店可用性核實** — OK 超商全面移除（綠界伺服器端回「暫停服務」，正式金鑰實測 8 次），
   可用性收斂到 `src/lib/cvs.ts` 單一事實來源。
   恢復判定：重打電子地圖 API，回應不再是「暫停服務」即可，加回成本是一行。
9. **[08-01] 取消訂單的優惠還原修正** — 兩個真 bug（會員自助取消只退 1% 點數、通用碼永不還原）。
   **核心原則：退還依據是帳本，不是訂單欄位**（`refundOrderPoints` ＝ 已扣 − 已退，順帶帶來冪等性）。
   我的初修依 `points_used` 退是錯的，被線上資料（`points_used=3300` 但帳本只扣 33）推翻後更正。
10. **[08-01] 茶山體驗結帳與取消的點數稽核** — 三個真 bug（取消退點基準、可重複扣點、規格全面過時）。
    **我一度誤判舊制的災難情境並寫進四個地方，被稽核 SQL 的線上實據推翻後全面更正**——實際無真實客人受影響。
11. **[08-01] 體驗預約結案的三項結構性修補** — 逾期取消 cron、待退款對帳提醒、`refundPoints` 補 `expires_at`。
    順帶抓到第四個 bug（場次因人數不足自動取消時完全沒退點）——**漏掉的東西 grep 不到**。
12. **[08-01~02] 風土數位報價頁 v1＋v2** — `/web-design` 與 `/web-design/case` 上線。
    **文案紅線：不得出現編造的客戶成效數字**（公平交易法第 21 條）。
    `web_inquiries` enable RLS 但不建任何 policy，一律走 API route ＋ service_role。

---

### 跨節未結案事項（自已歸檔各節抽出，仍然有效）

- **Supabase Auth 的 preview redirect 白名單未設定** — Vercel preview 上的 Google 登入與 Magic Link
  會被導回正式站。要加 `https://my-tea-shop-git-*-jiangkuanyus-projects.vercel.app/**`。
  程式碼本身正確；**密碼登入不受影響**，preview 要測登入狀態請用密碼登入
- **`tasks.md` 0.5.5**：全 repo 既有 lint error 的批次 B／C 未清（批次 A 已於 PR #3 清償），清冊在 `tasks.md`
- **`tasks.md` 0.5.6**：e2e 要真正接通需五步，現況見 `e2e/README.md`
- **通用碼 `max_uses` 額度虛胖** — 貨到付款改為支援通用碼後會一起消耗，有在跑的活動碼要回頭確認數字
- **`experience_bookings.points_used` 與帳本永久相差 100 倍**（新制 migration 漏了這張表）。
  刻意不 backfill——歷史記錄改寫的風險大於好處，退還一律以帳本為準，該欄只是顯示用快照
- **體驗預約的現金退款仍是純人工** — 取消只寫 `refund_status = "pending"`，實際退錢要人去綠界後台操作，
  再回後台 PATCH 成 `processed`；沒有對帳機制（僅有超過 3 天的摘要提醒信）
- **風土數位待小江**：LINE 圖文選單補上案例頁與 `#faq` 兩格連結；提供 GA 數據以填案例頁成長數字
- **環境限制**：本容器網路政策擋掉 `*.vercel.app` 與 `taiwantea.store`（proxy 回 403），
  agent 無法抽查線上頁面，要驗頁面內容請用本機 `npm run build && npm start` 打 localhost
- **next-intl 把整份 `messages/*.json` 序列化進每一頁 HTML**（每頁 70–110KB），
  全站既有行為、不影響正確性，日後若要優化可考慮 messages 分割


### [2026-08-03] 設計系統地基：字體收斂 ＋ 品牌灌入語意 token
- 目標：小江要「一進站就有質感」。第零階段（Fable Max 產出的產品認識報告）已完成，
  本節記錄**查證修正**與**三個拍板**，並執行第一波地基工程（字體＋色彩語意層）
- **前情提要：Fable 的探索紀錄不在 main 上**。commit `2da8c59` 只存在於
  `origin/claude/design-system-discovery-884sfs`，本節即取代該紀錄（內容已整合並修正）

#### 對第零階段報告的查證結果
屬實、照單全收：色彩雙軌不相通（`globals.css:57-88` 全 `oklch(x 0 0)`，含 chart 色）／
深色模式是未啟用 scaffold（無 `darkMode` 鍵、無 ThemeProvider）／favicon 不存在／
Email 內聯 hex（`src/lib/email.ts:107-109`）／border-beam 前台零使用／
積分程式碼現值（`points.ts:72` `MIN_POINTS_USE = 10`，rate 0.02–0.04、上限 0.10–0.20）

**四處修正**：
1. **openspec 規格沒有過時，過時的只有 `tasks.md:26`**。
   `openspec/specs/coupon-and-points/spec.md` 已寫「最低使用 10 點」「倍數限制已取消」
   並引用 `points.ts` 為單一真相。此條必須更正——CLAUDE.md 鐵律 4 要求動高風險功能前
   先讀 openspec，若沿用「規格也過時」的結論會養成繞過規格的習慣，屬制度層損害
2. `Header.tsx:121` 的 `border-[#EDE8DC]` 引用錯誤（該行是 /account 連結；Header 為 271 行
   非 274）。該 class 實際集中在 admin，前台對應處是 `AccountClient.tsx:109` 的 `bg-[#EDE8DC]`
3. 「業務元件 0 處 `dark:`」→ 業務元件確實 0 處，但全站有 13 處，全在 `components/ui/`
   的 button/select（shadcn 原生自帶，而其 dark token 恰好是灰的）
4. **硬編碼 hex 的規模與分布是最大漏測**：全站 777 處 `[#xxxxxx]`，
   **admin 佔 746 處（96%）**，前台僅 31 處（另有 173 處品牌色盤外的 Tailwind 色）。
   → 重災區是後台不是前台，且「前後台同源」原則的成本 96% 落在後台

#### 拍板（小江已確認）
- **三條設計原則成立**，第 3 條補一句：**token 必須平台無關**——設計決策存在 CSS 變數層
  （`--radius-card`），元件只引用語意名。理由：`--radius-card: 16px` 可導成 React Native
  theme，`rounded-2xl` 一行帶不走。現在做是改名字，App 開案再做是重寫全站
- **預設淺色，且深色模式現在不做，只留欄位**。現況 0 個業務元件支援 `dark:`，實作等於
  全站再走一遍；真實需求只有「後台清晨看單」。深色欄位成本近 0 先填，實作綁後台重構那波
- **門面五件換掉 ChatWidget**：它是覆蓋層、不在轉換路徑、611 行改動成本最高、投報率最差。
  換成**付款轉跳與 `/order/result` 的等待／過渡狀態**——客人剛付完錢最焦慮的 3 秒，
  目前是沒設計過的白畫面
- **報告的最大缺口：全篇只談顏色與字體，沒有非顏色 token**。但質感八成來自間距節奏、
  字級比例、陰影克制、動態曲線。現況 `--radius` 定義了沒人用、陰影用 Tailwind 預設、
  動態寫死 `duration-500`。此軸另開任務（見待辦）

#### 本波發現的線上缺陷（對比度實測）
用 WCAG 公式實算 tea 色階，**主 CTA 不符 AA**：
| 組合 | 對比 | 判定 |
|---|---|---|
| 白字 on `tea-green #7D9B84`（首頁主 CTA `page.tsx:123`） | **3.05** | ❌ 內文不合格 |
| 白字 on `tea-green-dark #5C7A67` | 4.74 | ✅ |
| `text-tea-green` on cream（「查看全部」連結） | **2.85** | ❌ |
| `text-tea-text-light` on cream（次要內文，全站大量） | **3.43** | ❌ |

→ 解法：**新增兩色，不改動既有色階**（既有 `tea-*` 值全部保留，視覺零位移）：
- `tea-green-ink #58745F`：AA 安全的互動綠（連結／圖示／按鈕底），四種淺底皆 ≥4.54
- `tea-text-muted #637169`：低彩度次要文字色，四種淺底皆 ≥4.52。
  彩度 0.0214 vs green-ink 的 0.0476，明顯較灰，不會被誤讀為連結
- 語意 token 一律指向這兩色；既有 39 個檔案的 `tea-green`／`tea-text-light` 遷移另開一波

- 驗收條件：
  - [x] `next/font` 收斂：移除 `globals.css:1` 的 Google Fonts CDN `@import`，
        解決 `layout.tsx:14`（Geist）與 `globals.css:55`（Noto Sans TC）對 `--font-sans` 的雙重定義
  - [x] `tea-*` 灌進 shadcn 語意層（primary/secondary/muted/accent/border/ring/chart-*），
        深色欄位填但不啟用 `darkMode`
  - [x] `/verify` 三件套全過（測試＋型別＋build）
  - [x] 瀏覽器實跑驗證（見下方證據）

#### 實跑證據（dev server + DOM 查詢，非推論）
- `--font-latin` = `Geist, Geist Fallback`／`--font-sans` = `Noto Sans TC, Noto Sans TC Fallback`／
  `--font-serif` = `Noto Serif TC, Noto Serif TC Fallback`——三支各自獨立，雙重定義已解除
- **殘留 Google Fonts 連線：0**（`document.querySelectorAll('link')` 過濾 googleapis/gstatic 為空陣列）
- sans 鏈實測：`Geist → Geist Fallback → Noto Sans TC → Noto Sans TC Fallback → sans-serif`，
  拉丁走 Geist、中文回退 Noto——與改動前的視覺結果一致，但現在是明確宣告而非碰巧
- 已載入字重：Sans 400/500/600/700、Serif 400/600/700。**600 有了**（先前假造）、**300 已無**（先前白載）
- 產出 CSS 含 749 個 `unicode-range` 宣告、涵蓋 U+4E00–U+9FFF，中文字符確實自架成功
- next/font 額外產出 `Noto Sans TC Fallback` size-adjust 字型 → 順帶降低 CLS
- 建置成本：70 秒、218 個 woff2、11MB（瀏覽器只抓命中 unicode-range 的分片，不影響使用者）

#### 一個必須誠實說明的落差
`components/ui/button.tsx` 與 `select.tsx` **全站零引用**（grep import 無結果），
業務元件也 0 處使用語意 token，bare `border` 僅 1 處。
→ **語意層改動目前的可見變化幾乎只有 body 底色（白 → 米白 #FAF7F2），
其餘是純地基、沒有立即視覺回報**。價值在於後續元件遷移時有正確且合規的落點，
不該把這一步當成「視覺升級」向使用者邀功。真正的視覺回報在下一波遷移
- 待辦（本波不做，已排隊）：
  - [x] 非顏色 token 軸（radius/shadow/space/motion）→ 見下方「第二波」
  - [x] favicon 與 app icon → 見「第五波」
  - [x] `docs/design-system.md` ＋ 修 `tasks.md:26` 積分敘述（openspec 不動）→ 見「第三波」
  - [x] ~~既有 39 檔的 AA 遷移~~ → 第四波做完，**第六波依小江決定全數回退**，改列為已知取捨
  - [x] 後台 746 處 hex 收斂 → 見「第七波」，746 → 28（-96%）
  - [x] **WORKLOG 精簡** → 2026-08-06 完成，610 行 14 節 → 302 行 4 節
- **邊界：本波只動前台與 token 層，後台 746 處 hex 不碰**。量體是前台 24 倍，
  且後台是茶農家庭每天在用的工作台，風險模式不同，混做會失控
- 狀態：本波已完成（證據：536 測試全過（40 檔）、`tsc --noEmit` 零錯誤、`npm run build` 成功、
  dev server 實跑 DOM 查詢確認字型鏈與 token 值如預期、Google Fonts 殘留連線為 0）。
  commit `6951084`，已推 `origin/claude/design-system-foundation`

**第二波（2026-08-03）：非顏色 token 軸**（commit `665ff90`）
- 命名由現況反推而非發明：先統計全站用法再替隱性慣例取名
  | 軸 | 現況分布 | token |
  |---|---|---|
  | 圓角 | lg 100／xl 149／2xl 120／3xl 9／full 187 | `--radius-inline/control/card/showcase/pill` |
  | 陰影 | sm 68／md 13／lg 10／xl 11 | `--shadow-resting/raised/float/modal` |
  | 動態 | duration 150/200/300/500；transition-colors 167 處 | `--motion-fast/base/slow/reveal` ＋ `--ease-standard/exit` |
  | 間距 | `py-16 md:py-24` 15 處／p-6 47／p-8 35 | `--space-section/-lg/card/card-lg/gutter` |
- **陰影改用茶墨色 `rgb(61 74 66)` 取代 Tailwind 預設純黑**。純黑壓在米白上會透出灰調，
  暖色陰影才不會讓米白顯髒——這是「看起來貴」與「看起來預設」的實際差別
- 首頁作為參考實作（圓角值與原本完全相同，1rem = rounded-2xl，唯一視覺變化是陰影色）

**順帶修掉的三個既有問題**
1. **`.no-scrollbar` 實際不存在**：原本用 `@utility` 宣告（Tailwind 4 語法），但本專案是
   Tailwind **3.4.19**，該語法不生成任何 CSS。`ChatWidget.tsx:565` 的橫向捲軸一直是露出來的。
   已改回 `@layer utilities`（postcss 未裝 nesting plugin，故 `::-webkit-scrollbar` 寫平選擇器）
2. **boxShadow 不可用 `card` 當 key**：`card` 已是 colors 的 key，同名會產出兩條 `.shadow-card`
   （陰影＋陰影顏色），後者在後會覆寫 `--tw-shadow`。目前碰巧仍成立但屬巧合，已改名 `resting`
3. **新增 `prefers-reduced-motion` 支援**：動態走 CSS 變數，改寫變數即可全站收斂

**同時發現、未處理（影響為零，故不動）**
- `globals.css` 裡的 `@theme inline`／`@custom-variant`／`@utility` 全是 Tailwind 4 語法，
  在 v3 下不生成任何東西，並原樣漏進產物 CSS（`@utility` 165 次、`@custom-variant` 27 次、
  `@theme` 6 次）。`tw-animate-css` 整包同理
- 影響為零的原因：這些 class 只被 `components/ui/select.tsx` 使用，而該檔**全站零引用**。
  專案自己用的 `animate-spin/bounce/pulse` 是 v3 內建、正常運作
- 要清理需連帶處理未使用的 shadcn 元件與 `tw-animate-css` 相依，屬獨立的死碼清除任務

**方法論教訓（已記 lessons）**：驗證 Tailwind 產物時我先用 `npx tailwindcss -c tailwind.config.ts`
跑了三次 probe 都「查無 utility」，一度以為 token 沒生效。實際是 **CLI 根本沒讀 TS config**——
用既有的 `bg-tea-green`（線上明明有效）當對照組才發現，先前三次全是無效測試。
Tailwind 產物一律以 `npm run build` 為準

- 驗證：536 測試全過（40 檔）、`tsc --noEmit` 零錯誤、`npm run build` 成功；
  dev server 實跑確認卡片圓角 16px、陰影為 `rgba(61,74,66,…)` 而非純黑、
  `transitionDuration` 0.2s、`ease` 為 `cubic-bezier(0.2,0,0,1)`、`no-scrollbar` 的
  `scrollbarWidth` 已回傳 `none`

**第三波（2026-08-04）：`docs/design-system.md` ＋ 修 `tasks.md`**（commit `f26ecf9`）
- 文件涵蓋：三條原則（含 token 平台無關的硬性條件）／色彩兩層對照／對比度基準與
  **已知不合格清單**／字體來源與可用字重／非顏色四軸／外包交付規格／施工邊界／待遷移清單
- **最實用的一節是「給生成工具的約束」**：附可直接貼的 prompt，明訂只出三色相階調、
  圓角限四階、陰影限茶墨色、對比 ≥4.5、**不要輸出程式碼**。
  這是把「用 Codex 做視覺」這件事變安全的關鍵——交付物換成圖與說明，不是 code
- `tasks.md` 修兩處：L26（200 點／100 倍數／10% → 10 點／無倍數／依等級 10-15-20%）
  與 L34（移除已不存在的「倍數」驗證項）。**openspec 規格未動**，它本來就是最新的
- 文件數字已逐條複查：hex 746/31、版面慣例 54/29、tea 十二色、utility key 全在 config、
  `select.tsx` 零引用、`border-beam` 前台無使用、所有引用路徑存在
- 本次僅動 markdown，無程式碼改動故未跑 `/verify`（證據為上述存在性複查）

**待使用者拍板**：是否把 `docs/design-system.md` 加進 `CLAUDE.md` 的路由表
（情境「要動視覺／介面」）。依 MAINT-1，改 `CLAUDE.md` 要先問使用者。
不加的話，未來 session 不會知道有這份文件——文件沒人讀等於沒寫。

**第四波（2026-08-04）：AA 遷移**（commit `e9971a6`）
- 三種線上不合格組合已修：`bg-tea-green+白字` 3.05（含首頁主 CTA）、`text-tea-green` 於米白 2.85、
  `text-tea-text-light` 內文 3.43
- 新增 `tea-green-deep #4D6954` 作 hover 態——舊的 `green-dark #5C7A67` 比 `green-ink #58745F`
  **還亮**，沿用會讓 hover 反向變亮
- **深色底方向相反**：淺底改深、深底改亮。`bg-tea-text` 內的標籤 → `green-light`；
  深色區再疊半透明卡片的（合成底 `#47534C`）→ `cream-light`，因為 `green-light` 在那裡只有 4.04
- 裝飾用 `bg-tea-green`（分隔線、圓點）**保留原色 40 處**——不承載文字就不是可存取性問題，
  改了只會讓品牌的淺綠消失

**驗證工具：`docs/contrast-audit.js`**（本波新建，後台那波會再用）
瀏覽器端稽核器，會**合成半透明圖層**後計算真實對比——比 grep 原始碼可靠得多。
成效：首頁 33→0、`/about` 6→0、`/products` 0、`/experiences` 0。
**已知限制**：絕對定位的覆蓋層抓不到（Hero 那種「照片＋遮罩＋文字」結構，遮罩是文字的
*兄弟*節點不是祖先，會穿透到 body 誤判）。首頁那 5 筆低對比即為此類假陽性，實際正常。

**方法論**：這次是「先全域替換、再用實測稽核抓回歸」，不是逐檔人工判斷。
關鍵在於稽核器對深色底的回歸一定抓得到（`#637169` 壓在 `#3D4A42` 上只有 1.9），
所以大膽改、再用證據收斂，比小心翼翼逐處判斷更快也更可靠。

**踩到的坑**（已記 lessons）：`perl -pi` 就地改檔的 unlink+rename 空窗被 Tailwind 撞上，
錯誤被寫進 `.next` 快取，導致 dev server 重啟後仍 500。`rm -rf .next` 即解。
一度誤以為檔案被刪，實際一個都沒少。

**使用者回報待處理**：小江說已把 Hero 遮罩調成偏好的顏色（原本太亮），但該改動
**不在本工作區**（`page.tsx:103` 仍是 `bg-tea-text/55`，`git diff` 為空，瀏覽器渲染值也相同）。
需向小江取得實際值後再落進 repo。

- 驗證：536 測試全過（40 檔）、`tsc --noEmit` 零錯誤、`npm run build` 成功

**第五波（2026-08-06）：favicon 與 app icon**（commit `36a1449`）
- 正式站先前**完全沒有** favicon（`/favicon.ico` 回 404）。補齊三件：
  `favicon.ico`（16/32/48 三尺寸）、`icon.svg`（現代瀏覽器）、`apple-icon.tsx`（iOS 180×180）
- **設計決策：不是 Header logo 的等比縮小版**。Header 那顆（`Header.tsx:63-79`）雙層綠＋
  三條 1.5px 莖線，16px 下糊成一團，且淺色葉子在淺色分頁列上幾乎看不見。
  改為深色 chip `#3D4A42` ＋ 單層淺綠葉 `#C8DDD0`（對比 6.52）＋ 一條中脈
- **中脈寬度是實測出來的，不是估的**：初版 1.8（32 viewBox）在 16px 被抗鋸齒吃掉，
  加粗到 2.6 才在 16/32/64/180 全部可辨。葉形也放大（原本只佔 23% 面積）。
  方法：把 SVG 光柵化到各尺寸後掃描像素，檢查葉子中段是否存在深色斷點
- `favicon.ico` 產法：用 `sharp`（Next.js 內建相依，不需另裝）**逐尺寸原生渲染**
  再手工組 ICO 容器（ICONDIR + ICONDIRENTRY + 內嵌 PNG）。
  從大圖降採樣會讓 16px 糊掉，所以用 `density` 控制每個尺寸各自渲染
- 驗證：ICO 容器解析正常（type=1、count=3）、三尺寸皆可解碼且與目錄記載相符、
  每張都含深底與淺葉像素；dev server 實測三個路徑皆 200 且 content-type 正確、
  Next.js link tag 齊全；`apple-icon` 透明度 0%（滿版方形，iOS 會自己套圓角，
  自帶圓角會被切成雙層弧線）
- 資產說明已寫進 `docs/design-system.md` 的「品牌識別資產」一節，含重新產生的方法

**仍待小江提供**：Hero 遮罩的實際值。小江表示已調整成偏好的顏色（原本太亮不夠有質感），
但改動不在本工作區——`page.tsx:103` 仍是 `bg-tea-text/55`，`git diff` 為空，
瀏覽器渲染值也是 `rgba(61, 74, 66, 0.55)`。取得值後要用 `docs/contrast-audit.js`
複驗 Hero 上那五段米色文字在新遮罩下的對比。

**第六波（2026-08-06）：顏色回退到 Production**
- 小江看了 preview 後判斷「顏色變得有點深色」，決定把顏色調回 Production 現狀。**這個判斷是對的**：
  AA 遷移時我一刀切——連只需 3.0 門檻的圖示、大字、裝飾也一起改深，屬過度矯正；
  另外 `text-muted` 為避免被誤讀為連結而把彩度由 0.047 砍到 0.021，副作用是次要文字整體變灰。
  「變深＋變灰」疊加就是他感受到的沉
- 前置查證：`origin/main` 在分岔後**零新 commit**，故 Production ＝ 本分支改動前的狀態，基準明確。
  另確認 Production 的 Hero 遮罩也是 `bg-tea-text/55`——小江調整過的那版**不在 git 任何地方**
- 執行：`git revert e9971a6`（非手工改回）。好處是歷史留著，日後若要「亮度回收版」
  （按鈕用 `green-dark` 4.74、圖示與 ≥24px 大字保留 `tea-green` 走 3.0 門檻），
  revert 那個 revert 即可重新套用 39 檔的替換再調亮
- 另把 `--background` 由 cream-light `#FAF7F2` 改回純白（與 Production 一致）
- **保留未動**：字體收斂、favicon 三件套、非顏色 token（圓角／陰影／間距／動態）、
  語意 token 基礎、`design-system.md`、`contrast-audit.js`。這些與「變深」無關，是地基
- `tea-green-ink` 與 `tea-text-muted` 兩色**保留在色盤中**，作為日後需要合規時的落點
- 文件處置：`design-system.md` 2.3 節把三組對比由「已知不合格、待遷移」改記為
  **「業主拍板的已知取捨，不列入待辦」**，數據與合規落點保留，並明寫「請勿再自行修正」
- 驗證：536 測試全過（40 檔）、`tsc --noEmit` 零錯誤、`build` 成功；
  **逐色比對 27 種 `tea-*` 類名的出現次數與 `origin/main` 完全相同**；
  瀏覽器實測 body `#FFFFFF`、主 CTA `#7D9B84`、次要內文 `#6B8872` 皆回到 Production，
  而 `rounded-pill`(9999px) 與 `shadow-resting` 仍生效

**第七波（2026-08-06）：後台 hex 收斂 746 → 28**（`61f629f`、`0b61c15`）
- 第一階段 628 處：11 種與色盤完全相同 ＋ 5 種色差 ΔEok<0.011（肉眼不可辨）的近似色
- 第二階段 83 處：新增 `tea-text-faint #9CA89E`（第三層文字色，空狀態與載入提示，65 處）
  與 `status-{idle,info,warn,danger,done}` ＋ 各自 `-soft` 底色（10 個 token）
- **狀態色刻意不放進 `tea-*`**：狀態需與品牌色可區辨，混進去會讓「這個綠是品牌還是狀態」
  變成每次都要重想的問題。成對使用 `bg-status-warn-soft text-status-warn`
- **目標值一律映射回原始色階**（`#7D9B84`→`tea-green` 而非 `green-ink`），與第六波回退一致
- 驗證方式值得沿用：**從建置產物 CSS 讀出每個 class 的實際 rgb，與原始 hex 逐位元比對**——
  全同即證明是恆等變換，顏色不可能改變。這比「看起來一樣」強得多
- 剩餘 28 處為深綠系與色差 0.02–0.05 的近似色，**刻意不動**（改了就是真的改視覺）
- **踩到的坑**：正則跳脫掉了變成字元類別，26 檔全毀（`RevenueChart`→`Revenuetea-cream-darkhart`）。
  救命的是事前盤點數字（預期 746、實際 12539）。已升格為 JUDG-8

**順帶修掉的顯示 bug**（`a7d2bb5`、`731046e`）
- 三個檔案各自複製狀態對照表且都少鍵，舊寫法 `MAP[s] ?? MAP.new` 讓未涵蓋的狀態
  **偽裝成別的狀態且毫無痕跡**：`stock_issue`／`failed` 顯示成「新訂單」、
  已完課預約顯示成「待付款」。dashboard 的近期預約沒有狀態過濾，是每天第一眼看到的畫面
- 新增 `src/lib/admin-status.ts` 單一事實來源；刪掉從未被直接命中的死鍵 `BOOKING_STATUS.pending`
  （**三個錯剛好讓兩個看起來是對的**）；fallback 改為顯示原始值
- 前台 `AccountClient` 同一問題但更嚴重：`stock_issue`（**已付款**但缺貨）顯示「待付款」，
  客人可能以為沒付成功而再付一次。小江拍板：`stock_issue`→「處理中」（沿用既有 i18n 鍵
  `orderStatus.processing`，零新增字串）、`failed`→維持「待付款」。
  **fallback 一併改為「處理中」——在不確定時告訴客人「你還欠錢」是最糟的猜法**
- 回歸測試 15 條，其中一條**掃描原始碼**找出所有實際寫入的狀態值再比對鍵覆蓋率，
  未來新增狀態卻忘了補表會變紅。反向驗證 3 次如預期變紅

**第八波（2026-08-06）：制度檔精簡**（`6d2885f`、`2ace2f9`）
- WORKLOG 610 行 14 節 → 302 行 4 節；lessons 36 條 → 17 條
- **新增 JUDG-8「證據要有鑑別力（沒報錯 ≠ 有做到）」**——本週三次事故
  （python 空殼靜默失敗、正則毀 26 檔、class 搬到 `src/lib` 後 Tailwind 掃不到）
  加上七月的假驗證，根因全是同一個：證據分不出成功與失敗
- 精簡時順帶抓到：先前三處待辦勾選用 python 改檔**全部靜默失敗**，
  WORKLOG 對後續 session 一直顯示錯誤的完成狀態

**第九波（2026-08-06）：字級尺度與首頁節奏**（`20690e0`、`357e320`）
- 診斷：前台 `text-xs` 210 ＋ `text-sm` 345 ＝ 555 處小字，而 `text-base` 只有 14 處。
  **四十年的故事用後台的字級在講。** 這是啞鈴分布不是尺度
- 新增四階內文 token：`caption 12/1.6`、`label 14/1.55`、`body 16/1.8`、`body-lg 18/1.85`。
  **行高刻意比 Tailwind 預設寬**——預設 1.5 對中文太緊，CJK 舒適區 1.7–1.9，
  放寬行高的效果不亞於放大字級
- 套用採三分法**不是全部放大**：敘事型升級（品牌故事 14→18px、預約須知依原則 2 升級）／
  介面標籤維持 14px／真 metadata 維持 12px（eyebrow 小標籤是節奏標記不是閱讀內容，放大會破壞層次）
- 首頁節奏：原本 5 段全是 `py-16 md:py-24`，**均勻等於沒有節奏**。
  新增 `--space-section-xl: 8rem`，慢段（品茶哲學、品牌故事）與快段交替 →
  桌機 128/96/96/128/96、行動 96/64/64/96/64
- 驗證：桌機與行動皆零溢出零裁切；商品卡 5 張**全部 632px 等高**（`line-clamp-2` 鎖住高度）、
  體驗卡每列內部等高
- **刻意沒做**：把茶山體驗的卡片牆換成滿版照片斷點。那會移除三張體驗卡＝預約轉換入口，
  屬商業決策不是設計決策，留給小江拍板

**環境事實（`53706f7`）**：Avast 攔截 HTTPS，`preview_start` 的子行程拿不到
`NODE_EXTRA_CA_CERTS` → 連 Supabase 失敗 → 頁面顯示「共 0 款茶品」，**看起來像沒資料其實是連不上**。
判別法：直接 `node` fetch 得通但 dev server 不通 → 環境變數繼承問題，不是網路也不是 RLS。
解法在 `.claude/launch.json`（已 gitignore）用 `--use-system-ca`。已入 diagnosis.md 環境事實表。

**第十波（2026-08-06）：淺底收斂成兩層**
- 診斷確認：`cream #F5F0E8`／`cream-light #FAF7F2`／`white` 三層彼此只差 2%，視覺上同一片
- 執行：全站 101 處 `bg-tea-cream-light` → `bg-tea-cream`（34 檔）。
  `cream-light` 不從色盤移除，**改當深底上的文字色**（`text-tea-cream-light` 13 處：
  Hero 大標、Footer、深色 CTA 段），角色從「背景層」變成「深底文字」，定義反而更乾淨
- **一開始的方向是錯的，被實測推翻**：原本想讓 section 交替 cream/white 來強化第九波的節奏。
  改完掃描發現首頁「本季精選」段改白底後，**三張商品卡（`bg-white`）全部同色壓同色**——
  卡片牆等於消失。修正後的原則是**層次由「有沒有卡片」決定，不是由「要不要交替」決定**：
  有卡片的段用 cream 讓白卡浮起來，純敘事段用 white。節奏交給間距 token，背景只管層次
- 依此原則順帶補上四處**既有**的白壓白（不是這波造成的，但同一個病）：
  `/products` 與 `/experiences` 的卡片牆頁底、`/about` 理念卡段、`/process` 兩段
- 新增的驗證器值得沿用：**掃出「不透明背景 == 最近的不透明祖先背景」且像卡片的元素**。
  這比肉眼看可靠——2% 的色差人眼分不出來，但它分得出來。九個前台頁掃到零殘留
  （`/process` 製程卡區剩 2 處，該區用米色系當色票，改底色會與卡片衝突，留待專門處理）
- **對比零退步的證據**：`git stash` 前後各跑一次 `contrast-audit.js`，
  首頁「檢查 182 節點／不合格 111／疊圖片 6」**改前改後完全相同**。
  111 項全是第六波拍板的已知取捨（`tea-green`／`tea-text-light`），沒有任何項目從合格掉到不合格
- **踩到的坑**：PowerShell 的 `Get-ChildItem`／`Get-Content` 會把路徑裡的 `[]`
  當萬用字元，`[slug]`／`[id]` 那 8 個檔**整批被靜默跳過**（只在 stderr 留下看似無害的
  「does not exist, or has been filtered」）。救命的還是事前盤點：預期 101、實得 88。
  修法是全部改用 `-LiteralPath`。同一個迴圈若 `$c` 為 null 還會把檔案寫成空的——
  已加 `if ($null -eq $c) { throw }` 守衛。已入 lessons.md
- 順帶修正 `design-system.md` 的文件漂移：`--background` 記載為 cream-light，
  但第六波已改回純白（瀏覽器實測 `lab(100 0 0)`）
- 驗證：551 測試全過（42 檔）、`tsc` 零錯誤、build 成功

---

### 下一個 session 從這裡接手

**目前狀態**：分支 `claude/design-system-foundation`，與 origin 同步，工作區乾淨。
551 測試全過（42 檔）、`tsc` 零錯誤、build 成功。**尚未開 PR、未動 main**（小江未要求）。

**排隊中的工作**（依建議順序）：
1. **門面四件打磨** ← 建議下一項（ProductCard 360／ExperienceCalendar 272／Header 271／
   `/order/result` 328）。字級（第九波）與淺底（第十波）都已定案，可以動了。
   一併處理第十波留下的三個小尾巴：`/process` 製程卡區 2 處白壓白（該區用米色系當色票，
   要連卡片配色一起重想）、`/contact` 的 input 是純 `bg-white` 而其他頁是 `bg-tea-cream/50`（不一致）
2. CheckoutClient 打磨（1210 行、金流頁，**獨立排**，依鐵律 4 先讀 openspec ＋ 改完必跑測試）
3. Email 樣板脫離內聯 hex（`src/lib/email.ts` 1550 行、492 處 hex、32 種色值，
   已漂移：混入非品牌色、大小寫不一致、`#E8E0D2` vs `#E8E0D4` 疑似手誤）
4. 綠色降密度（`tea-green` 系列 621 處 vs `tea-cream` 現已 130+ 處，綠色仍被當成預設色用）——
   數百個主觀判斷，排最後；前面做完後對品牌的感覺可能改變

**待小江提供／拍板**：
- **Hero 遮罩的實際值**。小江表示調整過（原本太亮），但改動不在 git 任何地方——
  `page.tsx:103` 與 `origin/main` 都是 `bg-tea-text/55`，瀏覽器渲染值也相同
- 是否把 `docs/design-system.md` 加進 `CLAUDE.md` 路由表（改 CLAUDE.md 依 MAINT-1 要先問）
- 茶山體驗卡片牆要不要改成滿版照片斷點（移除轉換入口，商業決策）

**必讀**：`docs/design-system.md`（三條設計原則、token 表、**已知取捨：AA 三組對比是業主拍板
的取捨不是待修缺陷，請勿自行「修正」**）、`docs/contrast-audit.js`（對比稽核器，後台遷移用過）
