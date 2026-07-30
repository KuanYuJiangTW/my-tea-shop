# 任務：清償既有 lint 債

基準：修好 `npm run lint` 後全 repo 共 **22 個 error（13 檔）＋ 42 warnings**。

## 批次 C｜前台元件（已完成，2026-07-30）

- [x] C.1 `ProductLightbox.tsx` — `react-hooks/use-memo` ×3
  - 原本 `useCallback(onPrev, [onPrev])` ×3：以自己為唯一依賴，回傳的就是原函式，memo 完全不生效
  - 改為直接用 prop 當依賴，移除三個無用 hook 與 `useCallback` import
- [x] C.2 `Header.tsx` — `react-hooks/set-state-in-effect` ×1
  - 原本 `useState(false)` + `useEffect(() => setMounted(true), [])`，用來避開購物車數量的 hydration 不一致
  - 根因在 `CartContext` 的 `useState(loadFromStorage)`：SSR 回 `[]`、client 首次 render 可能有值。`CartContext` 屬批次 A，本批不動
  - 改為新增 `src/hooks/useHasHydrated.ts`（`useSyncExternalStore` + `getServerSnapshot`），這是 React 官方為此提供的機制，無 effect、無連鎖 render
  - `src/hooks/` 為新目錄：`src/lib/` 內無任何 client React 檔（全是 server／共用工具），hook 不宜放那
- [x] C.3 `ExperienceCalendar.tsx` — `react-hooks/set-state-in-effect` ×1
  - 原本 effect 呼叫 `fetchSessions()`，該函式開頭同步 `setLoading(true)`
  - 改為把場次資料連同「屬於哪個月」一起存（`{ key, sessions }`），`loading` 在 render 推導；唯一的 setState 發生在 fetch 的非同步 callback
  - **順帶修掉一個既有競態**：原本沒有取消機制，快速切換月份時較慢的回應會覆蓋新月份的資料。已加 `cancelled` 旗標
- [x] C.4 `ChatWidget.tsx` — `react-hooks/set-state-in-effect` ×4
  - `useMobileFabVisibility`／`useIsMobile`：兩者都是「訂閱外部狀態 + 讀初始值」，改用 `useSyncExternalStore`，訂閱與讀取函式提到模組層級避免反覆重新訂閱。附帶好處：FAB 門檻改為每次讀取時計算，轉螢幕後會跟著更新（原本只在掛載時算一次）
  - `messages` 初始化：改用 `useState(loadMessages)` lazy initializer，移除 `initialized` state。**安全性依據**：訊息只在 `isOpen` 為真時進入 DOM，而 `isOpen` 預設 false，故不會有 hydration 不一致
  - `fabIdle`：改為 render 時推導（`fabIdleRaw && !isOpen && mobileFabVisible`），並把「離開啟用狀態時清掉旗標」從 effect body 移到 cleanup
- [x] C.5 `LoginForm.tsx` — `@typescript-eslint/no-explicit-any` ×2
  - **分級更正**：初版清冊把本檔歸在「風險最低」，錯了——它屬 auth，是鐵律 4 的高風險區。已依高風險流程處理
  - 查證結果：`openspec/specs/` **沒有涵蓋會員登入的規格**（`admin-auth` 只涵蓋後台）。已據此格外保守，只做型別層面的改動
  - 原本兩處 `provider: "custom:line" as any`，且兩個 `eslint-disable` 註解都掛錯行（指向上一行的 `await`），所以錯誤照樣觸發
  - 改為 `const LINE_PROVIDER = "custom:line" as Provider`。`any` 會讓整個引數失去檢查（連 `options` 都不檢查），斷言成 `Provider` 只放掉「字串不在聯集內」這一件事
  - **字串值完全相同，無執行期差異**（已 grep 確認 `provider:` 四處的值）

### C.6 驗證結果

