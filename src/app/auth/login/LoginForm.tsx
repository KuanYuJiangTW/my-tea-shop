"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginMode = "password" | "magic";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginForm() {
  const [mode, setMode]             = useState<LoginMode>("password");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [errors, setErrors]         = useState<{ email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicSent, setMagicSent]   = useState(false);
  const router      = useRouter();
  const searchParams = useSearchParams();
  const redirectTo  = searchParams.get("redirect") ?? "/account";

  function callbackUrl() {
    const next = redirectTo !== "/account" ? `?next=${encodeURIComponent(redirectTo)}` : "";
    return `${window.location.origin}/auth/callback${next}`;
  }

  // ── 密碼登入 ──────────────────────────────────────────────────────────────
  async function handlePasswordLogin(ev: React.FormEvent) {
    ev.preventDefault();
    const e: { email?: string; password?: string } = {};
    if (!emailRegex.test(email)) e.email = "請輸入有效的 Email 格式";
    if (password.length < 6)    e.password = "密碼長度至少 6 個字元";
    setErrors(e);
    if (Object.keys(e).length) return;

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

  // ── Magic Link ────────────────────────────────────────────────────────────
  async function handleMagicLink(ev: React.FormEvent) {
    ev.preventDefault();
    if (!emailRegex.test(email)) {
      setErrors({ email: "請輸入有效的 Email 格式" });
      return;
    }
    setLoading(true);
    setGeneralError("");
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl(), shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("not found") || error.message.toLowerCase().includes("not registered")) {
        setGeneralError("此 Email 尚未註冊，請先建立帳號。");
      } else {
        setGeneralError("傳送失敗，請稍後再試。");
      }
    } else {
      setMagicSent(true);
    }
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  async function handleGoogleLogin() {
    setGoogleLoading(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
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
          {/* Google 一鍵登入 */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors disabled:opacity-60"
          >
            <GoogleIcon />
            {googleLoading ? "連線中…" : "使用 Google 帳號登入"}
          </button>

          {/* 分隔線 */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-tea-green-pale" />
            <span className="text-xs text-tea-text-light">或</span>
            <div className="flex-1 h-px bg-tea-green-pale" />
          </div>

          {/* 登入方式切換 */}
          <div className="flex gap-1 mb-5 bg-tea-cream-light rounded-xl p-1">
            {(["password", "magic"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setErrors({}); setGeneralError(""); setMagicSent(false); }}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  mode === m ? "bg-white text-tea-text shadow-sm" : "text-tea-text-light hover:text-tea-text"
                }`}
              >
                {m === "password" ? "密碼登入" : "Email 連結"}
              </button>
            ))}
          </div>

          {generalError && (
            <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-600">
              {generalError}
            </div>
          )}

          {/* 密碼登入 */}
          {mode === "password" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4" noValidate>
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
          )}

          {/* Email 連結（Magic Link） */}
          {mode === "magic" && (
            magicSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-tea-green-mist rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7D9B84" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-tea-text mb-1">連結已寄出！</p>
                <p className="text-xs text-tea-text-light">
                  請前往 <strong className="text-tea-text">{email}</strong> 點擊登入連結
                </p>
                <p className="text-xs text-tea-text-light mt-1">沒有收到？請檢查垃圾信件夾</p>
                <button
                  type="button"
                  onClick={() => setMagicSent(false)}
                  className="mt-4 text-xs text-tea-green hover:text-tea-green-dark underline"
                >
                  重新輸入
                </button>
              </div>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-tea-text mb-1.5">電子郵件</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className={inputCls(!!errors.email)}
                  />
                  {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
                  <p className="mt-1.5 text-xs text-tea-text-light">我們將發送一次性登入連結到您的信箱</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-tea-green hover:bg-tea-green-dark disabled:opacity-60 text-white rounded-full font-medium text-sm transition-colors"
                >
                  {loading ? "傳送中…" : "發送登入連結"}
                </button>
              </form>
            )
          )}
        </div>

        <p className="text-center text-sm text-tea-text-light mt-6">
          還沒有帳號？{" "}
          <Link
            href={`/auth/register${redirectTo !== "/account" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
            className="text-tea-green hover:text-tea-green-dark font-medium transition-colors"
          >
            立即註冊
          </Link>
        </p>
      </div>
    </div>
  );
}
