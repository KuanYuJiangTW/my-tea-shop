"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import type {
  PaymentMethod,
  DeliveryType,
  CheckoutForm,
  EcpayCheckoutResponse,
} from "@/types";

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [codSuccess, setCodSuccess] = useState(false);
  const [payment, setPayment]       = useState<PaymentMethod>("online");
  const [delivery, setDelivery]     = useState<DeliveryType>("home");
  const [ecpayData, setEcpayData]   = useState<EcpayCheckoutResponse | null>(null);
  const ecpayFormRef = useRef<HTMLFormElement>(null);

  // 運費：未滿 1000 元 — 宅配 +250、超商 +60，滿 1000 元免運
  const shippingFee = totalPrice >= 1000 ? 0 : delivery === "home" ? 250 : 60;
  const grandTotal  = totalPrice + shippingFee;

  const [form, setForm] = useState<CheckoutForm>({
    name: "", email: "", phone: "",
    city: "", address: "",
    cvsCompany: "seven", cvsStoreName: "",
    note: "",
  });

  useEffect(() => {
    if (ecpayData && ecpayFormRef.current) {
      ecpayFormRef.current.submit();
    }
  }, [ecpayData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    // 貨到付款：直接顯示訂單成立
    if (payment === "cod") {
      await new Promise(r => setTimeout(r, 800)); // 模擬送出
      clearCart();
      setCodSuccess(true);
      setSubmitting(false);
      return;
    }

    // 線上付款：轉至綠界
    try {
      const res = await fetch("/api/ecpay/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          items: items.map(i => ({ name: i.product.name, quantity: i.quantity })),
          totalPrice: grandTotal,
        }),
      });
      if (!res.ok) throw new Error();
      setEcpayData(await res.json());
    } catch {
      setError("連線失敗，請稍後再試。");
      setSubmitting(false);
    }
  };

  const inputCls = "w-full border border-tea-green-pale rounded-xl px-4 py-3 text-sm text-tea-text placeholder-tea-text-light/60 focus:outline-none focus:border-tea-green bg-tea-cream-light/50";

  // 貨到付款成功畫面
  if (codSuccess) {
    return (
      <div className="min-h-screen bg-tea-cream-light flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-tea-green-mist rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7D9B84" strokeWidth="2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="font-serif text-3xl font-bold text-tea-text mb-3">訂單已成立！</h2>
          <p className="text-tea-text-light mb-2">
            感謝您的訂購，我們將盡快為您準備商品。
          </p>
          <p className="text-tea-text-light text-sm mb-2">
            配送方式：{delivery === "home" ? "宅配到府" : `超商店到店（${form.cvsCompany === "seven" ? "7-ELEVEN" : form.cvsCompany === "family" ? "全家" : form.cvsCompany === "hilife" ? "萊爾富" : "OK 超商"}）`}
          </p>
          <p className="text-tea-text-light text-sm mb-10">付款方式：貨到付款</p>
          <Link href="/" className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3.5 rounded-full font-medium transition-colors">
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
          <Link href="/products" className="bg-tea-green text-white px-8 py-3.5 rounded-full font-medium">
            去選購茶品
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tea-cream-light">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-8 md:mb-10">結帳</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">

              {/* 聯絡資料 */}
              <div className="bg-white rounded-2xl p-7 shadow-sm">
                <h2 className="font-serif text-xl font-bold text-tea-text mb-6">聯絡資料</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-tea-text mb-2">姓名 *</label>
                    <input type="text" name="name" required value={form.name} onChange={handleChange} placeholder="請輸入您的姓名" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-tea-text mb-2">電話 *</label>
                    <input type="tel" name="phone" required value={form.phone} onChange={handleChange} placeholder="0912-345-678" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-tea-text mb-2">電子郵件 *</label>
                    <input type="email" name="email" required value={form.email} onChange={handleChange} placeholder="your@email.com" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* 付款方式 */}
              <div className="bg-white rounded-2xl p-7 shadow-sm">
                <h2 className="font-serif text-xl font-bold text-tea-text mb-5">付款方式</h2>
                <div className="space-y-3">
                  {([
                    { value: "online" as PaymentMethod, label: "線上付款", desc: "信用卡、ATM 轉帳、超商代碼（由綠界金流處理）",
                      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
                    { value: "cod" as PaymentMethod, label: "貨到付款", desc: "商品送達時以現金付款，適用宅配及超商店到店",
                      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2"/><path d="M3 8h14v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/><path d="M6 8V6a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> },
                  ]).map(opt => (
                    <label key={opt.value} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${payment === opt.value ? "border-tea-green bg-tea-green-mist" : "border-tea-green-pale hover:bg-tea-cream-light"}`}>
                      <input type="radio" name="payment" value={opt.value} checked={payment === opt.value}
                        onChange={() => setPayment(opt.value)} className="accent-tea-green mt-0.5" />
                      <div className={`mt-0.5 ${payment === opt.value ? "text-tea-green" : "text-tea-text-light"}`}>{opt.icon}</div>
                      <div>
                        <div className="text-sm font-medium text-tea-text">{opt.label}</div>
                        <div className="text-xs text-tea-text-light mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 配送方式 */}
              <div className="bg-white rounded-2xl p-7 shadow-sm">
                <h2 className="font-serif text-xl font-bold text-tea-text mb-5">配送方式</h2>
                <div className="space-y-3 mb-6">
                  {([
                    { value: "home" as DeliveryType, label: "宅配到府", desc: "黑貓宅急便，送達您指定的地址",
                      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
                    { value: "cvs" as DeliveryType, label: "超商店到店", desc: "7-ELEVEN、全家、萊爾富、OK 超商取貨付款",
                      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3h18v4H3z"/><path d="M3 7v13h18V7"/><path d="M9 7v13M15 7v13"/></svg> },
                  ]).map(opt => (
                    <label key={opt.value} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${delivery === opt.value ? "border-tea-green bg-tea-green-mist" : "border-tea-green-pale hover:bg-tea-cream-light"}`}>
                      <input type="radio" name="delivery" value={opt.value} checked={delivery === opt.value}
                        onChange={() => setDelivery(opt.value)} className="accent-tea-green mt-0.5" />
                      <div className={`mt-0.5 ${delivery === opt.value ? "text-tea-green" : "text-tea-text-light"}`}>{opt.icon}</div>
                      <div>
                        <div className="text-sm font-medium text-tea-text">{opt.label}</div>
                        <div className="text-xs text-tea-text-light mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* 宅配地址 */}
                {delivery === "home" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-tea-text mb-2">縣市 *</label>
                      <select name="city" required value={form.city} onChange={handleChange} className={inputCls}>
                        <option value="">請選擇縣市</option>
                        {["台北市","新北市","桃園市","台中市","台南市","高雄市","基隆市","新竹市","新竹縣","苗栗縣","彰化縣","南投縣","雲林縣","嘉義市","嘉義縣","屏東縣","宜蘭縣","花蓮縣","台東縣","澎湖縣","金門縣","連江縣"].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-tea-text mb-2">詳細地址 *</label>
                      <input type="text" name="address" required value={form.address} onChange={handleChange}
                        placeholder="鄉鎮市區、街道路、門牌號" className={inputCls} />
                    </div>
                  </div>
                )}

                {/* 超商店到店 */}
                {delivery === "cvs" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-tea-text mb-2">超商品牌 *</label>
                      <select name="cvsCompany" required value={form.cvsCompany} onChange={handleChange} className={inputCls}>
                        <option value="seven">7-ELEVEN</option>
                        <option value="family">全家 FamilyMart</option>
                        <option value="hilife">萊爾富 Hi-Life</option>
                        <option value="ok">OK 超商</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-tea-text mb-2">門市名稱 *</label>
                      <input type="text" name="cvsStoreName" required value={form.cvsStoreName} onChange={handleChange}
                        placeholder="例：台北忠孝門市" className={inputCls} />
                    </div>
                    <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-3">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <p className="text-xs text-amber-700">請確認門市名稱正確，商品到店後將以簡訊通知取貨。</p>
                    </div>
                  </div>
                )}

                {/* 備註 */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-tea-text mb-2">備註（選填）</label>
                  <textarea name="note" value={form.note} onChange={handleChange} rows={3}
                    placeholder="如有特殊需求請在此說明" className={`${inputCls} resize-none`} />
                </div>
              </div>

            </div>

            {/* 訂單摘要 */}
            <div>
              <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
                <h2 className="font-serif text-xl font-bold text-tea-text mb-5">訂單確認</h2>
                <div className="space-y-3 mb-5">
                  {items.map(item => (
                    <div key={item.product.id} className="flex justify-between text-sm">
                      <span className="text-tea-text-light">{item.product.name} × {item.quantity}</span>
                      <span className="text-tea-text font-medium">NT${(item.product.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-tea-green-pale pt-4 mb-6 space-y-2">
                  <div className="flex justify-between text-sm text-tea-text-light">
                    <span>運費</span>
                    {shippingFee === 0 ? (
                      <span className="text-tea-green">免費</span>
                    ) : (
                      <span className="text-tea-text">NT${shippingFee.toLocaleString()}</span>
                    )}
                  </div>
                  {shippingFee > 0 && (
                    <p className="text-xs text-amber-600">滿 NT$1,000 即享免運費</p>
                  )}
                  <div className="flex justify-between text-sm text-tea-text-light">
                    <span>付款</span>
                    <span>{payment === "online" ? "線上付款" : "貨到付款"}</span>
                  </div>
                  <div className="flex justify-between font-bold text-tea-text pt-1">
                    <span>總金額</span>
                    <span className="text-tea-green text-lg">NT${grandTotal.toLocaleString()}</span>
                  </div>
                </div>
                {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
                <button type="submit" disabled={submitting}
                  className="w-full bg-tea-green hover:bg-tea-green-dark disabled:opacity-60 text-white py-3.5 rounded-full font-medium transition-colors flex items-center justify-center gap-2">
                  {submitting ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10"/>
                      </svg>
                      處理中...
                    </>
                  ) : payment === "online" ? (
                    <>
                      前往綠界付款
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </>
                  ) : (
                    <>
                      確認訂單
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </>
                  )}
                </button>
                <Link href="/cart" className="block text-center text-tea-text-light hover:text-tea-green text-sm mt-4 transition-colors">
                  返回購物車
                </Link>
              </div>
            </div>

          </div>
        </form>
      </div>

      {/* 綠界自動提交隱藏表單 */}
      {ecpayData && (
        <form ref={ecpayFormRef} method="POST" action={ecpayData.ecpayUrl} style={{ display: "none" }}>
          {Object.entries(ecpayData.params).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      )}
    </div>
  );
}
