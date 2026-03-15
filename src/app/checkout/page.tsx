"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CheckoutPage() {
  const { items, totalPrice } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [ecpayData, setEcpayData]   = useState<{ ecpayUrl: string; params: Record<string, string> } | null>(null);
  const ecpayFormRef = useRef<HTMLFormElement>(null);

  // ecpayData 設定後，React 重渲染完成即自動提交隱藏表單
  useEffect(() => {
    if (ecpayData && ecpayFormRef.current) {
      ecpayFormRef.current.submit();
    }
  }, [ecpayData]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    note: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/ecpay/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          items: items.map(i => ({ name: i.product.name, quantity: i.quantity })),
          totalPrice,
        }),
      });

      if (!res.ok) throw new Error("伺服器錯誤");

      const data = await res.json();
      setEcpayData(data); // 觸發 useEffect → 自動提交隱藏表單
    } catch {
      setError("連線失敗，請稍後再試。");
      setSubmitting(false);
    }
  };

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
                <h2 className="font-serif text-xl font-bold text-tea-text mb-4">
                  付款方式
                </h2>
                <div className="flex items-start gap-3 bg-tea-green-mist rounded-xl p-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="#7D9B84" strokeWidth="1.8" className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-sm text-tea-text-light leading-relaxed">
                    點擊「前往綠界付款」後，將跳轉至綠界金流頁面，
                    支援<span className="text-tea-text font-medium">信用卡、ATM 轉帳、超商代碼</span>等多種付款方式。
                  </p>
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
                {error && (
                  <p className="text-red-400 text-sm text-center mb-3">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-tea-green hover:bg-tea-green-dark disabled:opacity-60 text-white py-3.5 rounded-full font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                        <path d="M12 2a10 10 0 0110 10"/>
                      </svg>
                      跳轉中...
                    </>
                  ) : (
                    <>
                      前往綠界付款
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </>
                  )}
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

      {/* 綠界自動提交隱藏表單 */}
      {ecpayData && (
        <form
          ref={ecpayFormRef}
          method="POST"
          action={ecpayData.ecpayUrl}
          style={{ display: "none" }}
        >
          {Object.entries(ecpayData.params).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      )}
    </div>
  );
}
