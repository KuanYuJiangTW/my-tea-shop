"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import SocialAuthButtons from "../SocialAuthButtons";
import WelcomeCouponBadge from "../WelcomeCouponBadge";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginMode = "password" | "magic";

export default function LoginForm() {
  const [mode, setMode]             = useState<LoginMode>("password");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [errors, setErrors]         = useState<{ email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading]           = useState(false);
  const [magicSent, setMagicSent]       = useState(false);
  const router      = useRouter();
  const locale      = useLocale();
  const t           = useTranslations("auth.login");
  const lp = (path: string) => locale === "en" ? `/en${path}` : path;
  const searchParams = useSearchParams();
  const redirectTo  = searchParams.get("redirect") ?? lp("/account");

  /**
   * OAuth／Magic Link 完成後導回的位址。`next` 只在目的地不是 callback 自己的預設
   * （`/account`）時才帶——原本是跟 `lp("/account")` 比，en 版比出來相等於是不帶
   * `next`，結果英文使用者登入後被導去中文版 `/account`。
   */
  function callbackUrl() {
    const next = redirectTo !== "/account" ? `?next=${encodeURIComponent(redirectTo)}` : "";
    return `${window.location.origin}/auth/callback${next}`;
  }

  // ── 密碼登入 ──────────────────────────────────────────────────────────────
  async function handlePasswordLogin(ev: React.FormEvent) {
    ev.preventDefault();
    const e: { email?: string; password?: string } = {};
    if (!emailRegex.test(email)) e.email = t("errors.emailInvalid");
    if (password.length < 6)    e.password = t("errors.passwordTooShort");
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    setGeneralError("");
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setGeneralError(t("errors.wrongCredentials"));
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
      setErrors({ email: t("errors.emailInvalid") });
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
        setGeneralError(t("errors.notRegistered"));
      } else {
        setGeneralError(t("errors.sendFailed"));
      }
    } else {
      setMagicSent(true);
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
          <h1 className="text-2xl font-normal text-tea-text mt-4 mb-1 tracking-display">{t("title")}</h1>
          <p className="text-sm text-tea-text-muted">{t("subtitle")}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-tea-green-pale p-8">
          {/* 第三方一鍵登入（含 LINE 內建瀏覽器 fallback 與行動裝置警告） */}
          <SocialAuthButtons
            namespace="auth.login"
            callbackUrl={callbackUrl}
            showFacebook
            onError={setGeneralError}
          />

          {/* 分隔線 */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-tea-green-pale" />
            <span className="text-xs text-tea-text-muted">{t("or")}</span>
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
                  mode === m ? "bg-white text-tea-text shadow-sm" : "text-tea-text-muted hover:text-tea-text"
                }`}
              >
                {m === "password" ? t("passwordMode") : t("magicMode")}
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
                <label className="block text-sm font-medium text-tea-text mb-1.5">{t("email")}</label>
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
                <label className="block text-sm font-medium text-tea-text mb-1.5">{t("password")}</label>
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
                className="w-full py-3 bg-tea-green-dark hover:bg-tea-green-ink disabled:opacity-60 text-white rounded-full font-medium text-sm transition-colors mt-2"
              >
                {loading ? t("loggingIn") : t("loginBtn")}
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
                <p className="text-sm font-medium text-tea-text mb-1">{t("magicLinkSent")}</p>
                <p className="text-xs text-tea-text-muted">
                  {t("magicLinkSentHint", { email })}
                </p>
                <p className="text-xs text-tea-text-muted mt-1">{t("checkSpam")}</p>
                <button
                  type="button"
                  onClick={() => setMagicSent(false)}
                  className="mt-4 text-xs text-tea-green-ink hover:text-tea-green-dark underline"
                >
                  {t("reenter")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-tea-text mb-1.5">{t("email")}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className={inputCls(!!errors.email)}
                  />
                  {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
                  <p className="mt-1.5 text-xs text-tea-text-muted">{t("magicLinkHint")}</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-tea-green-dark hover:bg-tea-green-ink disabled:opacity-60 text-white rounded-full font-medium text-sm transition-colors"
                >
                  {loading ? t("sending") : t("sendLink")}
                </button>
              </form>
            )
          )}
        </div>

        {/* 券的提示要放在登入頁：從這頁用 LINE／Google 進來的新客同樣會拿到券，
            原本只有註冊頁講，等於誘因只講給走 email 的那一半人聽。 */}
        <div className="text-center mt-6">
          <p className="text-sm text-tea-text-muted">
            {t("noAccount")}{" "}
            <Link
              href={lp(`/auth/register${redirectTo !== lp("/account") ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`)}
              className="text-tea-green-ink hover:text-tea-green-dark font-medium transition-colors"
            >
              {t("register")}
            </Link>
          </p>
          <WelcomeCouponBadge className="mt-2.5" />
        </div>
      </div>
    </div>
  );
}
