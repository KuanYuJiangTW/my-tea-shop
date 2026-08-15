"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { Provider } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

/**
 * 登入頁與註冊頁共用的第三方登入區塊。
 *
 * 為什麼要抽出來：原本兩頁各自複製了一份 icon、LINE 內建瀏覽器偵測、fallback banner
 * 與 OAuth 呼叫。結果是註冊頁把 LINE 的**配套**（偵測、banner、Google 停用提示）都
 * 複製了，卻漏掉 LINE 按鈕本身——新客只看得到 Google 和一張四欄表單。邏輯共用之後，
 * 這種「改一頁漏一頁」不會再發生。
 *
 * 刻意**不**共用的是文案：登入頁講「登入」、註冊頁講「繼續」，各自讀自己的 namespace。
 */

/**
 * LINE 登入是在 Supabase 後台以 Custom Provider 設定的，名稱為 `custom:line`。
 * Supabase 的 `Provider` 型別是固定的字串聯集、不含 custom provider，因此需要斷言。
 * 斷言成 `Provider` 只放掉「這個字串不在聯集內」這一件事，其餘欄位仍受檢查。
 */
const LINE_PROVIDER = "custom:line" as Provider;

function isLineInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Line\//i.test(navigator.userAgent) || /LIFF/i.test(navigator.userAgent);
}

/** 跳出 LINE 內建瀏覽器、改用系統瀏覽器開啟同一頁 */
function openInExternalBrowser() {
  const url = window.location.href;
  if (/Android/i.test(navigator.userAgent)) {
    window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
  } else {
    window.location.href = url;
  }
}

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

type Props = {
  /** 文案 namespace，`auth.login` 或 `auth.register` */
  namespace: string;
  /** OAuth 完成後導回的 `/auth/callback` 絕對網址（含 `next` 參數） */
  callbackUrl: () => string;
  /**
   * 是否顯示 Facebook。註冊頁目前關閉：FB 只要 `public_profile`、不拿 email，
   * 而 `POST /api/bookings` 直接寫 `booker_email: user.email`，FB 新客的預約會存成 null。
   * 修好那條再打開。
   */
  showFacebook?: boolean;
  /** 錯誤訊息交給頁面顯示（兩頁的錯誤區塊位置不同） */
  onError: (message: string) => void;
};

export default function SocialAuthButtons({
  namespace,
  callbackUrl,
  showFacebook = false,
  onError,
}: Props) {
  const t = useTranslations(namespace);
  const [googleLoading, setGoogleLoading]     = useState(false);
  const [lineLoading, setLineLoading]         = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [showLineFallback, setShowLineFallback]   = useState(false);
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  const busy = googleLoading || lineLoading || facebookLoading;

  useEffect(() => {
    if (!isLineInAppBrowser()) return;
    openInExternalBrowser();
    // 1.5 秒後若仍在此頁（跳轉失敗），顯示 fallback 提示
    const timer = setTimeout(() => setShowLineFallback(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  function startOAuth(provider: Provider) {
    const supabase = getSupabaseBrowserClient();
    return supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl(),
        // Facebook 不要求 email，結帳時讓用戶自填
        ...(provider === "facebook" ? { scopes: "public_profile" } : {}),
      },
    });
  }

  function handleGoogle() {
    if (showLineFallback) {
      onError(t("inAppBrowser.googleDisabled"));
      return;
    }
    setGoogleLoading(true);
    startOAuth("google");
  }

  function handleLine() {
    // 行動裝置提示跨瀏覽器問題（Android / iOS / iPadOS 皆可能發生）
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      setShowMobileWarning(true);
      return;
    }
    setLineLoading(true);
    startOAuth(LINE_PROVIDER);
  }

  function handleLineConfirm() {
    setShowMobileWarning(false);
    setLineLoading(true);
    startOAuth(LINE_PROVIDER);
  }

  function handleFacebook() {
    setFacebookLoading(true);
    startOAuth("facebook");
  }

  return (
    <>
      {/* LINE 內建瀏覽器 fallback 提示（跳轉失敗才顯示） */}
      {showLineFallback && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <p className="mb-2">{t("inAppBrowser.banner")}</p>
          <button
            type="button"
            onClick={openInExternalBrowser}
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

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors disabled:opacity-60"
        >
          <GoogleIcon />
          {googleLoading ? t("connecting") : t("googleLogin")}
        </button>
        <button
          type="button"
          onClick={handleLine}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#06C755] hover:bg-[#f0fdf4] text-sm font-medium text-[#06C755] transition-colors disabled:opacity-60"
        >
          <LineIcon />
          {lineLoading ? t("connecting") : t("lineLogin")}
        </button>
        {showFacebook && (
          <button
            type="button"
            onClick={handleFacebook}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#1877F2] hover:bg-[#eff6ff] text-sm font-medium text-[#1877F2] transition-colors disabled:opacity-60"
          >
            <FacebookIcon />
            {facebookLoading ? t("connecting") : t("facebookLogin")}
          </button>
        )}
      </div>

      {/* 行動裝置 LINE 跨瀏覽器警告 Modal */}
      {showMobileWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileWarning(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <h3 className="font-semibold text-tea-text">{t("mobileLineWarning.title")}</h3>
            </div>
            <p className="text-sm text-tea-text-light mb-2">{t("mobileLineWarning.desc1")}</p>
            <p className="text-sm text-tea-text-light mb-5">{t("mobileLineWarning.desc2")}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowMobileWarning(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-tea-green-pale text-sm font-medium text-tea-text hover:bg-tea-cream-light transition"
              >
                {t("mobileLineWarning.cancel")}
              </button>
              <button
                type="button"
                onClick={handleLineConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#06C755] text-sm font-medium text-[#06C755] hover:bg-[#f0fdf4] transition"
              >
                {t("mobileLineWarning.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
