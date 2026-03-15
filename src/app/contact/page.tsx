"use client";

import { useState } from "react";

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactPage() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<Status>("idle");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    // Simulate async submission
    await new Promise((r) => setTimeout(r, 1200));
    setStatus("success");
  }

  const inputClass =
    "w-full border border-tea-green-pale bg-white rounded-xl px-4 py-3 text-tea-text placeholder-tea-text-light/50 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/40 focus:border-tea-green transition";

  return (
    <div className="bg-tea-cream-light min-h-screen">
      {/* Page Header */}
      <section className="bg-tea-green-mist border-b border-tea-green-pale/50 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-tea-green text-xs tracking-[0.3em] uppercase font-medium mb-3">
            Contact Us
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-tea-text mb-3">
            聯絡我們
          </h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-4" />
          <p className="text-tea-text-light max-w-md mx-auto text-sm">
            有任何問題或想訂購批量茶葉，歡迎留言，我們會盡快回覆您
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

          {/* Left: Info */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="font-serif text-2xl font-bold text-tea-text mb-5">聯絡資訊</h2>
              <div className="space-y-5">
                {[
                  {
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    ),
                    label: "地址",
                    value: "嘉義縣梅山鄉太興村8鄰溪頭19號之2",
                  },
                  {
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.09 2.18 2 2 0 012.07 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" />
                      </svg>
                    ),
                    label: "電話",
                    value: "0972-619-391",
                  },
                  {
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    ),
                    label: "Email",
                    value: "qdbzdt2846@gmail.com",
                  },
                  {
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    ),
                    label: "回覆時間",
                    value: "週一至週五 09:00 – 18:00",
                  },
                ].map((item) => (
                  <div key={item.label} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-tea-green-mist rounded-xl flex items-center justify-center text-tea-green">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs text-tea-text-light mb-0.5">{item.label}</p>
                      <p className="text-tea-text text-sm font-medium">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-tea-green-pale" />

            {/* Note */}
            <div className="bg-tea-green-mist rounded-2xl p-6">
              <p className="font-serif text-tea-text font-semibold mb-2">批量訂購</p>
              <p className="text-tea-text-light text-sm leading-relaxed">
                如有批量採購需求，請在訊息中說明品項與數量，我們將提供專屬報價。
              </p>
            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-3">
            {status === "success" ? (
              <div className="flex flex-col items-center justify-center text-center py-24 px-8 bg-white rounded-2xl shadow-sm border border-tea-green-pale/40">
                <div className="w-16 h-16 bg-tea-green-mist rounded-full flex items-center justify-center mb-5">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7D9B84" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="font-serif text-2xl font-bold text-tea-text mb-2">訊息已送出！</h3>
                <p className="text-tea-text-light text-sm mb-8">感謝您的來信，我們會在 1–2 個工作天內回覆您。</p>
                <button
                  onClick={() => { setStatus("idle"); setForm({ name: "", email: "", subject: "", message: "" }); }}
                  className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3 rounded-full text-sm font-medium transition-colors"
                >
                  再次送出
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl shadow-sm border border-tea-green-pale/40 p-8 space-y-5"
              >
                <h2 className="font-serif text-2xl font-bold text-tea-text mb-1">傳送訊息</h2>
                <p className="text-tea-text-light text-sm mb-4">填寫下方表單，我們會盡快與您聯繫</p>

                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-tea-text mb-1.5">
                      姓名 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="王小明"
                      value={form.name}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-tea-text mb-1.5">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="example@mail.com"
                      value={form.email}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-medium text-tea-text mb-1.5">
                    主旨 <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="subject"
                    required
                    value={form.subject}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="" disabled>請選擇主旨</option>
                    <option value="product">產品詢問</option>
                    <option value="order">訂單問題</option>
                    <option value="wholesale">批量採購</option>
                    <option value="visit">茶園參訪</option>
                    <option value="other">其他</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-medium text-tea-text mb-1.5">
                    訊息內容 <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={6}
                    placeholder="請輸入您想詢問的內容..."
                    value={form.message}
                    onChange={handleChange}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="w-full bg-tea-green hover:bg-tea-green-dark disabled:opacity-60 text-white py-3.5 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {status === "submitting" ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0110 10" />
                      </svg>
                      送出中...
                    </>
                  ) : (
                    <>
                      送出訊息
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-tea-text-light">
                  送出即表示您同意我們的隱私政策，您的資料僅用於回覆本次詢問
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
