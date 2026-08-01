"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import type { Product, CartItem } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

function getItemStock(product: Product): number | undefined {
  if (product.weight === "75g") return product.stock75g;
  if (product.weight === "15包 × 3g") return product.stockTeaBag;
  return product.stockQuantity;
}

export type { CartItem };

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = "wujuetea_cart";

/** 對外揭露前的穩定空值——每次 render 回傳同一個參考，避免下游誤判為變動 */
const EMPTY_ITEMS: CartItem[] = [];

function loadFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {}
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>(loadFromStorage);
  const hydrated = useHasHydrated();

  /**
   * 對外只在 hydration 完成後揭露 localStorage 的內容。
   *
   * `loadFromStorage()` 在伺服器端回傳 `[]`（無 localStorage），但在 client 首次 render
   * 會回傳實際存的商品——兩者不一致就是 hydration 失敗（React #418），在 `/checkout`
   * 與 `/cart` 都會發生。這裡讓首次 client render 也回傳空陣列以對齊伺服器輸出，
   * hydration 完成後才換成真實內容。
   *
   * **內部一律使用真實的 `items`**：異動函式與 Supabase 同步 effect 都不可改用
   * `visibleItems`，否則 hydration 完成前的操作會基於空陣列，等於清掉使用者的購物車。
   */
  const visibleItems = hydrated ? items : EMPTY_ITEMS;

  // 用來避免從 Supabase 載入後立刻觸發同步回去
  const skipSyncRef   = useRef(false);
  const syncTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUserIdRef = useRef<string | null>(null);

  // ── 登入時從 Supabase 載入購物車 ─────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;

    // 登出：清空購物車
    if (!user) {
      if (prevUserIdRef.current) {
        setItems([]);
        saveToStorage([]);
      }
      prevUserIdRef.current = null;
      return;
    }

    // 同一位使用者，不重複載入
    if (prevUserIdRef.current === user.id) return;
    prevUserIdRef.current = user.id;

    // 從 Supabase 載入（Supabase 為權威來源）
    getSupabaseBrowserClient()
      .from("cart_items")
      .select("product_id, quantity, product_data")
      .eq("user_id", user.id)
      .then(({ data }: { data: { product_id: number; quantity: number; product_data: unknown }[] | null }) => {
        if (data && data.length > 0) {
          const serverItems: CartItem[] = data.map((row) => ({
            product:  row.product_data as Product,
            quantity: row.quantity,
          }));
          skipSyncRef.current = true; // 載入後跳過一次同步
          setItems(serverItems);
          saveToStorage(serverItems);
        }
      });
  }, [user, authLoading]);

  // ── items 變動時，防抖同步到 Supabase ────────────────────────────────────
  useEffect(() => {
    if (!user || authLoading) return;

    // 從伺服器載入後的第一次 effect，跳過
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    syncTimerRef.current = setTimeout(async () => {
      const supabase = getSupabaseBrowserClient();

      if (items.length === 0) {
        await supabase.from("cart_items").delete().eq("user_id", user.id);
        return;
      }

      // Upsert 目前所有商品
      await supabase.from("cart_items").upsert(
        items.map((i) => ({
          user_id:      user.id,
          product_id:   i.product.id,
          quantity:     i.quantity,
          product_data: i.product,
          updated_at:   new Date().toISOString(),
        })),
        { onConflict: "user_id,product_id" }
      );

      // 刪除已從購物車移除的商品
      const currentIds = items.map((i) => i.product.id);
      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id)
        .not("product_id", "in", `(${currentIds.join(",")})`);
    }, 500);

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [items, user, authLoading]);

  // ── 購物車操作（先更新本地，Supabase 由 effect 同步）───────────────────
  const addToCart = (product: Product, qty: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      const newItems = existing
        ? prev.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + qty }
              : item
          )
        : [...prev, { product, quantity: qty }];
      saveToStorage(newItems);
      return newItems;
    });
  };

  const removeFromCart = (productId: number) => {
    setItems((prev) => {
      const newItems = prev.filter((item) => item.product.id !== productId);
      saveToStorage(newItems);
      return newItems;
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) => {
      const newItems = prev.map((item) => {
        if (item.product.id !== productId) return item;
        const stock = getItemStock(item.product);
        const maxQty = stock !== undefined ? Math.min(stock, 99) : 99;
        return { ...item, quantity: Math.min(quantity, maxQty) };
      });
      saveToStorage(newItems);
      return newItems;
    });
  };

  const clearCart = () => {
    setItems([]);
    saveToStorage([]);
  };

  // 由 visibleItems 推導，Header 徽章才會與 /cart、/checkout 顯示的內容一致
  const totalItems = visibleItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = visibleItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{ items: visibleItems, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