- [x] `npm run lint`：全 repo error **22 → 11**，正好是批次 C 的 11 個消失；批次 C 五檔零 error。依 JUDG-2 第 2 條以 `eslint -f json` 逐檔對比，非目測
- [x] `npx tsc --noEmit`：零錯誤（既有的 `admin-campaigns-audit.test.ts` 除外，不在本批 diff 內）
- [x] `npm run test`：27 檔 358 測試全綠，無退化
- [x] `npm run build`：成功

**實跑驗證（Playwright，1280×900 桌機 ＋ 390×800 手機）**：

| 元件 | 檢查項 | 結果 |
|---|---|---|
| ChatWidget | FAB 捲動前不顯示 | ✓ |
| ChatWidget | 捲過 85% 視窗高後顯示 | ✓ |
| ChatWidget | 訊息從 sessionStorage 還原（lazy init） | ✓ |
| Header | 空車時不顯示徽章 | ✓ |
| Header | 購物車有 3 件時徽章顯示 3 | ✓ |
| 全站 | hydration 警告／runtime error | **0** |

- [ ] **C.7 尚未驗證，需在 staging／production 補測**（容器無 Supabase，這兩個元件的資料取不到）：
  - **`ProductLightbox` 的鍵盤操作（←／→／Esc）**：`/products` 的商品來自 Supabase（`getProducts()` 失敗回 `[]`），容器內渲染 0 張圖，燈箱無法開啟。
    風險評估：**可由推理證明行為不變**——`useCallback(fn, [fn])` 在所有情況下都等於 `fn`（首次 render 回傳 `fn`；deps 未變意即 `fn` 未變，回傳的前次值就是當前 `fn`；`fn` 變則 deps 變、回傳新 `fn`）。因此新舊依賴陣列逐元素相同，effect 重新訂閱的時機一致。
  - **`ExperienceCalendar` 的月份切換**：需要 `/api/experience-sessions`（Supabase）。
    風險評估：**這個不是等價改寫**——`loading` 由 state 改為推導、並新增取消機制。雖然邏輯經逐行檢視、`tsc` 與測試皆綠，但**行為未經實跑確認**，上線前應在 staging 手動切換月份確認：載入中文案出現、資料正確、快速連點月份不會顯示錯月份的場次。

## 批次 B｜admin 後台（已完成，2026-07-30）

四支都是 `react-hooks/set-state-in-effect`，且都是同一個成因：**effect 直接呼叫一個會 setState 的 fetch 函式**（其中三支還在函式開頭同步 `setLoading(true)`）。

統一改法：**把「取資料」與「寫入 state」拆開**——取資料抽成模組層級函式（不碰 state），effect 只在 `.then()` callback 內 setState，並加取消旗標。

- [x] B.1 `admin/(protected)/campaigns/page.tsx`
  - 抽出 `fetchCampaignList()`；`fetchCampaigns` → `refreshCampaigns`（2 處呼叫端同步更新）
  - **保留原語意**：初版我改成非陣列時寫入 `[]`，那會把 API 錯誤顯示成「尚無點數活動」。已改回 `Array.isArray` 守衛的原行為（回傳 `null` 時不覆蓋既有清單）
- [x] B.2 `admin/(protected)/coupons/page.tsx`
  - 抽出 `fetchCouponList(tab)`；`fetchData` → `refreshData`（2 處呼叫端）
  - `loading` 由 state 改為**推導**：新增 `loadedTab`，`loading = loadedTab !== tab`。切 tab 時 `loadedTab` 還是舊值，自然就是 loading，不需要在 effect 內同步 `setLoading(true)`
- [x] B.3 `admin/(protected)/experiences/sessions/SessionsClient.tsx`
  - 抽出 `fetchSessionList()`；`fetchSessions` → `refreshSessions`（2 處呼叫端）；移除不再需要的 `useCallback` import
  - `loading` 保持 state（初始值本來就是 `true`，掛載時不必再設一次）
