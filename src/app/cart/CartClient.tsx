"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useTranslations, useLocale } from "next-intl";
import type { Product } from "@/types";
import { productDisplayName, productDisplayWeight, productDisplayOrigin } from "@/lib/product-display";
import {
  DOMESTIC_FEES,
  DOMESTIC_FREE_THRESHOLD,
  INTERNATIONAL_FREE_SHIPPING_THRESHOLD,
} from "@/lib/shipping-constants";

function getItemStock(product: Product): number | undefined {
  if (product.weight === "75g") return product.stock75g;
  if (product.weight === "15包 × 3g") return product.stockTeaBag;
  return product.stockQuantity;
}

function getOriginalId(product: Product): number {
  if (product.weight === "75g") return product.id - 10000;
  if (product.weight === "15包 × 3g") return product.id - 20000;
  return product.id;
}

interface StockEntry {
  id: number;
  stockQuantity?: number;
  stock75g?: number;
  stockTeaBag?: number;
}

interface Adjustment {
  id: number;
  name: string;
  count: number;  // 0 = 售完
}

export default function CartClient() {
  const t = useTranslations("cart");
  const tProducts = useTranslations("products");
  const locale = useLocale();
  const isEn = locale === "en";
  const lp = (path: string) => isEn ? `/en${path}` : path;
  const { items, removeFromCart, updateQuantity, totalPrice, totalItems } = useCart();
  const { user } = useAuth();
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (items.length === 0 || hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    fetch("/api/products/stock")
      .then((r) => r.json())
      .then((stockList: StockEntry[]) => {
        const newAdjustments: Adjustment[] = [];

        for (const item of items) {
          const originalId = getOriginalId(item.product);
          const entry = stockList.find((s) => s.id === originalId);
          if (!entry) continue;

          let freshStock: number | undefined;
          if (item.product.weight === "75g") freshStock = entry.stock75g;
          else if (item.product.weight === "15包 × 3g") freshStock = entry.stockTeaBag;
          else freshStock = entry.stockQuantity;

          if (freshStock === undefined) continue; // 無限庫存，不需處理

          if (item.quantity > freshStock) {
            updateQuantity(item.product.id, freshStock); // freshStock=0 → 自動呼叫 removeFromCart

            // 茶包規格的名稱本身已含「茶包組」，再接規格會變成疊字
            const displayName = productDisplayName(item.product, isEn, tProducts("teaBagSet"));
            const label =
              item.product.weight === "15包 × 3g"
                ? displayName
                : `${displayName} ${productDisplayWeight(item.product.weight, isEn)}`;

            newAdjustments.push({
              id: item.product.id,
              name: label,
              count: freshStock,
            });
          }
        }

        if (newAdjustments.length > 0) setAdjustments(newAdjustments);
      })
      .catch(() => {}); // 靜默失敗，後端結帳時仍會驗證
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  if (items.length === 0 && adjustments.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-tea-cream-light px-4">
        <div className="text-center">
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            className="mx-auto text-tea-green-pale mb-6"
          >
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          <h2 className="font-serif text-2xl font-bold text-tea-text mb-3">
            {t("empty.title")}
          </h2>
          <p className="text-tea-text-light mb-8">
            {t("empty.desc")}
          </p>
          <Link
            href={lp("/products")}
            className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3.5 rounded-full font-medium transition-colors"
          >
            {t("empty.cta")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tea-cream-light">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-8 md:mb-10">
          {t("title")}
        </h1>

        {/* 庫存調整提示 */}
        {adjustments.length > 0 && (
          <div className="mb-6 space-y-2">
            {adjustments.map((adj) => (
              <div
                key={adj.id}
                className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>{adj.count === 0 ? t("soldOut", { name: adj.name }) : t("stockAdjusted", { name: adj.name, count: adj.count })}</span>
                </div>
                <button
                  onClick={() => setAdjustments((prev) => prev.filter((a) => a.id !== adj.id))}
                  className="text-amber-500 hover:text-amber-700 transition-colors flex-shrink-0"
                  aria-label="關閉"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="bg-white rounded-2xl p-4 sm:p-5 flex gap-3 sm:gap-5 shadow-sm"
              >
                {/* Product color swatch */}
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br ${item.product.color} flex-shrink-0 flex items-center justify-center`}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 40 40"
                    fill="none"
                    className="opacity-40"
                  >
                    <path
                      d="M20 4C20 4 10 12 10 22C10 27.52 14.48 32 20 32C25.52 32 30 27.52 30 22C30 12 20 4 20 4Z"
                      fill="#3D4A42"
                    />
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-serif font-bold text-tea-text">
                        {productDisplayName(item.product, isEn, tProducts("teaBagSet"))}
                      </h3>
                      <p className="text-xs text-tea-text-light mt-0.5">
                        {productDisplayOrigin(item.product, isEn)} · {productDisplayWeight(item.product.weight, isEn)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-tea-text-light hover:text-red-400 transition-colors flex-shrink-0"
                      aria-label="移除"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    {/* Quantity */}
                    <div className="flex items-center gap-2 bg-tea-cream-light rounded-full px-3 py-1">
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                        className="w-6 h-6 flex items-center justify-center text-tea-text-light hover:text-tea-green transition-colors font-medium"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-medium text-tea-text">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                        disabled={(() => {
                          const stock = getItemStock(item.product);
                          const maxQty = stock !== undefined ? Math.min(stock, 99) : 99;
                          return item.quantity >= maxQty;
                        })()}
                        className="w-6 h-6 flex items-center justify-center text-tea-text-light hover:text-tea-green transition-colors font-medium disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-tea-text-light"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-bold text-tea-green">
                      NT$
                      {(item.product.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
              <h2 className="font-serif text-xl font-bold text-tea-text mb-6">
                {t("orderSummary")}
              </h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm text-tea-text-light">
                  <span>{t("quantity")}</span>
                  <span>{t("quantityUnit", { count: totalItems })}</span>
                </div>
                <div className="flex justify-between text-sm text-tea-text-light">
                  <span>{t("shipping")}</span>
                  {totalPrice >= DOMESTIC_FREE_THRESHOLD ? (
                    <span className="text-tea-green">{t("freeShipping")}</span>
                  ) : (
                    <span>{t("shippingOptions", { home: DOMESTIC_FEES.home, cvs: DOMESTIC_FEES.cvs })}</span>
                  )}
                </div>
                {totalPrice < DOMESTIC_FREE_THRESHOLD && (
                  // amber-600 順手收進 status-warn（WORKLOG 排隊工作 1 的既定方向）。
                  // 這裡正要新增第二行提示，留著 amber 會讓新舊兩種樣式並存
                  <div className="text-xs text-status-warn">
                    {t("freeShippingHint", { amount: (DOMESTIC_FREE_THRESHOLD - totalPrice).toLocaleString() })}
                  </div>
                )}
                {/* 國際免運。購物車還不知道客人要寄哪裡，所以用邀請句而不是警示句，
                    樣式也刻意比國內那行低調——多數客人寄台灣，這行對他們是資訊不是提醒。
                    它真正的作用是讓「不知道能寄國外」的人在這裡第一次知道。 */}
                {totalPrice < INTERNATIONAL_FREE_SHIPPING_THRESHOLD && (
                  <div className="text-xs text-tea-text-muted">
                    {t("intlFreeShippingHint", {
                      threshold: INTERNATIONAL_FREE_SHIPPING_THRESHOLD.toLocaleString(),
                      amount: (INTERNATIONAL_FREE_SHIPPING_THRESHOLD - totalPrice).toLocaleString(),
                    })}
                  </div>
                )}
                <div className="border-t border-tea-green-pale pt-3 flex justify-between font-bold text-tea-text">
                  <span>{t("total")}</span>
                  <span className="text-tea-green text-lg">
                    NT${totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
              {user ? (
                <Link
                  href={lp("/checkout")}
                  className="block w-full bg-tea-green hover:bg-tea-green-dark text-white text-center py-3.5 rounded-full font-medium transition-colors"
                >
                  {t("checkout")}
                </Link>
              ) : (
                <Link
                  href={lp("/auth/login?redirect=" + lp("/checkout"))}
                  className="block w-full bg-tea-green hover:bg-tea-green-dark text-white text-center py-3.5 rounded-full font-medium transition-colors"
                >
                  {t("loginToCheckout")}
                </Link>
              )}
              <Link
                href={lp("/products")}
                className="block w-full text-center text-tea-text-light hover:text-tea-green text-sm mt-4 transition-colors"
              >
                {t("continueShopping")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
