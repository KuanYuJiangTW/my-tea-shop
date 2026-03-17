"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors]     = useState<{ email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/account";

  function validate() {
    const e: { email?: string; password?: string } = {};
    if (!emailRegex.test(email)) e.email = "請輸入有效的 Email 格式";
    if (password.length < 6)    e.password = "密碼長度至少 6 個字元";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setGeneralError("");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setGeneralError("Email 或密碼錯誤，請再試一次。");
      setLoading(false);
    } else {
      router.push(redirectTo);
      router.refresh();
    }
  }

  const inputCls = (hasError: boolean) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-tea-text placeholder-tea-text-light/50 focus:outline-none focus:ring-2 bg-tea-cream-light/50 transition ${
      hasError ? "border-rose-300 focus:ring-rose-300" : "border-tea-green-pale focus:ring-tea-green focus:border-tea-green"
    }`;

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
          <h1 className="text-2xl font-bold text-tea-text mt-4 mb-1">歡迎回來</h1>
          <p className="text-sm text-tea-text-light">登入您的會員帳號</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-tea-green-pale p-8">
          {generalError && (
            <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-600">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">電子郵件</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                placeholder="your@email.com"
                autoComplete="email"
                className={inputCls(!!errors.email)}
              />
              {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
                placeholder="••••••••"
                autoComplete="current-password"
                className={inputCls(!!errors.password)}
              />
              {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-tea-green hover:bg-tea-green-dark disabled:opacity-60 text-white rounded-full font-medium text-sm transition-colors mt-2"
            >
              {loading ? "登入中…" : "登入"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-tea-text-light mt-6">
          還沒有帳號？{" "}
          <Link href="/auth/register" className="text-tea-green hover:text-tea-green-dark font-medium transition-colors">
            立即註冊
          </Link>
        </p>
      </div>
    </div>
  );
}
