"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocale, useTranslations } from "next-intl";

function ResultContent() {
  const params      = useSearchParams();
  const stripeParam = params.get("stripe");
  const isStripe    = stripeParam === "success" || stripeParam === "cancel";
  const success     = isStripe ? stripeParam === "success" : params.get("RtnCode") === "1";
  const { user }    = useAuth();
  const locale      = useLocale();
  const t           = useTranslations("orderResult");
  const lp = (path: string) => locale === "en" ? `/en${path}` : path;
  const tradeNo     = isStripe ? null : params.get("MerchantTradeNo");
  const rtnMsg      = isStripe ? null : params.get("RtnMsg");
  const isBooking   = tradeNo?.startsWith("B") ?? false;


  return (
    <div className="min-h-screen bg-tea-cream-light flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {success ? (
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
                  <p className="text-tea-text-light text-sm mb-10">{t("emailSentOrder", { email: user.email })}</p>
                ) : (
                  <p className="text-sm text-amber-600 mb-10">
                    {t("noEmailOrderPrefix")}{" "}
                    <Link href={lp("/account")} className="underline font-medium">{t("accountCenter")}</Link>
                    {" "}{t("noEmailOrderSuffix")}
                  </p>
                )}
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
          {isBooking && success ? (
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
              {!success && (
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