- [x] B.4 `admin/(protected)/members/[id]/points/page.tsx` — **鐵律 4 高風險（點數＝金流性負債）**
  - 依鐵律 4 先讀 `openspec/specs/admin-points-adjustment/spec.md`。該規格的四條 Scenario（加點、扣點、理由必填、記錄操作者）全是 **API 寫入行為**
  - **本次完全未動寫入路徑**：`handleAdjust` 與 `/api/admin/points-adjustment` 的請求內容一字未改。只改讀取用的 effect
  - 抽出 `fetchPointsData(userId)`（Supabase 查詢欄位、排序、`limit 100`、餘額 `reduce` 後 `max(total, 0)` 全部照原樣）與 `fetchTierHistory(userId)`
  - **修掉自己造成的重複**：初版把 tier-history 與 Supabase 查詢同時留在 `refreshData` 與 effect 兩處。已讓兩者共用抽出的函式
  - 順帶把 `tierHistory` 的行內型別抽成具名的 `TierHistoryRow`

### B.5 驗證結果

- [x] `npm run lint`：全 repo error **11 → 7**，正好是批次 B 的 4 個消失；剩餘 7 個全屬批次 A。warnings 42 → 38
- [x] `npx tsc --noEmit` 零錯誤；`npm run test` 358 測試全綠；`npm run build` 成功
- [ ] **B.6 admin 頁面的執行期行為未驗證**：四個路由在未登入時皆回 307 導向登入頁，容器內無法取得 admin session，頁面不會渲染。
  - server log 的 16 個錯誤全部是 `placeholder.supabase.co` DNS 失敗（假環境變數所致），**零個來自本次改動**
  - 風險分級：B.1／B.3 接近等價改寫（語意已刻意保留）；**B.2 與 B.4 是真的重構**（B.2 的 loading 改推導、B.4 的資料讀取抽離），上線前應在 staging 以 admin 帳號確認：
    - 折價券頁切換「通用碼／批次券」時載入中文案正常、清單正確、快速連點不串資料
    - 點數頁載入明細與餘額正確；**做一次加點與一次扣點**，確認調整成功後清單刷新、理由必填仍生效

## X.1 ChatWidget 的 Rules of Hooks 違反（已完成，2026-07-30）

- [x] X.1.1 成因確認：`if (pathname.startsWith("/admin")) return null;` 原本寫在十幾個 hook **之後**，前人以 **14 個** `eslint-disable-next-line react-hooks/rules-of-hooks` 逐行壓住
- [x] X.1.2 拆成 wrapper：`ChatWidget` 只做 `usePathname()` 與提前 return，其餘全部移入 `ChatWidgetPanel({ pathname })`（pathname 以 prop 傳入，避免重複呼叫 hook）
- [x] X.1.3 14 個抑制註解全部移除（檔內已無 `eslint-disable`）
- [x] X.1.4 驗證（Playwright，390×800）：

  | 檢查項 | 結果 |
  |---|---|
  | 首頁捲動後 FAB 出現 | ✓ |
  | `/admin` 無 FAB（wrapper 生效） | ✓ |
  | 首頁 → /admin → 首頁 來回，FAB 恢復 | ✓ |
  | 點 FAB 開啟聊天面板（inner 的 hook 全數正常） | ✓ textarea 出現且可見 |
  | console 的 hook 數量變動／hydration 錯誤 | **0** |

  > 「首頁 → /admin → 首頁」正是原本違反 Rules of Hooks 最容易出事的情境，特別列為驗收項。

## 批次 A｜金流與帳務（已完成，2026-07-30）

依鐵律 4，動手前已讀 `openspec/specs/checkout-flow/`、`account-page/`、`booking-participants/`。

