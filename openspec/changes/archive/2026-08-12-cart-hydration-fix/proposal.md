# 提案：修正購物車的 hydration 不一致

## 問題

`src/context/CartContext.tsx` 以 lazy initializer 直接讀 localStorage：

```ts
const [items, setItems] = useState<CartItem[]>(loadFromStorage);
```

`loadFromStorage()` 在伺服器端因無 `localStorage` 而回傳 `[]`（有 `typeof window` 守衛），但在 **client 首次 render** 會回傳實際存的商品。首次 client render 必須與伺服器 HTML 一致，兩者不同即造成 hydration 不一致。

## 實際影響（已重現）

**重現方式**：進站後執行
```js
localStorage.setItem("wujuetea_cart", JSON.stringify([{ product:{id:1,name:"x",price:800}, quantity:2 }]))
```
再進 `/checkout` → console 出現 **React error #418**（hydration failed）。

已用 `git stash` 前後對比確認這是**既有問題**，與 `lint-debt-cleanup` 的批次 A 無關（該 change 的 tasks A.5／A.7 有紀錄）。

受影響的消費者：

| 檔案 | 用到 | 是否受影響 |
|---|---|---|
| `checkout/CheckoutClient.tsx` | `items`, `totalPrice` | **是**（渲染購物車內容） |
| `cart/CartClient.tsx` | `items`, `totalItems`, `totalPrice` | **是** |
| `components/Header.tsx` | `totalItems` | 否——已自行用 `useHasHydrated()` 擋住 |

Header 那個 `useHasHydrated()` 正是這個 bug 的局部補丁（`lint-debt-cleanup` 批次 C 加的），但它只擋住徽章，沒解決根因。

## 為什麼值得修

1. **hydration 失敗會讓 React 丟棄伺服器 HTML 並整棵重新 render**。發生在結帳頁——最不該有非必要重繪與閃動的地方。
2. 它是**目前結帳頁唯一已知的實際執行期錯誤**（其餘都是 lint 層級的問題）。
3. 修在 context 層可一次解決所有消費者，不必每個頁面各補一次 `useHasHydrated`。

## 方案

**在 context 內保留真實狀態，但對外只在 hydration 完成後揭露。**

```ts
const [items, setItems] = useState<CartItem[]>(loadFromStorage); // 內部狀態：真實內容
const hydrated = useHasHydrated();
const visibleItems = hydrated ? items : EMPTY_ITEMS;             // 對外：首次 render 為空
```

- `EMPTY_ITEMS` 為模組層級常數，維持參考穩定
- `totalItems` / `totalPrice` 改由 `visibleItems` 推導，Header 徽章才會與內容一致
- 所有異動函式（`addToCart` / `removeFromCart` / `updateQuantity` / `clearCart`）與 Supabase 同步 effect **繼續使用真實的 `items`**，行為不變

### 為什麼不採其他做法

- **初始 `[]` ＋ effect 內載入**：那是 `set-state-in-effect`，剛在 `lint-debt-cleanup` 全部清掉，不能再引入
- **改用 `useSyncExternalStore` 把 localStorage 當外部 store**：`getSnapshot` 必須回傳參考穩定的值，每次 `JSON.parse` 會產生新陣列而觸發無限迴圈，需自行加快取；而購物車是可變的本地狀態（有增刪改），不是純外部 store。改造幅度大、風險高於收益
- **各頁面自己補 `useHasHydrated`**：治標，且每個新頁面都會再踩一次

## 驗收

1. 上述重現步驟不再出現 React #418
2. hydration 完成後購物車內容正確顯示；Header 徽章數量與內容一致
3. 加入／移除／改數量／清空購物車行為不變；重新載入後內容保留
4. 登入時與 Supabase 的同步行為不變
5. `npm run lint` 維持 0 error、`npm run test` 全綠、`npm run build` 成功
