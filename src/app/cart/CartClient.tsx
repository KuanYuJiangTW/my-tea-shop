"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartClient() {
  const { items, removeFromCart, updateQuantity, totalPrice, totalItems } =
    useCart();

  if (items.length === 0) {
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
            購物車是空的
          </h2>
          <p className="text-tea-text-light mb-8">
            來挑選您喜愛的台灣好茶吧！
          </p>
          <Link
            href="/products"
            className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3.5 rounded-full font-medium transition-colors"
          >
            探索茶品
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tea-cream-light">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-8 md:mb-10">
          購物車
        </h1>

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
                        {item.product.name}
                      </h3>
                      <p className="text-xs text-tea-text-light mt-0.5">
                        {item.product.origin} · {item.product.weight}
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
                        className="w-6 h-6 flex items-center justify-center text-tea-text-light hover:text-tea-green transition-colors font-medium"
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
                訂單摘要
              </h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm text-tea-text-light">
                  <span>商品數量</span>
                  <span>{totalItems} 件</span>
                </div>
                <div className="flex justify-between text-sm text-tea-text-light">
                  <span>運費</span>
                  {totalPrice >= 1000 ? (
                    <span className="text-tea-green">免費</span>
                  ) : (
                    <span>宅配 NT$250 / 超商 NT$60</span>
                  )}
                </div>
                {totalPrice < 1000 && (
                  <div className="text-xs text-amber-600">
                    再買 NT${(1000 - totalPrice).toLocaleString()} 即享免運費
                  </div>
                )}
                <div className="border-t border-tea-green-pale pt-3 flex justify-between font-bold text-tea-text">
                  <span>總金額</span>
                  <span className="text-tea-green text-lg">
                    NT${totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
              <Link
                href="/checkout"
                className="block w-full bg-tea-green hover:bg-tea-green-dark text-white text-center py-3.5 rounded-full font-medium transition-colors"
              >
                前往結帳
              </Link>
              <Link
                href="/products"
                className="block w-full text-center text-tea-text-light hover:text-tea-green text-sm mt-4 transition-colors"
              >
                繼續購物
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