- [x] A.1 `checkout/CheckoutClient.tsx` — `immutability` ×2 + `set-state-in-effect` ×1
  - **兩個 immutability 都是付款轉向**：`window.location.href = url`（Stripe／ECPay）。改為 `window.location.assign(url)`——同一語意的方法形式（都導航、都推入 history，與 `replace` 不同），規則不再視為修改外部變數。**URL 值與流程完全未變。**
  - **set-state-in-effect 是「自動套用最佳折價券」**（會影響訂單金額，本批最敏感一處）。原本是獨立 effect 在 body 內同步 `setCouponInput`／`setAppliedCoupon`。改到 `/api/user/coupons` 的 `.then()` callback 內——規則允許「外部狀態變動時在 callback 裡 setState」。
    - 為避免閉包捕捉到掛載當下的金額（使用者可能在券載入前改數量或配送方式），另加一個**只寫 ref、不 setState** 的 effect 保持門檻最新，callback 讀 `orderTotalRef.current`
    - 語意逐項核對過：一次性旗標 `autoAppliedRef` 的設定時機、無符合券時也不再重試、`best` 的 filter/sort 條件均與原本相同
- [x] A.2 `account/AccountClient.tsx` — `immutability` ×1 + `purity` ×1
  - immutability 同 A.1：訂單重試的付款轉向改 `location.assign()`
  - **purity 是死碼**：`daysUntil` 只用來算 `refundRate`，而 `refundRate` 從未被使用（lint 另有 `no-unused-vars` warning 佐證）。退款金額實際是用 `booking.refund_amount`（L727）與 `cancelBookingResult.refundAmount`（L1162）顯示。整段「退款比例說明」已刪除——同時消掉該 warning
- [x] A.3 `account/page.tsx` — `purity` ×1
  - 本檔是 **async Server Component**（`force-dynamic`），每 request 只跑一次，規則擔心的「re-render 結果不穩」並不成立
  - 仍做了改善而非抑制：把「未來 30 天到期點數」的時間窗與查詢一起抽成 `fetchExpiringPoints(userId)`，查詢參數不再算在 render 流程裡
- [x] A.4 `account/bookings/[id]/participants/page.tsx` — `set-state-in-effect` ×1
  - `load()` 除 effect 外還被送出流程呼叫（L111），故沿用批次 B 的拆法：抽出 `fetchParticipantInfo(bookingId)`（不碰 state）＋ `commitInfo()`＋`reload()`
  - 沿用原語意：失敗時只設 error（不清空 info）、成功時只設 info（不清空 error）

### A.5 驗證結果

- [x] `npm run lint`：**全 repo error 7 → 0**。整個 repo 的 lint error 至此全部清除（起點 22）
- [x] `npx tsc --noEmit` 零錯誤；`npm run test` 27 檔 358 測試全綠；`npm run build` 成功
- [x] **既有 hydration 錯誤已用 stash 對比證明與本次無關**：帶商品進 `/checkout` 會觸發 1 個 React #418（hydration 不一致）。把批次 A 四檔 stash 後重新 build 實測，**基準線同樣是 1 個、訊息相同** → 非本次造成。未用「應該是既有的」帶過（JUDG-2 第 2 條）
- [ ] **A.6 結帳與帳號頁的執行期行為未驗證**：`/checkout` 在購物車有商品時會導向登入頁；`/account` 未登入回 307。容器內無法取得會員 session。
  - 風險分級：
    - **付款轉向（`location.assign`）**：無法端到端驗（需真實 Stripe／ECPay）。但 `assign(url)` 與 `href = url` 語意等價，且 URL 來源與判斷條件未變
    - **折價券自動套用**：**這是真的重構**，且直接影響訂單金額。上線前務必在 staging 以有券的帳號確認：進結帳頁時自動帶入最高可用券、券碼填入輸入框、折扣反映在總計、手動改券仍可覆蓋、不符門檻時不自動套用
    - A.3／A.4 接近等價改寫；A.2 是刪死碼
