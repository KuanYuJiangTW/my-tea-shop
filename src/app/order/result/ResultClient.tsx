"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useLocale, useTranslations } from "next-intl";

function ResultContent() {
  const params      = useSearchParams();
  const stripeParam = params.get("stripe");
  const paypalParam = params.get("paypal");
  const isStripe    = stripeParam === "success" || stripeParam === "cancel";
  const isPaypal    = paypalParam === "success" || paypalParam === "cancel";
  const paypalToken = params.get("token"); // PayPal appends this on success
  const paypalOrderId = params.get("orderId"); // DB order ID on cancel
  const isIntlOrder   = params.get("intl") === "1";
  const success     = isStripe
    ? stripeParam === "success"
    : isPaypal
      ? false // PayPal success needs capture first
      : params.get("RtnCode") === "1";
  const { user }    = useAuth();
  const locale      = useLocale();
  const t           = useTranslations("orderResult");
  const lp = (path: string) => locale === "en" ? `/en${path}` : path;
  const tradeNo     = (!isStripe && !isPaypal) ? params.get("MerchantTradeNo") : null;
  const rtnMsg      = (!isStripe && !isPaypal) ? params.get("RtnMsg") : null;
  const isBooking   = tradeNo?.startsWith("B") ?? false;
  const { clearCart } = useCart();
  const clearedRef = useRef(false);

  // PayPal capture states
  const [paypalCapturing, setPaypalCapturing] = useState(false);
  const [paypalSuccess, setPaypalSuccess] = useState(false);
  const [paypalError, setPaypalError] = useState("");
  const [paypalRetrying, setPaypalRetrying] = useState(false);
  const [paypalCancelling, setPaypalCancelling] = useState(false);
  const paypalCaptureRef = useRef(false);

  // Clear cart on successful payment (safety net for Stripe redirect)
  useEffect(() => {
    if ((success || paypalSuccess) && !isBooking && !clearedRef.current) {
      clearedRef.current = true;
      clearCart();
      try { localStorage.removeItem("wujuetea_cart"); } catch {}
    }
  }, [success, paypalSuccess, isBooking, clearCart]);

  // PayPal: capture on success return
  useEffect(() => {
    if (paypalParam !== "success" || !paypalToken || paypalCaptureRef.current) return;
    paypalCaptureRef.current = true;
    setPaypalCapturing(true);

    fetch("/api/paypal/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paypalOrderId: paypalToken }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "Capture failed");
        }
        setPaypalSuccess(true);
      })
      .catch((err) => {
        setPaypalError(err instanceof Error ? err.message : "Capture failed");
      })
      .finally(() => setPaypalCapturing(false));
  }, [paypalParam, paypalToken]);

  async function handlePaypalRetry() {
    if (!paypalOrderId) return;
    setPaypalRetrying(true);
    try {
      const res = await fetch("/api/paypal/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: paypalOrderId, locale }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Retry failed");
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      setPaypalError(err instanceof Error ? err.message : "Retry failed");
      setPaypalRetrying(false);
    }
  }

  async function handlePaypalCancelOrder() {
    if (!paypalOrderId) return;
    setPaypalCancelling(true);
    try {
      const res = await fetch(`/api/orders/${paypalOrderId}/cancel`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Cancel failed");
      }
      window.location.href = lp("/");
    } catch (err) {
      setPaypalError(err instanceof Error ? err.message : "Cancel failed");
      setPaypalCancelling(false);
    }
  }

  // Determine actual success state
  const isSuccess = success || paypalSuccess;

  // PayPal capturing loading state
  if (paypalCapturing) {
    return (
      <div className="min-h-screen bg-tea-cream-light flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-tea-green-mist rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="animate-spin" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7D9B84" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10"/>
            </svg>
          </div>
          <h2 className="font-serif text-2xl font-bold text-tea-text mb-3">{t("paypalProcessing")}</h2>
        </div>
      </div>
    );
  }

  // PayPal cancel page
  if (paypalParam === "cancel" && !paypalSuccess) {
    return (
      <div className="min-h-screen bg-tea-cream-light flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h2 className="font-serif text-3xl font-bold text-tea-text mb-3">{t("paypalCancelTitle")}</h2>
          <p className="text-tea-text-light mb-2">{t("paypalCancelDesc")}</p>
          <p className="text-sm text-amber-600 mb-8 bg-amber-50 rounded-xl p-3">{t("paypalCancelPointsHint")}</p>
          {paypalError && <p className="text-red-400 text-sm mb-3">{paypalError}</p>}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {paypalOrderId && (
              <>
                <button onClick={handlePaypalRetry} disabled={paypalRetrying || paypalCancelling}
                  className="bg-tea-green hover:bg-tea-green-dark disabled:opacity-60 text-white px-8 py-3.5 rounded-full font-medium transition-colors">
                  {paypalRetrying ? t("paypalProcessing") : t("paypalRetry")}
                </button>
                <button onClick={handlePaypalCancelOrder} disabled={paypalRetrying || paypalCancelling}
                  className="border border-red-300 text-red-500 hover:bg-red-50 disabled:opacity-60 px-8 py-3.5 rounded-full font-medium transition-colors">
                  {paypalCancelling ? t("paypalProcessing") : t("paypalCancelOrder")}
                </button>
              </>
            )}
            <Link href={lp("/")}
              className="border border-tea-green text-tea-green hover:bg-tea-green hover:text-white px-8 py-3.5 rounded-full font-medium transition-colors">
              {t("backHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // PayPal capture failed
  if (paypalError && !paypalSuccess) {
    return (
      <div className="min-h-screen bg-tea-cream-light flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
          <h2 className="font-serif text-3xl font-bold text-tea-text mb-3">{t("paypalCaptureFailed")}</h2>
          <p className="text-tea-text-light mb-2">{t("paypalCaptureFailedDesc")}</p>
          <p className="text-red-400 text-sm mb-6">{paypalError}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={lp("/")}
              className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3.5 rounded-full font-medium transition-colors">
              {t("backHome")}
            </Link>
            <Link href={lp("/contact")}
              className="border border-tea-green text-tea-green hover:bg-tea-green hover:text-white px-8 py-3.5 rounded-full font-medium transition-colors">
              {t("paypalContactSupport")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tea-cream-light flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {isSuccess ? (
          <>
            <div className="w-20 h-20 bg-tea-green-mist rounded-full flex items-center justify-center mx-auto mb-6">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                stroke="#7D9B84" strokeWidth="2" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            {isBooking ? (
              <>
                <h2 className="font-serif text-3xl font-bold text-tea-text mb-3">{t("bookingSuccess")}</h2>
                <p className="text-tea-text-light mb-2">{t("bookingSuccessDesc")}</p>
                {tradeNo && (
                  <p className="text-xs text-tea-text-light mb-2">
                    {t("bookingRef")}<span className="font-mono font-medium">{tradeNo}</span>
                  </p>
                )}
                {user?.email ? (
                  <p className="text-tea-text-light text-sm mb-4">{t("emailSentBooking", { email: user.email })}</p>
                ) : (
                  <p className="text-sm text-amber-600 mb-4">
                    {t("noEmailBookingPrefix")}{" "}
                    <Link href={lp("/account")} className="underline font-medium">{t("accountCenter")}</Link>
                    {" "}{t("noEmailBookingSuffix")}
                  </p>
                )}
                <div className="bg-[#F0F6F1] rounded-2xl px-6 py-4 text-left mb-10">
                  <p className="text-sm font-semibold text-tea-text mb-2">{t("nextSteps")}</p>
                  <ul className="space-y-1.5 text-sm text-tea-text-light">
                    <li className="flex items-start gap-2">
                      <span className="text-tea-green mt-0.5">①</span>
                      {t("nextStep1")}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-tea-green mt-0.5">②</span>
                      {t("nextStep2")}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-tea-green mt-0.5">③</span>
                      {t("nextStep3")}
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-serif text-3xl font-bold text-tea-text mb-3">{t("orderSuccess")}</h2>
                <p className="text-tea-text-light mb-2">{t("orderSuccessDesc")}</p>
                {tradeNo && (
                  <p className="text-xs text-tea-text-light mb-2">
                    {t("orderRef")}<span className="font-mono font-medium">{tradeNo}</span>
                  </p>
                )}
                {user?.email ? (
                  <p className="text-tea-text-light text-sm mb-4">{t("emailSentOrder", { email: user.email })}</p>
                ) : (
                  <p className="text-sm text-amber-600 mb-4">
                    {t("noEmailOrderPrefix")}{" "}
                    <Link href={lp("/account")} className="underline font-medium">{t("accountCenter")}</Link>
                    {" "}{t("noEmailOrderSuffix")}
                  </p>
                )}
                {isIntlOrder && (
                  <div className="bg-amber-50 rounded-2xl px-6 py-4 text-left mb-10">
                    <p className="text-sm font-semibold text-amber-800 mb-2">{t("intlNoticeTitle")}</p>
                    <ul className="space-y-1.5 text-sm text-amber-700">
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span>{t("intlNoticeDays")}</li>
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span>{t("intlNoticeDuty")}</li>
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span>{t("intlNoticeNoReturn")}</li>
                    </ul>
                  </div>
                )}
                {!isIntlOrder && <div className="mb-10" />}
              </>
            )}
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                stroke="#f87171" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h2 className="font-serif text-3xl font-bold text-tea-text mb-3">{t("paymentFailed")}</h2>
            <p className="text-tea-text-light mb-10">{rtnMsg || t("paymentFailedDefault")}</p>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isBooking && isSuccess ? (
            <>
              <Link href={lp("/account?tab=bookings")}
                className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3.5 rounded-full font-medium transition-colors">
                {t("viewBookings")}
              </Link>
              <Link href={lp("/experiences")}
                className="border border-tea-green text-tea-green hover:bg-tea-green hover:text-white px-8 py-3.5 rounded-full font-medium transition-colors">
                {t("browseExperiences")}
              </Link>
            </>
          ) : (
            <>
              <Link href={lp("/")}
                className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3.5 rounded-full font-medium transition-colors">
                {t("backHome")}
              </Link>
              {!isSuccess && (
                <Link href={lp("/cart")}
                  className="border border-tea-green text-tea-green hover:bg-tea-green hover:text-white px-8 py-3.5 rounded-full font-medium transition-colors">
                  {t("backToCart")}
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResultClient() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  );
}
