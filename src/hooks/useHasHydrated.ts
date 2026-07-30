"use client";

import { useSyncExternalStore } from "react";

/** 永不變動的訂閱：這個值只會在 hydration 前後各取一次 */
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * 回傳「是否已經 hydrate 完成」。
 *
 * 用途是安全地渲染只有 client 才知道的值（購物車數量、localStorage 內容），
 * 避免 SSR 與首次 client render 不一致而造成 hydration 錯誤。
 *
 * 為什麼不用 `useState(false)` + `useEffect(() => setMounted(true), [])`：
 * 那是在 effect 裡同步 setState，會觸發一次連鎖 render，`react-hooks/set-state-in-effect`
 * 會擋。`useSyncExternalStore` 是 React 官方為此提供的機制——hydration 期間用
 * `getServerSnapshot`（false，與伺服器一致），hydration 完成後改用 `getSnapshot`（true）。
 */
export function useHasHydrated(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
