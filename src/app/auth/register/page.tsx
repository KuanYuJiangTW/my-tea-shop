"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { WELCOME_COUPON } from "@/lib/coupon-constants";
import SocialAuthButtons from "../SocialAuthButtons";
import WelcomeCouponBadge from "../WelcomeCouponBadge";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
};

function RegisterForm() {
  const searchParams  = useSearchParams();
  const locale        = useLocale();
  const t             = useTranslations("auth.register");
  const lp = (path: string) => locale === "en" ? `/en${path}` : path;
  const redirectTo    = searchParams.get("redirect") ?? lp("/account");

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [errors, setErrors]     = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  /**
   * OAuth／驗證信完成後導回的位址。`next` 只在目的地不是 callback 自己的預設
   * （`/account`）時才帶——所以 en 版的 `/en/account` 一定會帶上，不會被導回中文版。
   */
  function callbackUrl() {
    const next = redirectTo !== "/account" ? `?next=${encodeURIComponent(redirectTo)}` : "";
    return `${window.location.origin}/auth/callback${next}`;
  }

  function validate(): boolean {
    const e: FieldErrors = {};
    const trimmedName = name.trim();
    if (trimmedName.length < 2)                     e.name = t("errors.nameTooShort");
    else if (/^\d+$/.test(trimmedName))             e.name = t("errors.nameOnlyNumbers");
    if (!emailRegex.test(email))                    e.email = t("errors.emailInvalid");
    if (password.length < 8)                        e.password = t("errors.passwordTooShort");
    else if (!/[A-Za-z]/.test(password))            e.password = t("errors.passwordNeedLetter");
    else if (!/\d/.test(password))                  e.password = t("errors.passwordNeedNumber");
    if (password !== confirm)                       e.confirm = t("errors.passwordMismatch");
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
        emailRedirectTo: callbackUrl(),
      },
    });

    setLoading(false);
    if (error) {
      if (error.message.includes("already registered") || error.message.includes("User already registered")) {
        setGeneralError(t("errors.alreadyRegistered"));
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
          <h2 className="font-serif text-2xl font-bold text-tea-text mb-3">{t("success.title")}</h2>
          <p className="text-tea-text-light text-sm leading-relaxed mb-2">
            {t.rich("success.checkEmail", { email, strong: (chunks) => <strong className="text-tea-text">{chunks}</strong> })}
          </p>
          <p className="text-tea-text-light text-sm leading-relaxed mb-5">
            {t("success.clickLink")}
          </p>

          {/* 這裡刻意**不**秀券碼——券是 /auth/callback 在信箱驗證後才發的，
              此刻資料庫裡還沒有這張券，秀不出真的碼。改成把券當成「去點驗證信」
              的誘因，反而打在真正的流失點上：沒點驗證信的人一張券都拿不到。 */}
          <div className="mb-8 px-4 py-3 rounded-card bg-tea-green-mist border border-tea-green-pale">
            <p className="text-caption text-tea-green-ink">
              {t("success.couponPending", { amount: WELCOME_COUPON.discountAmount.toLocaleString() })}
            </p>
          </div>

          <Link
            href={lp("/auth/login")}
            className="inline-block px-8 py-3 bg-tea-green hover:bg-tea-green-dark text-white rounded-full font-medium text-sm transition-colors"
          >
            {t("success.goLogin")}
          </Link>
          <p className="text-xs text-tea-text-light mt-4">{t("success.checkSpam")}</p>
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
          <h1 className="text-2xl font-bold text-tea-text mt-4 mb-1">{t("title")}</h1>
          <p className="text-sm text-tea-text-light">{t("subtitle")}</p>

          {/* 券的誘因擺在表單「上方」而不是下方：這是決定要不要填這張表的當下，
              放在送出鈕旁邊就太晚了。 */}
          <WelcomeCouponBadge showNote className="mt-4" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-tea-green-pale p-8">
          {/* 第三方一鍵註冊，三個 provider 與登入頁一致。
              注意：FB 只要 public_profile、不拿 email，所以這裡進來的新帳號
              `user.email` 會是空的。會員中心有綁定入口（AccountClient 的
              handleBindEmail），但在他綁定之前：
                - `POST /api/bookings` 會撞 `booker_email NOT NULL` → 500
                - `POST /api/waitlist` 會存空字串 → 遞補通知靜默失效
              這兩條的防護尚未補上，見 WORKLOG。 */}
          <SocialAuthButtons
            namespace="auth.register"
            callbackUrl={callbackUrl}
            showFacebook
            onError={setGeneralError}
          />

          {/* 分隔線 */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-tea-green-pale" />
            <span className="text-xs text-tea-text-light">{t("orEmail")}</span>
            <div className="flex-1 h-px bg-tea-green-pale" />
          </div>

          {generalError && (
            <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-600">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* 姓名 */}
            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">{t("name")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); clearError("name"); }}
                placeholder={t("namePlaceholder")}
                autoComplete="name"
                className={inputCls(errors.name)}
              />
              {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">{t("email")}</label>
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

            {/* 密碼 */}
            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">{t("password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError("password"); clearError("confirm"); }}
                placeholder={t("passwordPlaceholder")}
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

            {/* 確認密碼 */}
            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">{t("confirmPassword")}</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); clearError("confirm"); }}
                placeholder={t("confirmPlaceholder")}
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
              {loading ? t("registering") : t("registerBtn")}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-tea-text-light mt-6">
          {t("haveAccount")}{" "}
          <Link
            href={`${lp("/auth/login")}${redirectTo !== lp("/account") ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
            className="text-tea-green hover:text-tea-green-dark font-medium transition-colors"
          >
            {t("loginLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
