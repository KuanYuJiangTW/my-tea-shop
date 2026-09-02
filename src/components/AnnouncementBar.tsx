"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import { INTERNATIONAL_FREE_SHIPPING_THRESHOLD } from "@/lib/shipping-constants";
import { WELCOME_COUPON } from "@/lib/coupon-constants";

/**
 * 全站公告條。刻意**只講一件事**——依登入狀態擇一，不做輪播。
 *
 * 兩則訊息同時出現會互相稀釋：還沒註冊的人需要的是「註冊有好處」，
 * 已經是會員的人需要的是「原來可以寄國外」。輪播等於兩邊都講一半。
 */

/** 關閉後靜默天數。關掉是「知道了」，不是「永遠別再說」 */
const DISMISS_DAYS = 7;
const DISMISS_KEY = "wj-announcement-dismissed-until";

/** 關閉狀態改用 external store：`dismiss()` 寫完 localStorage 後派事件通知訂閱者 */
// 匯出給 HeroBackground：它的 --hero-chrome 需要在這條被關掉的當下重算，
// 不能只靠 ResizeObserver（見該檔說明）
export const DISMISS_EVENT = "wj-announcement-dismissed";

function subscribeDismissed(onChange: () => void) {
  window.addEventListener(DISMISS_EVENT, onChange);
  return () => window.removeEventListener(DISMISS_EVENT, onChange);
}

function readDismissed() {
  try {
    const until = Number(window.localStorage.getItem(DISMISS_KEY));
    return Boolean(until) && Date.now() < until;
  } catch {
    // 無痕模式／封鎖儲存時 localStorage 會丟例外——照常顯示即可
    return false;
  }
}

export default function AnnouncementBar() {
  const t = useTranslations("common.announcement");
  const locale = useLocale();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  /**
   * 伺服器端快照固定回 `false`（顯示）：絕大多數訪客沒關過，這樣他們零版面位移（CLS）。
   * 關過的人由 hydration 後的 client 快照移除——初值設成隱藏的話，反而是所有人
   * 都要被推一次版面。這個取捨與原本的寫法完全相同。
   *
   * **為什麼不是 `useState` + `useEffect`**：原本在 effect 裡同步 `setState`，
   * 是全 repo 唯一的 lint error（`react-hooks/set-state-in-effect`）。
   * 「讀外部來源、且伺服器與 client 的答案不同」正是 `useSyncExternalStore`
   * 的用途，換過來之後行為不變、error 歸零。
   */
  const dismissed = useSyncExternalStore(subscribeDismissed, readDismissed, () => false);

  const lp = (path: string) => (locale === "en" ? `/en${path}` : path);

  if (dismissed) return null;

  // auth 還在載入時走配送文案：它對登入與否都成立。
  // 反過來先顯示「新會員」，會讓老客戶看到一則對自己無效的訊息再閃掉。
  //
  // **在註冊頁不顯示註冊禮**：那則的 CTA 會指向當前頁，點了等於沒事發生。
  // 改走配送文案——它對還沒註冊的人一樣成立，符合本條的「只講一件事」。
  const onRegisterPage = pathname === lp("/auth/register");
  const showWelcome = !loading && !user && !onRegisterPage;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
    } catch {
      // 同上，存不進去頂多下次再顯示一遍
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  return (
    // 底色 2026-09-02 從 bg-tea-green-dark(#5C7A67, C.045) 改為墨色(#3D4A42, C.021)。
    // 這條全站每頁都在、滿版，面積是所有 CTA 加起來的好幾倍——染成重音色會讓
    // 焙火紅從「點」變成「場」，商品頁那顆加入購物車就不再是唯一的紅。
    // Blue Bottle 確實用滿彩度品牌藍當公告條，但**他們的按鈕是中性的**，
    // 藍是全站唯一的彩色；我們已經把彩色給了 CTA，不能再給第二個大面積。
    // 附帶：白字對比從 4.74 提到 9.31，且與深墨 Footer 呼應成「深色頭＋深色尾」。
    <div className="bg-tea-text text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* min-h-9 = 36px，與 Footer／「查看全部」同一套觸控標準 */}
        <div className="relative flex items-center justify-center min-h-9 py-1.5 pr-9">
          {showWelcome ? (
            <Link
              href={lp("/auth/register")}
              className="group inline-flex items-center gap-1.5 text-caption md:text-label underline-offset-4 hover:underline"
            >
              <GiftIcon />
              <span>
                {t("welcome", { amount: WELCOME_COUPON.discountAmount.toLocaleString() })}
                {/* 門檻與效期收在 md 以上才顯示，點進註冊頁會完整看到。
                    斷點是 md 不是 sm：英文文案比中文長得多，sm(640) 放附註會斷成兩行，
                    整條從 36px 撐成 55px。中文在 640 過關不代表英文過關。 */}
                <span className="hidden md:inline">
                  {" "}
                  {t("welcomeNote", {
                    min: WELCOME_COUPON.minOrderAmount.toLocaleString(),
                    days: WELCOME_COUPON.expiryDays.toString(),
                  })}
                </span>
              </span>
              <span
                aria-hidden
                className="transition-transform duration-base ease-standard group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-caption md:text-label">
              <GlobeIcon />
              <span>
                {t("shipping", {
                  amount: INTERNATIONAL_FREE_SHIPPING_THRESHOLD.toLocaleString(),
                })}
                {/* 付款方式限制提前講：讓客人在結帳頁才發現只能用 PayPal 是最痛的流失點 */}
                <span className="hidden md:inline"> {t("shippingNote")}</span>
              </span>
            </p>
          )}

          <button
            type="button"
            onClick={dismiss}
            aria-label={t("dismiss")}
            className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-inline text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-base ease-standard"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// 圖示沿用 Header 的線條語言（stroke 1.8、無填色），不用 emoji——
// emoji 的彩度與品牌的低彩度色盤打架，且各平台字形不一致。

function GlobeIcon() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      className="flex-shrink-0" aria-hidden
    >
      <circle cx="12" cy="12" r="9.5" />
      <ellipse cx="12" cy="12" rx="4" ry="9.5" />
      <line x1="2.5" y1="12" x2="21.5" y2="12" />
    </svg>
  );
}

function GiftIcon() {
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
