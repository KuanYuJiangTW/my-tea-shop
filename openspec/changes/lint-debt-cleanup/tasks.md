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

## 批次 B｜admin 後台（未開始）

- [ ] B.1 `admin/(protected)/campaigns/page.tsx` — set-state-in-effect ×1
- [ ] B.2 `admin/(protected)/coupons/page.tsx` — set-state-in-effect ×1
- [ ] B.3 `admin/(protected)/experiences/sessions/SessionsClient.tsx` — set-state-in-effect ×1
- [ ] B.4 `admin/(protected)/members/[id]/points/page.tsx` — set-state-in-effect ×1

## 批次 A｜金流與帳務（未開始，鐵律 4：改前先讀對應規格）

- [ ] A.1 `checkout/CheckoutClient.tsx` — set-state-in-effect ×1, immutability ×2（先讀 `openspec/specs/checkout-flow/`）
- [ ] A.2 `account/AccountClient.tsx` — immutability ×1, purity ×1（先讀 `openspec/specs/account-page/`）
- [ ] A.3 `account/page.tsx` — purity ×1
- [ ] A.4 `account/bookings/[id]/participants/page.tsx` — set-state-in-effect ×1（先讀 `openspec/specs/booking-participants/`）

## 另案回報

- [ ] X.1 **`ChatWidget.tsx` 有 11 個 `eslint-disable react-hooks/rules-of-hooks`**，成因是第 165 行 `if (pathname.startsWith("/admin")) return null;` **出現在後面所有 hook 之前**——這是真的 Rules of Hooks 違反，前人用逐行抑制壓掉而非修正。
  在 admin 與非 admin 路由間切換時 hook 數量會變，React 可能報錯或狀態錯亂（App Router 通常會重新掛載，故實務上少爆，但結構是脆的）。
  修法：抽成外層 wrapper——`export default function ChatWidget()` 只做 `usePathname()` 與提前 return，其餘全部移到 `<ChatWidgetInner />`。可一次移除 11 個抑制註解。
  **未在批次 C 處理**：這不在 22 個 error 內（已被抑制），且屬結構重構而非 lint 修正，需另行評估。
- [ ] X.2 `ProductLightbox.tsx:53` 有一個既有 warning（`no-unused-expressions`，觸控處理的三元運算式當陳述句）。依本 change 提案範圍「warning 另議」未處理。
