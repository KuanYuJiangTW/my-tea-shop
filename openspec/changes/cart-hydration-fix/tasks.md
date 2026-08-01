# 任務：修正購物車的 hydration 不一致

來源：`lint-debt-cleanup` 的 tasks A.7（另案回報），經店主裁示另立本 change。

## 1. 修正

- [x] 1.1 `src/context/CartContext.tsx`：新增模組層級 `EMPTY_ITEMS` 常數（參考穩定）
- [x] 1.2 引入 `useHasHydrated()`（`src/hooks/useHasHydrated.ts`，`lint-debt-cleanup` 批次 C 已建立）
- [x] 1.3 對外的 `items` 改為 `visibleItems`（`hydrated ? items : EMPTY_ITEMS`）；`totalItems` / `totalPrice` 一併改由 `visibleItems` 推導
- [x] 1.4 確認異動函式與 Supabase 同步 effect 仍使用真實的 `items`（不可誤改成 `visibleItems`，否則 hydration 前的操作會基於空陣列）
- [x] 1.5 **已移除** `Header.tsx` 的局部補丁：`mounted && totalItems > 0` → `totalItems > 0`，並移除 `useHasHydrated` import。根因修好後它確實冗餘（`totalItems` 現在由 `visibleItems` 推導，hydration 前必為 0）

## 2. 驗證結果（Playwright 實跑，1280×1000）

| 檢查項 | 修前 | 修後 |
|---|---|---|
| `/checkout` 的 hydration 錯誤數 | **1**（React #418） | **0** ✓ |
| `/cart` 的 hydration 錯誤數 | — | **0** ✓ |
| `/cart` 顯示商品名稱 | — | ✓ |
| `/cart` 顯示數量 2、小計 1,600 | — | ✓ |
| Header 徽章與內容一致 | — | ✓（顯示 2） |
| 點 ＋ 加一件 → 徽章 3 | — | ✓ |
| 重新載入 → 徽章仍為 3、商品仍在 | — | ✓ |
| 清空 localStorage → 徽章為空 | — | ✓ |
| 殘留 hydration／React 錯誤 | — | **0** ✓ |

- [x] 2.1 重現用例已轉綠——同一組步驟（`localStorage.setItem("wujuetea_cart", …)` → `/checkout`），修前 1 個 #418、修後 0 個
- [x] 2.2 hydration 後內容正確、Header 徽章與 `/cart` 一致
- [x] 2.3 加一件 → 重新載入內容保留（localStorage 持久化未受影響）
- [x] 2.4 `/cart` 與 `/checkout` 皆驗。註：`/checkout` 在有商品且未登入時會導向登入頁，故該頁量到的是**導向路徑上的** hydration 情況——但這正是原本 #418 觸發的同一條路徑（checker 已在基準線與 `f511d7c` 兩版確認），故前後對比成立
- [x] 2.5 `npm run lint` 維持 **0 error**（未引入新的 `set-state-in-effect`）
- [x] 2.6 `npx tsc --noEmit` 零錯誤、`npm run test` 27 檔 358 測試全綠、`npm run build` 成功
- [ ] 2.7 **未驗證**：登入狀態下與 Supabase 的購物車同步需要真實 session，容器內無法驗。該路徑的程式碼本次**完全未動**（同步 effect 仍讀真實的 `items`，見 1.4），風險低但非零

## 3. 注意事項

- [ ] 3.1 本檔屬**金流路徑上游**（購物車內容直接決定結帳金額）。依鐵律 4，改完必跑 `npm run test`
- [ ] 3.2 與 `lint-debt-cleanup` 的批次 A 有檔案關聯（`CheckoutClient` 消費 `useCart()`）。**該 change 的 checker 驗收完成後才動手**，否則會讓驗收對象變成移動標靶