- [ ] **A.7 另案回報｜`CartContext` 的 hydration 不一致（既有）**：`useState(loadFromStorage)` 在 SSR 回 `[]`、client 首次 render 可能有值，這是上面 #418 的根因，也是批次 C 時 `Header` 需要 `useHasHydrated` 的原因。
  - 重現方式：`localStorage.setItem("wujuetea_cart", ...)` 後進 `/checkout`
  - 修法方向：`CartProvider` 改為初始 `[]`，並以 `useSyncExternalStore`（或既有的 `useHasHydrated`）在 hydration 後才揭露 localStorage 內容
  - **未在本 change 處理**：它不是 lint error（沒有規則抓它），屬獨立的 bug 修復，且會動到全站購物車狀態，需獨立評估與驗證

## X.1 ChatWidget 的 Rules of Hooks 違反（已完成，2026-07-30）

- [x] X.1.1 成因確認：`if (pathname.startsWith("/admin")) return null;` 原本寫在十幾個 hook **之後**，前人以 **14 個** `eslint-disable-next-line react-hooks/rules-of-hooks` 逐行壓住
- [x] X.1.2 拆成 wrapper：`ChatWidget` 只做 `usePathname()` 與提前 return，其餘全部移入 `ChatWidgetPanel({ pathname })`（pathname 以 prop 傳入，避免重複呼叫 hook）
- [x] X.1.3 14 個抑制註解全部移除（檔內已無 `eslint-disable`）
- [x] X.1.4 驗證（Playwright，390×800）：

  | 檢查項 | 結果 |
  |---|---|
  | 首頁捲動後 FAB 出現 | ✓ |
  | `/admin` 無 FAB（wrapper 生效） | ✓ |
  | 首頁 → /admin → 首頁 來回，FAB 恢復 | ✓ |
  | 點 FAB 開啟聊天面板（inner 的 hook 全數正常） | ✓ textarea 出現且可見 |
  | console 的 hook 數量變動／hydration 錯誤 | **0** |

  > 「首頁 → /admin → 首頁」正是原本違反 Rules of Hooks 最容易出事的情境，特別列為驗收項。

## 批次 A｜金流與帳務（未開始，鐵律 4：改前先讀對應規格）

剩餘全部 7 個 error 都在這批。

- [ ] A.1 `checkout/CheckoutClient.tsx` — set-state-in-effect ×1, immutability ×2（先讀 `openspec/specs/checkout-flow/`）
- [ ] A.2 `account/AccountClient.tsx` — immutability ×1, purity ×1（先讀 `openspec/specs/account-page/`）
- [ ] A.3 `account/page.tsx` — purity ×1
- [ ] A.4 `account/bookings/[id]/participants/page.tsx` — set-state-in-effect ×1（先讀 `openspec/specs/booking-participants/`）

## 另案回報

- [x] ~~X.1~~ **已完成，見上方「X.1 ChatWidget 的 Rules of Hooks 違反」**（實際是 14 個抑制，非 11 個）。原始記錄：**`ChatWidget.tsx` 有多個 `eslint-disable react-hooks/rules-of-hooks`**，成因是第 165 行 `if (pathname.startsWith("/admin")) return null;` **出現在後面所有 hook 之前**——這是真的 Rules of Hooks 違反，前人用逐行抑制壓掉而非修正。
  在 admin 與非 admin 路由間切換時 hook 數量會變，React 可能報錯或狀態錯亂（App Router 通常會重新掛載，故實務上少爆，但結構是脆的）。
  修法：抽成外層 wrapper——`export default function ChatWidget()` 只做 `usePathname()` 與提前 return，其餘全部移到 `<ChatWidgetInner />`。可一次移除 11 個抑制註解。
  **未在批次 C 處理**：這不在 22 個 error 內（已被抑制），且屬結構重構而非 lint 修正，需另行評估。
- [ ] X.2 `ProductLightbox.tsx:53` 有一個既有 warning（`no-unused-expressions`，觸控處理的三元運算式當陳述句）。依本 change 提案範圍「warning 另議」未處理。
