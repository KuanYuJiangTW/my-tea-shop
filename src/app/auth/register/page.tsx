"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
};

export default function RegisterPage() {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [errors, setErrors]     = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  function validate(): boolean {
    const e: FieldErrors = {};
    if (!name.trim() || name.trim().length < 2) e.name = "請輸入至少 2 個字的姓名";
    if (!emailRegex.test(email))                 e.email = "請輸入有效的 Email 格式";
    if (password.length < 8)                     e.password = "密碼至少 8 個字元";
    if (password !== confirm)                    e.confirm = "兩次輸入的密碼不一致";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function clearError(field: keyof FieldErrors) {
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setGeneralError("");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      if (error.message.includes("already registered") || error.message.includes("User already registered")) {
        setGeneralError("此 Email 已被註冊，請直接登入。");
      } else {
        setGeneralError(error.message);
      }
    } else {
      setSuccess(true);
    }
  }

  const inputCls = (hasError?: string) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-tea-text placeholder-tea-text-light/50 focus:outline-none focus:ring-2 bg-tea-cream-light/50 transition ${
      hasError
        ? "border-rose-300 focus:ring-rose-300"
        : "border-tea-green-pale focus:ring-tea-green focus:border-tea-green"
    }`;

  if (success) {
    return (
      <div className="min-h-screen bg-tea-cream-light flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-tea-green-mist rounded-full flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7D9B84" strokeWidth="2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl font-bold text-tea-text mb-3">驗證信已寄出！</h2>
          <p className="text-tea-text-light text-sm leading-relaxed mb-2">
            請前往 <strong className="text-tea-text">{email}</strong> 的信箱
          </p>
          <p className="text-tea-text-light text-sm leading-relaxed mb-8">
            點擊驗證連結後即可開始使用會員功能。
          </p>
          <Link
            href="/auth/login"
            className="inline-block px-8 py-3 bg-tea-green hover:bg-tea-green-dark text-white rounded-full font-medium text-sm transition-colors"
          >
            前往登入
          </Link>
          <p className="text-xs text-tea-text-light mt-4">沒有收到？請檢查垃圾信件夾</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tea-cream-light flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <svg width="44" height="44" viewBox="0 0 34 34" fill="none" className="mx-auto mb-3">
              <path d="M17 4C17 4 8 11 8 20C8 24.97 12.03 29 17 29C21.97 29 26 24.97 26 20C26 11 17 4 17 4Z" fill="#7D9B84" opacity="0.85"/>
              <path d="M17 9C17 9 12 15 12 20C12 22.76 14.24 25 17 25C19.76 25 22 22.76 22 20C22 15 17 9 17 9Z" fill="#A3BFA8"/>
              <line x1="17" y1="29" x2="17" y2="33" stroke="#5C7A67" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span className="font-serif text-xl font-bold text-tea-text block">霧抉茶</span>
          </Link>
          <h1 className="text-2xl font-bold text-tea-text mt-4 mb-1">建立帳號</h1>
          <p className="text-sm text-tea-text-light">加入霧抉茶，享受會員專屬服務</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-tea-green-pale p-8">
          {generalError && (
            <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-600">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); clearError("name"); }}
                placeholder="請輸入您的姓名"
                autoComplete="name"
                className={inputCls(errors.name)}
              />
              {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">電子郵件</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
                placeholder="your@email.com"
                autoComplete="email"
                className={inputCls(errors.email)}
              />
              {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError("password"); clearError("confirm"); }}
                placeholder="至少 8 個字元"
                autoComplete="new-password"
                className={inputCls(errors.password)}
              />
              {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password}</p>}
              {password.length > 0 && (
                <div className="mt-1.5 flex gap-1">
                  {[
                    password.length >= 8,
                    /[A-Za-z]/.test(password),
                    /\d/.test(password),
                  ].map((ok, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${ok ? "bg-tea-green" : "bg-gray-200"}`} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">確認密碼</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); clearError("confirm"); }}
                placeholder="再輸入一次密碼"
                autoComplete="new-password"
                className={inputCls(errors.confirm)}
              />
              {errors.confirm && <p className="mt-1 text-xs text-rose-500">{errors.confirm}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-tea-green hover:bg-tea-green-dark disabled:opacity-60 text-white rounded-full font-medium text-sm transition-colors mt-2"
            >
              {loading ? "處理中…" : "建立帳號"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-tea-text-light mt-6">
          已有帳號？{" "}
          <Link href="/auth/login" className="text-tea-green hover:text-tea-green-dark font-medium transition-colors">
            立即登入
          </Link>
        </p>
      </div>
    </div>
  );
}
