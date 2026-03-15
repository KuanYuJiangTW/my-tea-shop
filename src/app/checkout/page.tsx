"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    payment: "credit",
    note: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    clearCart();
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-tea-cream-light flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-tea-green-mist rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7D9B84"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="font-serif text-3xl font-bold text-tea-text mb-4">
            訂單已確認
          </h2>
          <p className="text-tea-text-light mb-2">
            感謝您的訂購，我們將盡快為您備貨。
          </p>
          <p className="text-tea-text-light mb-10 text-sm">
            確認信將寄至您的電子郵件，請耐心等候。
          </p>
          <Link
            href="/"
            className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3.5 rounded-full font-medium transition-colors"
          >
            回到首頁
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-tea-cream-light flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-tea-text-light mb-6">購物車是空的，無法結帳</p>
          <Link
            href="/products"
            className="bg-tea-green text-white px-8 py-3.5 rounded-full font-medium"
          >
            去選購茶品
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tea-cream-light">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <h1 className="font-serif text-4xl font-bold text-tea-text mb-10">
          結帳
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Info */}
              <div className="bg-white rounded-2xl p-7 shadow-sm">
                <h2 className="font-serif text-xl font-bold text-tea-text mb-6">
                  聯絡資料
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-tea-text mb-2">
                      姓名 *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="請輸入您的姓名"
                      className="w-full border border-tea-green-pale rounded-xl px-4 py-3 text-sm text-tea-text placeholder-tea-text-light/60 focus:outline-none focus:border-tea-green bg-tea-cream-light/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-tea-text mb-2">
                      電話 *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="0912-345-678"
                      className="w-full border border-tea-green-pale rounded-xl px-4 py-3 text-sm text-tea-text placeholder-tea-text-light/60 focus:outline-none focus:border-tea-green bg-tea-cream-light/50"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-tea-text mb-2">
                      電子郵件 *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      className="w-full border border-tea-green-pale rounded-xl px-4 py-3 text-sm text-tea-text placeholder-tea-text-light/60 focus:outline-none focus:border-tea-green bg-tea-cream-light/50"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping */}
              <div className="bg-white rounded-2xl p-7 shadow-sm">
                <h2 className="font-serif text-xl font-bold text-tea-text mb-6">
                  配送地址
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-tea-text mb-2">
                      縣市 *
                    </label>
                    <select
                      name="city"
                      required
                      value={form.city}
                      onChange={handleChange}
                      className="w-full border border-tea-green-pale rounded-xl px-4 py-3 text-sm text-tea-text focus:outline-none focus:border-tea-green bg-tea-cream-light/50"
                    >
                      <option value="">請選擇縣市</option>
                      {["台北市","新北市","桃園市","台中市","台南市","高雄市","基隆市","新竹市","新竹縣","苗栗縣","彰化縣","南投縣","雲林縣","嘉義市","嘉義縣","屏東縣","宜蘭縣","花蓮縣","台東縣","澎湖縣","金門縣","連江縣"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-tea-text mb-2">
                      詳細地址 *
                    </label>
                    <input
                      type="text"
                      name="address"
                      required
                      value={form.address}
                      onChange={handleChange}
                      placeholder="鄉鎮市區、街道路、門牌號"
                      className="w-full border border-tea-green-pale rounded-xl px-4 py-3 text-sm text-tea-text placeholder-tea-text-light/60 focus:outline-none focus:border-tea-green bg-tea-cream-light/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-tea-text mb-2">
                      備註（選填）
                    </label>
                    <textarea
                      name="note"
                      value={form.note}
                      onChange={handleChange}
                      rows={3}
                      placeholder="如有特殊需求請在此說明"
                      className="w-full border border-tea-green-pale rounded-xl px-4 py-3 text-sm text-tea-text placeholder-tea-text-light/60 focus:outline-none focus:border-tea-green bg-tea-cream-light/50 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-white rounded-2xl p-7 shadow-sm">
                <h2 className="font-serif text-xl font-bold text-tea-text mb-6">
                  付款方式
                </h2>
                <div className="space-y-3">
                  {[
                    { value: "credit", label: "信用卡付款", desc: "Visa / Mastercard / JCB" },
                    { value: "cod", label: "貨到付款", desc: "收貨時現金支付" },
                    { value: "transfer", label: "銀行轉帳", desc: "匯款後請上傳收據" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
                        form.payment === opt.value
                          ? "border-tea-green bg-tea-green-mist"
                          : "border-tea-green-pale hover:bg-tea-cream-light"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={opt.value}
                        checked={form.payment === opt.value}
                        onChange={handleChange}
                        className="accent-tea-green"
                      />
                      <div>
                        <div className="text-sm font-medium text-tea-text">
                          {opt.label}
                        </div>
                        <div className="text-xs text-tea-text-light mt-0.5">
                          {opt.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
                <h2 className="font-serif text-xl font-bold text-tea-text mb-5">
                  訂單確認
                </h2>
                <div className="space-y-3 mb-5">
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-tea-text-light">
                        {item.product.name} × {item.quantity}
                      </span>
                      <span className="text-tea-text font-medium">
                        NT${(item.product.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-tea-green-pale pt-4 mb-6">
                  <div className="flex justify-between text-sm text-tea-text-light mb-2">
                    <span>運費</span>
                    <span className="text-tea-green">免費</span>
                  </div>
                  <div className="flex justify-between font-bold text-tea-text">
                    <span>總金額</span>
                    <span className="text-tea-green text-lg">
                      NT${totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-tea-green hover:bg-tea-green-dark text-white py-3.5 rounded-full font-medium transition-colors"
                >
                  確認訂購
                </button>
                <Link
                  href="/cart"
                  className="block text-center text-tea-text-light hover:text-tea-green text-sm mt-4 transition-colors"
                >
                  返回購物車
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
