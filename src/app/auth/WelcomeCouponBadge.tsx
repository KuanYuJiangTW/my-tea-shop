"use client";

import { useTranslations } from "next-intl";
import { WELCOME_COUPON } from "@/lib/coupon-constants";

/**
 * 新註冊送購物金的提示藥丸。
 *
 * 文案固定讀 `auth.register`——這張券講的是註冊這件事，不管由哪一頁顯示。
 * 登入頁也要秀：從登入頁用 LINE／Google 進來的新客同樣會拿到券（`/auth/callback`
 * 對所有新用戶發），原本卻只有走註冊頁的人被告知，等於誘因只講給一半的人聽。
 *
 * 金額／門檻／效期一律取 WELCOME_COUPON，與實際發券同源。
 */

function CouponIcon() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className="flex-shrink-0" aria-hidden
    >
      <rect x="3" y="10" width="18" height="11" rx="1.5" />
      <line x1="12" y1="10" x2="12" y2="21" />
      <path d="M3 10h18" />
      <path d="M12 10S10.5 4.5 8 4.5a2.5 2.5 0 000 5" />
      <path d="M12 10s1.5-5.5 4-5.5a2.5 2.5 0 010 5" />
    </svg>
  );
}

type Props = {
  /** 是否附上「滿 NT$350・30 天內有效」。註冊頁要，登入頁的次要提示不要 */
  showNote?: boolean;
  className?: string;
};

export default function WelcomeCouponBadge({ showNote = false, className = "" }: Props) {
  const t = useTranslations("auth.register");

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-tea-green-mist border border-tea-green-pale ${className}`}
    >
      <CouponIcon />
      <span className="text-caption text-tea-green-ink">
        <strong className="font-medium">
          {t("couponBadge", { amount: WELCOME_COUPON.discountAmount.toLocaleString() })}
        </strong>
        {showNote && (
          <span className="hidden sm:inline">
            {" "}
            {t("couponBadgeNote", {
              min: WELCOME_COUPON.minOrderAmount.toLocaleString(),
              days: WELCOME_COUPON.expiryDays.toString(),
            })}
          </span>
        )}
      </span>
    </div>
  );
}
