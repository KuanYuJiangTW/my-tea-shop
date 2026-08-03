"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { Provider } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

/**
 * LINE 登入是在 Supabase 後台以 Custom Provider 設定的，名稱為 `custom:line`。
 * Supabase 的 `Provider` 型別是固定的字串聯集、不含 custom provider，因此需要斷言。
 *
 * 原本兩處各寫 `"custom:line" as any`——`any` 會讓整個引數失去型別檢查（連 options
 * 都不再被檢查）。改為斷言成 `Provider` 只放掉「這個字串不在聯集內」這一件事，
 * 其餘欄位仍受檢查。字串值完全相同，無執行期差異。
 */
const LINE_PROVIDER = "custom:line" as Provider;

function isLineInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Line\//i.test(navigator.userAgent) || /LIFF/i.test(navigator.userAgent);
}

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

function LineIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="#06C755">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export default function LoginForm() {
  const [mode, setMode]             = useState<LoginMode>("password");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [errors, setErrors]         = useState<{ email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading]   = useState(false);
  const [lineLoading, setLineLoading]       = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [magicSent, setMagicSent]       = useState(false);
  const [showAndroidWarning, setShowAndroidWarning] = useState(false);
  const [showLineFallback, setShowLineFallback] = useState(false);
  const router      = useRouter();
  const locale      = useLocale();
  const t           = useTranslations("auth.login");
  const lp = (path: string) => locale === "en" ? `/en${path}` : path;
  const searchParams = useSearchParams();
  const redirectTo  = searchParams.get("redirect") ?? lp("/account");

  useEffect(() => {
    if (!isLineInAppBrowser()) return;
    // 嘗試跳轉外部瀏覽器
    const url = window.location.href;
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
    } else {
      window.location.href = url;
    }
    // 1.5 秒後若仍在此頁（跳轉失敗），顯示 fallback 提示
    const timer = setTimeout(() => setShowLineFallback(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  function callbackUrl() {
    const defaultRedirect = lp("/account");
    const next = redirectTo !== defaultRedirect ? `?next=${encodeURIComponent(redirectTo)}` : "";
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

  // ── Google OAuth ──────────────────────────────────────────────────────────
  async function handleGoogleLogin() {
    setGoogleLoading(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
  }

  // ── LINE OAuth（Supabase Custom Provider，名稱需與後台設定一致）──────────
  async function handleLineLogin() {
    // 行動裝置提示跨瀏覽器問題（Android / iOS / iPadOS 皆可能發生）
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      setShowAndroidWarning(true);
      return;
    }
    setLineLoading(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: LINE_PROVIDER,
      options: { redirectTo: callbackUrl() },
    });
  }

  function handleLineLoginConfirm() {
    setShowAndroidWarning(false);
    setLineLoading(true);
    const supabase = getSupabaseBrowserClient();
    supabase.auth.signInWithOAuth({
      provider: LINE_PROVIDER,
      options: { redirectTo: callbackUrl() },
    });
  }

  // ── Facebook OAuth ────────────────────────────────────────────────────────
  async function handleFacebookLogin() {
    setFacebookLoading(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: callbackUrl(),
        scopes: "public_profile", // 不要求 email，結帳時讓用戶自填
      },
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
          <h1 className="text-2xl font-bold text-tea-text mt-4 mb-1">{t("title")}</h1>
          <p className="text-sm text-tea-text-muted">{t("subtitle")}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-tea-green-pale p-8">
          {/* LINE 內建瀏覽器 fallback 提示（跳轉失敗才顯示） */}
          {showLineFallback && (
            <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <p className="mb-2">{t("inAppBrowser.banner")}</p>
              <button
                type="button"
                onClick={() => {
                  const url = window.location.href;
                  const isAndroid = /Android/i.test(navigator.userAgent);
                  if (isAndroid) {
                    window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
                  } else {
                    window.location.href = url;
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 rounded-lg text-xs font-medium transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                {t("inAppBrowser.openExternal")}
              </button>
            </div>
          )}

          {/* 第三方一鍵登入 */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                if (showLineFallback) {
                  setGeneralError(t("inAppBrowser.googleDisabled"));
                  return;
                }
                handleGoogleLogin();
              }}
              disabled={googleLoading || lineLoading || facebookLoading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors disabled:opacity-60"
            >
              <GoogleIcon />
              {googleLoading ? t("connecting") : t("googleLogin")}
            </button>
            <button
              type="button"
              onClick={handleLineLogin}
              disabled={googleLoading || lineLoading || facebookLoading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#06C755] hover:bg-[#f0fdf4] text-sm font-medium text-[#06C755] transition-colors disabled:opacity-60"
            >
              <LineIcon />
              {lineLoading ? t("connecting") : t("lineLogin")}
            </button>
            <button
              type="button"
              onClick={handleFacebookLogin}
              disabled={googleLoading || lineLoading || facebookLoading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#1877F2] hover:bg-[#eff6ff] text-sm font-medium text-[#1877F2] transition-colors disabled:opacity-60"
            >
              <FacebookIcon />
              {facebookLoading ? t("connecting") : t("facebookLogin")}
            </button>
          </div>

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
                className="w-full py-3 bg-tea-green-ink hover:bg-tea-green-deep disabled:opacity-60 text-white rounded-full font-medium text-sm transition-colors mt-2"
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
                  className="mt-4 text-xs text-tea-green-ink hover:text-tea-green-deep underline"
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
                  className="w-full py-3 bg-tea-green-ink hover:bg-tea-green-deep disabled:opacity-60 text-white rounded-full font-medium text-sm transition-colors"
                >
                  {loading ? t("sending") : t("sendLink")}
                </button>
              </form>
            )
          )}
        </div>

        <p className="text-center text-sm text-tea-text-muted mt-6">
          {t("noAccount")}{" "}
          <Link
            href={lp(`/auth/register${redirectTo !== lp("/account") ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`)}
            className="text-tea-green-ink hover:text-tea-green-deep font-medium transition-colors"
          >
            {t("register")}
          </Link>
        </p>
      </div>

      {/* Android LINE 跨瀏覽器警告 Modal */}
      {showAndroidWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAndroidWarning(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <h3 className="font-semibold text-tea-text">{t("mobileLineWarning.title")}</h3>
            </div>
            <p className="text-sm text-tea-text-muted mb-2">
              {t("mobileLineWarning.desc1")}
            </p>
            <p className="text-sm text-tea-text-muted mb-5">
              {t("mobileLineWarning.desc2")}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAndroidWarning(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-tea-green-pale text-sm font-medium text-tea-text hover:bg-tea-cream-light transition"
              >
                {t("mobileLineWarning.cancel")}
              </button>
              <button
                type="button"
                onClick={handleLineLoginConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#06C755] text-sm font-medium text-[#06C755] hover:bg-[#f0fdf4] transition"
              >
                {t("mobileLineWarning.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
