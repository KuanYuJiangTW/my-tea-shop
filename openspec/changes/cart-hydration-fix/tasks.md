# 任務：修正購物車的 hydration 不一致

來源：`lint-debt-cleanup` 的 tasks A.7（另案回報），經店主裁示另立本 change。

## 1. 修正

- [ ] 1.1 `src/context/CartContext.tsx`：新增模組層級 `EMPTY_ITEMS` 常數（參考穩定）
- [ ] 1.2 引入 `useHasHydrated()`（`src/hooks/useHasHydrated.ts`，`lint-debt-cleanup` 批次 C 已建立）
- [ ] 1.3 對外的 `items` 改為 `visibleItems`（`hydrated ? items : EMPTY_ITEMS`）；`totalItems` / `totalPrice` 一併改由 `visibleItems` 推導
- [ ] 1.4 確認異動函式與 Supabase 同步 effect 仍使用真實的 `items`（不可誤改成 `visibleItems`，否則 hydration 前的操作會基於空陣列）
- [ ] 1.5 評估是否移除 `Header.tsx` 的 `useHasHydrated()` 局部補丁——修好根因後它變成冗餘（`mounted && totalItems > 0` 等價於 `totalItems > 0`）。**傾向移除**，避免同一件事有兩套機制

## 2. 驗證

- [ ] 2.1 **重現用例必須轉綠**：進站後 `localStorage.setItem("wujuetea_cart", ...)` 再進 `/checkout`，console 不得出現 React #418
- [ ] 2.2 hydration 後購物車內容正確顯示；Header 徽章數字與 `/cart` 內容一致
- [ ] 2.3 購物車操作實跑：加入商品 → 改數量 → 移除 → 清空，每步後重新載入頁面確認內容保留
- [ ] 2.4 `/cart` 與 `/checkout` 兩頁皆驗（`/checkout` 在有商品且未登入時會導向登入頁，故此項可能僅能驗 `/cart`——若如此須明說）
- [ ] 2.5 `npm run lint` 維持 **0 error**（不得因修這個 bug 又引入 `set-state-in-effect`）
- [ ] 2.6 `npx tsc --noEmit` 零錯誤、`npm run test` 全綠、`npm run build` 成功
- [ ] 2.7 **未驗證的部分要明說**：登入狀態下與 Supabase 的購物車同步需要真實 session，容器內無法驗

## 3. 注意事項

- [ ] 3.1 本檔屬**金流路徑上游**（購物車內容直接決定結帳金額）。依鐵律 4，改完必跑 `npm run test`
- [ ] 3.2 與 `lint-debt-cleanup` 的批次 A 有檔案關聯（`CheckoutClient` 消費 `useCart()`）。**該 change 的 checker 驗收完成後才動手**，否則會讓驗收對象變成移動標靶
