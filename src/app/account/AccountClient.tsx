"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { translatePointsDescription, isKnownMemberTier } from "@/lib/points-i18n";

type Profile = {
  id: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
};

type Order = {
  id: string;
  created_at: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  payment_method: string;
  items: { name: string; quantity: number; unitPrice: number; subtotal: number }[];
  shipping_address: { type: string; city?: string; address?: string; company?: string; storeName?: string; country?: string; countryName?: string; state?: string; addressLine1?: string; addressLine2?: string; postalCode?: string };
  shipping_fee: number;
  discount_amount: number;
};

type PointTx = {
  id: string;
  points: number;
  type: "earn" | "redeem";
  description: string | null;
  created_at: string;
};

type CouponRow = {
  id: string;
  code: string;
  source: string;
  discount_amount: number;
  min_order_amount: number;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

type BookingRow = {
  id: string;
  created_at: string;
  status: "pending_payment" | "confirmed" | "completed" | "cancelled";
  participant_count: number;
  total_price: number;
  points_discount: number;
  participants_due_at: string | null;
  refund_amount: number | null;
  has_review: boolean;
  session: {
    session_date: string;
    start_time: string;
    experience_types: { name: string; name_en: string | null } | null;
  } | null;
};

type WaitlistRow = {
  id:               string;
  status:           string;
  participant_count: number;
  confirm_deadline: string | null;
  created_at:       string;
  session: {
    session_date: string;
    start_time:   string;
    experience_types: { name: string; name_en: string | null } | null;
  } | null;
};

type MemberTierInfo = {
  id: string;
  name: string;
  points_rate: number;
  max_discount_rate: number;
  min_annual_spend: number;
};

type Props = {
  user: { id: string; email: string };
  profile: Profile | null;
  orders: Order[];
  pointsBalance: number;
  memberTier: MemberTierInfo;
  annualSpend: number;
  expiringPoints: number;
  earliestExpiry: string | null;
  pointTransactions: PointTx[];
  coupons: CouponRow[];
  bookings: BookingRow[];
  waitlist: WaitlistRow[];
};

const CITIES = ["台北市","新北市","桃園市","台中市","台南市","高雄市","基隆市","新竹市","新竹縣","苗栗縣","彰化縣","南投縣","雲林縣","嘉義市","嘉義縣","屏東縣","宜蘭縣","花蓮縣","台東縣","澎湖縣","金門縣","連江縣"];

// 會員端依 order_status + payment_status 組合顯示
export function getMemberStatusCls(orderStatus: string, paymentStatus: string): { labelKey: string; cls: string } {
  if (orderStatus === "new") {
    return paymentStatus === "paid"
      ? { labelKey: "orderStatus.paid2", cls: "bg-status-done-soft text-status-done" }
      : { labelKey: "orderStatus.pending2", cls: "bg-status-idle-soft text-status-idle" };
  }
  const map: Record<string, { labelKey: string; cls: string }> = {
    preparing: { labelKey: "orderStatus.preparing", cls: "bg-status-info-soft text-status-info" },
    shipped:   { labelKey: "orderStatus.shipped",   cls: "bg-tea-green text-white" },
    completed: { labelKey: "orderStatus.completed", cls: "bg-tea-green-dark text-white" },
    cancelled: { labelKey: "orderStatus.cancelled", cls: "bg-status-danger-soft text-status-danger" },
    // 客人已經付過錢了，只是庫存不足待處理。先前這個狀態會 fallback 成「待付款」，
    // 可能讓客人以為沒付成功而再付一次。用中性的「處理中」，配色同備貨中不製造警報。
    stock_issue: { labelKey: "orderStatus.processing", cls: "bg-status-info-soft text-status-info" },
    // 金流回報失敗＝確實還沒收到錢，顯示「待付款」語意正確（小江 2026-08-06 拍板）。
    // 寫成明確的鍵而不是靠 fallback，讓它是一個決定而不是意外。
    failed:      { labelKey: "orderStatus.pending2",   cls: "bg-status-idle-soft text-status-idle" },
  };
  // 未知狀態一律顯示「處理中」，**不可以顯示「待付款」**——
  // 在不確定的情況下告訴客人「你還欠錢」是最糟的猜法。
  return map[orderStatus] ?? { labelKey: "orderStatus.processing", cls: "bg-status-info-soft text-status-info" };
}

const CVS_NAME: Record<string, string> = {
  seven: "7-ELEVEN", family: "全家", hilife: "萊爾富", ok: "OK 超商",
};

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

type ProfileErrors = {
  name?: string;
  phone?: string;
  city?: string;
  address?: string;
};

const phoneRegex = /^09\d{8}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bookingStatusCls(status: BookingRow["status"]): string {
  const map: Record<string, string> = {
    pending_payment: "bg-yellow-100 text-yellow-800",
    confirmed:       "bg-status-done-soft text-status-done",
    completed:       "bg-emerald-100 text-emerald-700",
    cancelled:       "bg-status-danger-soft text-status-danger",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

export default function AccountClient({ user, profile, orders: initialOrders, pointsBalance, memberTier, annualSpend, expiringPoints, earliestExpiry, pointTransactions, coupons, bookings, waitlist }: Props) {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isEn = locale === "en";
  const lp = (path: string) => isEn ? `/en${path}` : path;
  /** 日期一律跟著語系走。寫死 zh-TW 的話英文版會出現「2026年8月9日週日」 */
  const dateFmt = isEn ? "en-US" : "zh-TW";
  /** 體驗名稱：`experience_types` 有 `name_en`，缺漏時回中文（顯示中文好過顯示空白） */
  const expTypeName = (et: { name: string; name_en: string | null } | null | undefined) =>
    (isEn ? et?.name_en || et?.name : et?.name) ?? t("bookings.defaultExperience");
  /** 等級名稱不讀 DB 的 `name`（該表沒有 name_en），改由 id 對 i18n；未知等級才 fallback */
  const tierLabel = (tierId: string, fallback?: string) =>
    isKnownMemberTier(tierId) ? tCommon(`memberTier.${tierId}`) : (fallback ?? tierId);
  const memberTierName = tierLabel(memberTier.id, memberTier.name);
  /**
   * 點數明細。`description` 在 DB 裡是中文字面值（含歷史資料），只能在顯示層對回 i18n。
   * 對不到的**原樣顯示原字串**——寧可露出中文，也不要猜成別的意思。
   */
  const pointsLedgerText = (tx: PointTx) => {
    const label = translatePointsDescription(tx.description);
    if (!label) {
      return tx.description ?? (tx.type === "earn" ? t("rewards.earnDefault") : t("rewards.redeemDefault"));
    }
    return t(`pointsLedger.${label.key}`, label.values)
      + (label.suffixKey ? t(`pointsLedger.${label.suffixKey}`) : "");
  };
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const defaultTab = rawTab === "orders" ? "orders" : rawTab === "rewards" ? "rewards" : rawTab === "bookings" ? "bookings" : "profile";
  const [tab, setTab] = useState<"profile" | "orders" | "rewards" | "bookings">(defaultTab);

  // ── Tier history state ──────────────────────────────────────────────────────
  const [tierHistory, setTierHistory] = useState<Array<{ id: string; from_tier: string; to_tier: string; reason: string; changed_at: string }>>([]);
  useEffect(() => {
    if (user?.id) {
      fetch(`/api/admin/members/${user.id}/tier-history`)
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setTierHistory(data.slice(0, 5)); })
        .catch(() => {});
    }
  }, [user?.id]);

  // ── Booking cancel state ────────────────────────────────────────────────────
  const [bookingList, setBookingList]           = useState(bookings);
  const [cancelBookingId, setCancelBookingId]   = useState<string | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState(false);
  const [cancelBookingError, setCancelBookingError] = useState("");
  const [cancelBookingResult, setCancelBookingResult] = useState<{ refundAmount: number; daysUntil: number } | null>(null);
  const [cancelBookingWasPending, setCancelBookingWasPending] = useState(false);

  // ── Booking retry payment state ─────────────────────────────────────────────
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // ── Review state ─────────────────────────────────────────────────────────────
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating]       = useState(5);
  const [reviewHover, setReviewHover]         = useState(0);
  const [reviewComment, setReviewComment]     = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError]         = useState("");

  // ── Profile state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name:    profile?.name    ?? "",
    phone:   profile?.phone   ?? "",
    city:    profile?.city    ?? "",
    address: profile?.address ?? "",
  });
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ── Email 綁定 state（無帳號 email 時使用）──────────────────────────────
  const [emailInput, setEmailInput] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // ── Orders state ───────────────────────────────────────────────────────────
  const [orderList, setOrderList] = useState<Order[]>(initialOrders);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Cancel state
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Order retry payment state
  const [orderRetryingId, setOrderRetryingId] = useState<string | null>(null);

  // Address edit state
  const [editAddressOrder, setEditAddressOrder] = useState<Order | null>(null);
  const [addressForm, setAddressForm] = useState({ city: "", address: "" });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");

  useEffect(() => {
    if (saveSuccess) {
      const t = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(t);
    }
  }, [saveSuccess]);

  function validateProfile(): boolean {
    const e: ProfileErrors = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      e.name = t("errors.nameLength");
    }
    if (form.phone && !phoneRegex.test(form.phone.replace(/-/g, ""))) {
      e.phone = t("errors.phoneInvalid");
    }
    if (form.city && !CITIES.includes(form.city)) {
      e.city = t("errors.cityInvalid");
    }
    if (form.address.trim() && form.address.trim().length < 4) {
      e.address = t("errors.addressLength");
    }
    setProfileErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSaveProfile(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validateProfile()) return;

    setSaving(true);
    setSaveError("");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id:      user.id,
        name:    form.name.trim(),
        phone:   form.phone.replace(/-/g, "") || null,
        city:    form.city || null,
        address: form.address.trim() || null,
      });

    setSaving(false);
    if (error) {
      setSaveError(t("errors.saveFailed"));
    } else {
      setSaveSuccess(true);
    }
  }

  async function handleBindEmail(ev?: React.FormEvent | React.MouseEvent) {
    ev?.preventDefault();
    if (!emailRegex.test(emailInput.trim())) {
      setEmailError(t("errors.emailInvalid"));
      return;
    }
    setEmailSaving(true);
    setEmailError("");
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser(
      { email: emailInput.trim() },
      { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account` }
    );
    setEmailSaving(false);
    if (error) {
      setEmailError(error.message.includes("already") ? t("errors.emailAlreadyUsed") : t("errors.emailBindFailed"));
    } else {
      setEmailSent(true);
    }
  }

  async function handleCancelOrder() {
    if (!cancelConfirmId) return;
    setCancelling(true);
    setCancelError("");

    const res = await fetch(`/api/orders/${cancelConfirmId}/cancel`, { method: "POST" });
    const json = await res.json();

    setCancelling(false);
    if (!res.ok) {
      setCancelError(json.error ?? t("errors.cancelFailed"));
      return;
    }

    // Update local state
    setOrderList(prev =>
      prev.map(o => o.id === cancelConfirmId ? { ...o, order_status: "cancelled" } : o)
    );
    setCancelConfirmId(null);
  }

  async function handleRetryPayment(bookingId: string) {
    setRetryingId(bookingId);
    const res  = await fetch("/api/ecpay/experience-checkout", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ bookingId }),
    });
    const json = await res.json();
    setRetryingId(null);
    if (!res.ok) return;

    // 動態建立 form 並 submit
    const form = document.createElement("form");
    form.method = "POST";
    form.action = json.ecpayUrl;
    Object.entries(json.params as Record<string, string>).forEach(([k, v]) => {
      const input = document.createElement("input");
      input.type  = "hidden";
      input.name  = k;
      input.value = v;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }

  async function handleOrderRetry(orderId: string, paymentMethod: string) {
    setOrderRetryingId(orderId);
    try {
      if (paymentMethod === "paypal") {
        const res = await fetch("/api/paypal/retry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, locale }),
        });
        const json = await res.json();
        if (!res.ok) {
          alert(json.error ?? t("errors.retryFailed"));
          setOrderRetryingId(null);
          return;
        }
        // 用 assign() 而非 href 賦值：語意完全相同（都導航、都推入 history），
        // 但方法呼叫不會被 react-hooks/immutability 判為修改外部變數。
        if (json.url) window.location.assign(json.url);
      } else {
        // ECPay retry
        const res = await fetch("/api/ecpay/retry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const json = await res.json();
        if (!res.ok) {
          alert(json.error ?? t("errors.retryFailed"));
          setOrderRetryingId(null);
          return;
        }
        const form = document.createElement("form");
        form.method = "POST";
        form.action = json.ecpayUrl;
        Object.entries(json.params as Record<string, string>).forEach(([k, v]) => {
          const input = document.createElement("input");
          input.type  = "hidden";
          input.name  = k;
          input.value = v;
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
      }
    } catch {
      alert(t("errors.retryFailed"));
      setOrderRetryingId(null);
    }
  }

  async function handleCancelBooking() {
    if (!cancelBookingId) return;
    setCancellingBooking(true);
    setCancelBookingError("");

    const res = await fetch(`/api/bookings/${cancelBookingId}/cancel`, { method: "POST" });
    const json = await res.json();
    setCancellingBooking(false);

    if (!res.ok) {
      setCancelBookingError(json.error ?? t("errors.cancelFailed"));
      return;
    }

    setCancelBookingResult(json);
    setBookingList(prev =>
      prev.map(b => b.id === cancelBookingId ? { ...b, status: "cancelled" as const, refund_amount: json.refundAmount } : b)
    );
  }

  async function handleSubmitReview() {
    const bookingId = reviewBookingId; // 立即捕獲，避免 async 後閉包過期
    if (!bookingId) return;
    setReviewSubmitting(true);
    setReviewError("");
    const res = await fetch("/api/reviews", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ bookingId, rating: reviewRating, comment: reviewComment }),
    });
    const json = await res.json();
    if (!res.ok) {
      setReviewSubmitting(false);
      setReviewError(json.error ?? t("errors.reviewFailed"));
      return;
    }
    setBookingList(prev => prev.map(b => b.id === bookingId ? { ...b, has_review: true } : b));
    setReviewBookingId(null);
    setReviewComment("");
    setReviewRating(5);
    setReviewSubmitting(false);
  }

  function openEditAddress(order: Order) {
    setEditAddressOrder(order);
    setAddressForm({
      city:    order.shipping_address.city    ?? "",
      address: order.shipping_address.address ?? "",
    });
    setAddressError("");
  }

  async function handleSaveAddress(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editAddressOrder) return;

    if (!addressForm.city || !addressForm.address.trim()) {
      setAddressError(t("errors.cityAddressRequired"));
      return;
    }

    setSavingAddress(true);
    setAddressError("");

    const res = await fetch(`/api/orders/${editAddressOrder.id}/address`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addressForm),
    });
    const json = await res.json();

    setSavingAddress(false);
    if (!res.ok) {
      setAddressError(json.error ?? t("errors.updateFailed"));
      return;
    }

    // Update local state
    setOrderList(prev =>
      prev.map(o =>
        o.id === editAddressOrder.id
          ? { ...o, shipping_address: { ...o.shipping_address, city: addressForm.city, address: addressForm.address } }
          : o
      )
    );
    setEditAddressOrder(null);
  }

  const inputCls = (hasError?: string) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-tea-text placeholder-tea-text-light/50 focus:outline-none focus:ring-2 bg-tea-cream-light/50 transition ${
      hasError
        ? "border-rose-300 focus:ring-rose-300"
        : "border-tea-green-pale focus:ring-tea-green focus:border-tea-green"
    }`;

  return (
    <div className="min-h-screen bg-tea-cream-light">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-tea-text mb-1">{t("title")}</h1>
          <p className="text-sm text-tea-text-light">{user.email || t("profile.noEmail")}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border border-tea-green-pale p-1 w-fit flex-wrap">
          {([
            { key: "profile",  label: t("profile.title") },
            { key: "orders",   label: t("tabs.ordersCount", { count: orderList.length }) },
            { key: "bookings", label: t("tabs.bookingsCount", { count: bookings.length }) },
            { key: "rewards",  label: t("tabs.rewards") },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? "bg-tea-green text-white shadow-sm"
                  : "text-tea-text-light hover:text-tea-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ─── Profile Tab ─── */}
        {tab === "profile" && (
          <div className="bg-white rounded-2xl shadow-sm border border-tea-green-pale">
            <div className="px-7 py-5 border-b border-tea-green-pale">
              <h2 className="font-semibold text-tea-text">{t("profile.title")}</h2>
              <p className="text-xs text-tea-text-light mt-0.5">{t("profile.subtitle")}</p>
            </div>

            <form onSubmit={handleSaveProfile} className="p-7 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-tea-text mb-1.5">
                  {t("profile.name")} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => { setForm(p => ({ ...p, name: e.target.value })); setProfileErrors(p => ({ ...p, name: undefined })); }}
                  placeholder={t("profile.namePlaceholder")}
                  className={inputCls(profileErrors.name)}
                />
                {profileErrors.name && <p className="mt-1 text-xs text-rose-500">{profileErrors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-tea-text mb-1.5">{t("profile.email")}</label>
                {user.email ? (
                  <>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full px-4 py-3 rounded-xl border border-tea-green-pale text-sm text-tea-text-light bg-gray-50 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-tea-text-light">{t("profile.emailReadonly")}</p>
                  </>
                ) : emailSent ? (
                  <div className="flex items-start gap-2 bg-tea-green-mist/50 border border-tea-green-pale rounded-xl px-4 py-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7D9B84" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <div>
                      <p className="text-sm text-tea-text font-medium">{t("profile.emailVerificationSent")}</p>
                      <p className="text-xs text-tea-text-light mt-0.5">
                        {t("profile.emailVerificationDesc", { email: emailInput })}
                      </p>
                      <button
                        type="button"
                        onClick={() => { setEmailSent(false); setEmailInput(""); }}
                        className="mt-1.5 text-xs text-tea-green hover:text-tea-green-dark underline"
                      >
                        {t("profile.emailReenter")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => { setEmailInput(e.target.value); setEmailError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleBindEmail(e as unknown as React.FormEvent))}
                        placeholder="your@email.com"
                        className={inputCls(emailError)}
                      />
                      <button
                        type="button"
                        onClick={handleBindEmail}
                        disabled={emailSaving}
                        className="px-4 py-2 bg-tea-green hover:bg-tea-green-dark disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        {emailSaving ? t("profile.emailBinding") : t("profile.emailBind")}
                      </button>
                    </div>
                    {emailError && <p className="text-xs text-rose-500">{emailError}</p>}
                    <p className="text-xs text-tea-text-light">{t("profile.emailBindHint")}</p>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-tea-text mb-1.5">{t("profile.phone")}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => { setForm(p => ({ ...p, phone: e.target.value })); setProfileErrors(p => ({ ...p, phone: undefined })); }}
                  placeholder="0912345678"
                  className={inputCls(profileErrors.phone)}
                />
                {profileErrors.phone && <p className="mt-1 text-xs text-rose-500">{profileErrors.phone}</p>}
              </div>

              {/* City + Address */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-tea-text mb-1.5">{t("profile.city")}</label>
                  <select
                    value={form.city}
                    onChange={(e) => { setForm(p => ({ ...p, city: e.target.value })); setProfileErrors(p => ({ ...p, city: undefined })); }}
                    className={inputCls(profileErrors.city)}
                  >
                    <option value="">{t("profile.selectCity")}</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {profileErrors.city && <p className="mt-1 text-xs text-rose-500">{profileErrors.city}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-tea-text mb-1.5">{t("profile.address")}</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => { setForm(p => ({ ...p, address: e.target.value })); setProfileErrors(p => ({ ...p, address: undefined })); }}
                    placeholder={t("profile.addressPlaceholder")}
                    className={inputCls(profileErrors.address)}
                  />
                  {profileErrors.address && <p className="mt-1 text-xs text-rose-500">{profileErrors.address}</p>}
                </div>
              </div>

              {/* Save */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-7 py-2.5 bg-tea-green hover:bg-tea-green-dark disabled:opacity-60 text-white rounded-full text-sm font-medium transition-colors"
                >
                  {saving ? t("profile.saving") : t("profile.save")}
                </button>
                {saveSuccess && (
                  <span className="text-sm text-tea-green font-medium flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    {t("profile.saved")}
                  </span>
                )}
                {saveError && <span className="text-sm text-rose-500">{saveError}</span>}
              </div>
            </form>
          </div>
        )}

        {/* ─── Bookings Tab ─── */}
        {tab === "bookings" && (
          <div className="space-y-3">
            {bookingList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-tea-green-pale p-12 text-center">
                <div className="w-12 h-12 bg-tea-green-mist rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-tea-green">
                    <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
                  </svg>
                </div>
                <p className="text-tea-text font-medium mb-1">{t("bookings.noBookingsTitle")}</p>
                <p className="text-sm text-tea-text-light mb-4">{t("bookings.noBookingsDesc")}</p>
                <Link href={lp("/experiences")} className="text-sm text-tea-green hover:text-tea-green-dark font-medium underline underline-offset-2">
                  {t("bookings.browse")}
                </Link>
              </div>
            ) : (
              bookingList.map((booking) => {
                const session  = booking.session;
                const expName  = expTypeName(session?.experience_types);
                const dateLabel = session?.session_date
                  ? new Date(`${session.session_date}T00:00:00`).toLocaleDateString(dateFmt, { year: "numeric", month: "long", day: "numeric", weekday: "short" })
                  : "—";
                const timeLabel   = session?.start_time?.slice(0, 5) ?? "—";
                const stCls         = bookingStatusCls(booking.status);
                const isDue          = booking.participants_due_at && new Date() < new Date(booking.participants_due_at);
                const isConfirmed    = booking.status === "confirmed";
                const isCompleted    = booking.status === "completed";
                const isCancelled    = booking.status === "cancelled";
                const isPending      = booking.status === "pending_payment";

                // 是否可取消（活動日還沒到）
                const sessionDate = session?.session_date
                  ? new Date(`${session.session_date}T${session.start_time}`)
                  : null;
                const canCancel   = (isConfirmed || isPending) && sessionDate && sessionDate > new Date();
                const isPast      = isCompleted || (isConfirmed && sessionDate && sessionDate < new Date());
                const canReview   = isPast && !booking.has_review;

                return (
                  <div key={booking.id} className="bg-white rounded-2xl border border-tea-green-pale overflow-hidden">
                    <div className="px-6 py-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-medium text-tea-text">{expName}</span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${stCls}`}>
                              {t(`bookingStatus.${booking.status}`)}
                            </span>
                          </div>
                          <div className="text-sm text-tea-text-light">
                            {dateLabel} {timeLabel} · {t("bookings.personCount", { count: booking.participant_count })} · NT${(booking.total_price - (booking.points_discount || 0)).toLocaleString()}
                          </div>
                          {isConfirmed && booking.participants_due_at && (
                            <div className={`mt-1 text-xs ${isDue ? "text-amber-600" : "text-rose-500"}`}>
                              {t("bookings.participantsDue", { date: new Date(booking.participants_due_at).toLocaleDateString(dateFmt) })}
                              {!isDue && t("bookings.participantsDueExpired")}
                            </div>
                          )}
                          {isCancelled && booking.refund_amount != null && (
                            <div className="mt-1 text-xs text-tea-text-light">
                              {t("bookings.refundAmount", { amount: booking.refund_amount.toLocaleString() })}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {isConfirmed && (
                            <Link
                              href={lp(`/account/bookings/${booking.id}/participants`)}
                              className="px-4 py-2 bg-tea-green hover:bg-tea-green-dark text-white text-sm font-medium rounded-full transition-colors text-center"
                            >
                              {t("bookings.fillInfo")}
                            </Link>
                          )}
                          {isPending && (
                            <button
                              onClick={() => handleRetryPayment(booking.id)}
                              disabled={retryingId === booking.id}
                              className="px-4 py-2 bg-tea-green hover:bg-tea-green-dark disabled:opacity-60 text-white text-sm font-medium rounded-full transition-colors"
                            >
                              {retryingId === booking.id ? t("bookings.retrying") : t("bookings.retryPayment")}
                            </button>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => { setCancelBookingId(booking.id); setCancelBookingError(""); setCancelBookingResult(null); setCancelBookingWasPending(booking.status === "pending_payment"); }}
                              className="px-4 py-2 border border-rose-300 text-rose-500 hover:bg-rose-50 text-sm font-medium rounded-full transition-colors"
                            >
                              {t("bookings.cancelBooking")}
                            </button>
                          )}
                          {canReview && (
                            <button
                              onClick={() => { setReviewBookingId(booking.id); setReviewRating(5); setReviewHover(0); setReviewComment(""); setReviewError(""); }}
                              className="px-4 py-2 border border-amber-300 text-amber-600 hover:bg-amber-50 text-sm font-medium rounded-full transition-colors"
                            >
                              {t("bookings.writeReview")}
                            </button>
                          )}
                          {isPast && booking.has_review && (
                            <span className="text-xs text-tea-text-light px-2">{t("bookings.reviewed")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── Waitlist Section（我的預約 tab 下方）─── */}
        {tab === "bookings" && waitlist.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-tea-text mb-3">{t("waitlist.title")}</h3>
            <div className="space-y-3">
              {waitlist.map(w => {
                const expName   = expTypeName(w.session?.experience_types);
                const dateLabel = w.session?.session_date
                  ? new Date(`${w.session.session_date}T00:00:00`).toLocaleDateString(dateFmt, { year: "numeric", month: "long", day: "numeric" })
                  : "—";
                const waitlistStatusCls: Record<string, string> = {
                  waiting:  "bg-amber-100 text-amber-700",
                  notified: "bg-blue-100 text-blue-700",
                };
                const wCls = waitlistStatusCls[w.status] ?? "bg-gray-100 text-gray-600";
                const wLabel = w.status === "waiting" ? t("waitlist.waiting") : w.status === "notified" ? t("waitlist.notified") : w.status;
                return (
                  <div key={w.id} className="bg-white rounded-2xl border border-tea-green-pale px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-tea-text">{expName}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${wCls}`}>{wLabel}</span>
                        </div>
                        <div className="text-sm text-tea-text-light">{dateLabel} · {t("bookings.personCount", { count: w.participant_count })}</div>
                        {w.status === "notified" && w.confirm_deadline && (
                          <div className="text-xs text-blue-600 mt-1">
                            {t("waitlist.confirmBefore", { datetime: new Date(w.confirm_deadline).toLocaleString(dateFmt, { timeZone: "Asia/Taipei", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) })}
                          </div>
                        )}
                      </div>
                      {w.status === "notified" && (
                        <a
                          href={lp(`/waitlist/${w.id}/confirm`)}
                          className="px-4 py-2 bg-tea-green hover:bg-tea-green-dark text-white text-sm font-medium rounded-full transition-colors"
                        >
                          {t("waitlist.confirm")}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Rewards Tab ─── */}
        {tab === "rewards" && (
          <div className="space-y-6">
            {/* 會員等級 + 點數餘額 */}
            <div className="bg-white rounded-2xl shadow-sm border border-tea-green-pale p-7">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-tea-text">{t("rewards.pointsTitle")}</h2>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-tea-green-mist text-tea-green">
                  {memberTierName} · {t("rewards.earnRate", { rate: Math.round(memberTier.points_rate * 100) })}
                </span>
              </div>
              <p className="text-xs text-tea-text-light mb-4">
                {t("rewards.pointsDescNew", { maxRate: Math.round(memberTier.max_discount_rate * 100) })}
              </p>

              {/* 年消費進度條 + 保級預警 */}
              {(() => {
                const TIERS = [
                  { id: "standard", name: tCommon("memberTier.standard"), min: 0 },
                  { id: "silver", name: tCommon("memberTier.silver"), min: 3000 },
                  { id: "gold", name: tCommon("memberTier.gold"), min: 8000 },
                ];
                const currentIdx = TIERS.findIndex(t => t.id === memberTier.id);
                const nextTier = TIERS[currentIdx + 1];
                const progress = nextTier ? Math.min(annualSpend / nextTier.min * 100, 100) : 100;
                const currentMonth = new Date().getMonth() + 1;
                const isNearYearEnd = currentMonth >= 11;
                const currentTierMin = TIERS[currentIdx]?.min ?? 0;
                const needsRetentionWarning = isNearYearEnd && currentIdx > 0 && annualSpend < currentTierMin;
                const retentionGap = currentTierMin - annualSpend;
                return (
                  <div className="mb-5">
                    <div className="flex items-center justify-between text-xs text-tea-text-light mb-1">
                      <span>{t("rewards.annualSpend")}: NT${annualSpend.toLocaleString()}</span>
                      {nextTier ? <span>{t("rewards.nextTier", { name: nextTier.name, amount: nextTier.min.toLocaleString() })}</span> : <span>{t("rewards.maxTier")}</span>}
                    </div>
                    <div className="w-full h-2 bg-tea-green-pale rounded-full overflow-hidden">
                      <div className="h-full bg-tea-green rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    {needsRetentionWarning && (
                      <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                        {t("rewards.retentionWarning", { amount: retentionGap.toLocaleString(), tier: memberTierName })}
                      </p>
                    )}
                    {tierHistory.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-medium text-tea-text-light">{t("rewards.tierHistoryTitle")}</p>
                        {tierHistory.map(h => (
                          <div key={h.id} className="text-xs text-tea-text-light flex gap-2">
                            <span className="text-tea-text-faint">{new Date(h.changed_at).toLocaleDateString(dateFmt)}</span>
                            {/* from_tier / to_tier 存的是 id（standard/silver/gold），直接印出來中英文都看不懂 */}
                            <span>{tierLabel(h.from_tier)} → {tierLabel(h.to_tier)}</span>
                            <span className="text-tea-text-faint">({h.reason === "upgrade" ? t("rewards.tierReasonUpgrade") : h.reason === "annual_reset" ? t("rewards.tierReasonAnnualReset") : h.reason})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-end gap-2 mb-4">
                <span className="font-serif text-5xl font-bold text-tea-green">NT${pointsBalance.toLocaleString()}</span>
                <span className="text-tea-text-light mb-1">{t("rewards.pointsUnitNew")}</span>
              </div>

              {/* 到期提醒 */}
              {expiringPoints > 0 && (
                <p className="text-xs text-amber-600 mb-4">
                  {t("rewards.expiringWarning", { amount: expiringPoints.toLocaleString() })}
                  {earliestExpiry && (
                    <span className="ml-1">
                      {t("rewards.earliestExpiry", { date: new Date(earliestExpiry).toLocaleDateString(dateFmt, { month: "long", day: "numeric" }) })}
                    </span>
                  )}
                </p>
              )}
              {pointTransactions.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-tea-text-light uppercase tracking-wider mb-3">{t("rewards.recentHistory")}</p>
                  {pointTransactions.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center py-2 border-b border-tea-green-pale/60 last:border-0">
                      <div>
                        <p className="text-sm text-tea-text">{pointsLedgerText(tx)}</p>
                        <p className="text-xs text-tea-text-light">{new Date(tx.created_at).toLocaleDateString(dateFmt)}</p>
                      </div>
                      <span className={`text-sm font-semibold ${tx.points > 0 ? "text-tea-green" : "text-rose-500"}`}>
                        {tx.points > 0 ? "+" : ""}{tx.points.toLocaleString()} {t("rewards.pointsUnit")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-tea-text-light">{t("rewards.noPoints")}</p>
              )}
            </div>

            {/* 折價券 */}
            <div className="bg-white rounded-2xl shadow-sm border border-tea-green-pale p-7">
              <h2 className="font-semibold text-tea-text mb-1">{t("rewards.couponsTitle")}</h2>
              <p className="text-xs text-tea-text-light mb-5">{t("rewards.couponsDesc")}</p>
              {coupons.length > 0 ? (
                <div className="space-y-3">
                  {coupons.map(c => {
                    const isUsed    = !!c.used_at;
                    const isExpired = !isUsed && new Date(c.expires_at) < new Date();
                    const isActive  = !isUsed && !isExpired;
                    return (
                      <div key={c.id} className={`flex items-center justify-between p-4 rounded-xl border ${isActive ? "border-dashed border-tea-green bg-tea-green-mist/40" : "border-tea-green-pale bg-gray-50 opacity-60"}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-mono text-base font-bold tracking-widest ${isActive ? "text-tea-green" : "text-tea-text-light"}`}>{c.code}</p>
                            {isUsed    && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500">{t("rewards.couponUsed")}</span>}
                            {isExpired && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500">{t("rewards.couponExpired")}</span>}
                          </div>
                          <p className="text-xs text-tea-text-light mt-0.5">
                            {t("rewards.couponDiscount", { amount: c.discount_amount, min: c.min_order_amount })}
                            {isUsed ? t("rewards.couponUsedOn", { date: new Date(c.used_at!).toLocaleDateString(dateFmt) }) : t("rewards.couponValidUntil", { date: new Date(c.expires_at).toLocaleDateString(dateFmt) })}
                          </p>
                        </div>
                        <span className={`text-xl font-bold ${isActive ? "text-tea-green" : "text-tea-text-light"}`}>-${c.discount_amount}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-tea-text-light">{t("rewards.noCoupons")}</p>
              )}
            </div>
          </div>
        )}

        {/* ─── Orders Tab ─── */}
        {tab === "orders" && (
          <div className="space-y-3">
            {orderList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-tea-green-pale p-12 text-center">
                <div className="w-12 h-12 bg-tea-green-mist rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-tea-green">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
                  </svg>
                </div>
                <p className="text-tea-text font-medium mb-1">{t("orders.noOrdersTitle")}</p>
                <p className="text-sm text-tea-text-light">{t("orders.noOrdersDesc")}</p>
              </div>
            ) : (
              orderList.map((order) => {
                const status = getMemberStatusCls(order.order_status, order.payment_status);
                const isExpanded = expandedOrder === order.id;
                const itemCount = Array.isArray(order.items) ? order.items.reduce((s, i) => s + i.quantity, 0) : 0;
                const addr = order.shipping_address;
                const isHomeDelivery = addr?.type === "home";
                const isInternational = addr?.type === "international";
                const shippingText = isInternational
                  ? `🌍 ${addr.countryName ?? addr.country ?? ""} — ${[addr.addressLine1, addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ")}`
                  : isHomeDelivery
                    ? t("orders.homeDelivery", { city: addr.city ?? "", address: addr.address ?? "" })
                    : t("orders.cvsPickup", { store: CVS_NAME[addr?.company ?? ""] ?? addr?.company ?? "", storeName: addr?.storeName ?? "" });

                const canCancel = order.order_status === "new";
                const canEditAddress = isHomeDelivery && !isInternational && ["new", "preparing"].includes(order.order_status);
                const isCvsPending = !isHomeDelivery && ["new", "preparing"].includes(order.order_status);
                const isPendingPayment = order.payment_status === "pending"
                  && order.order_status !== "cancelled"
                  && order.order_status !== "failed"
                  && order.payment_method !== "cod";

                return (
                  <div key={order.id} className={`bg-white rounded-2xl border overflow-hidden ${isPendingPayment ? "border-amber-300 border-l-4" : "border-tea-green-pale"}`}>
                    {/* Order Summary Row */}
                    <button
                      className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-tea-cream-light/50 transition"
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs text-tea-text-light">#{shortId(order.id)}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.cls}`}>
                            {t(status.labelKey)}
                          </span>
                        </div>
                        <div className="text-sm text-tea-text-light">
                          {new Date(order.created_at).toLocaleDateString(dateFmt)} · {t("orders.itemCount", { count: itemCount })} · {order.payment_method === "cod" ? t("orders.cod") : order.payment_method === "paypal" ? "PayPal" : t("orders.online")}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold text-tea-text">NT${order.total_amount.toLocaleString()}</div>
                      </div>
                      <svg viewBox="0 0 24 24" className={`w-4 h-4 fill-tea-text-light flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                        <path d="M7 10l5 5 5-5z"/>
                      </svg>
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="border-t border-tea-green-pale px-6 py-4 bg-tea-cream-light/30 space-y-4">
                        {/* Items */}
                        <div>
                          <p className="text-xs font-semibold text-tea-text-light uppercase tracking-wider mb-2">{t("orders.items")}</p>
                          <div className="space-y-1.5">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="text-tea-text-light">{item.name} × {item.quantity}</span>
                                <span className="text-tea-text font-medium">NT${item.subtotal?.toLocaleString()}</span>
                              </div>
                            ))}
                            {order.shipping_fee > 0 && (
                              <div className="flex justify-between text-sm pt-1 border-t border-tea-green-pale/40">
                                <span className="text-tea-text-light">{t("orders.shippingFee")}</span>
                                <span className="text-tea-text font-medium">NT${order.shipping_fee.toLocaleString()}</span>
                              </div>
                            )}
                            {order.discount_amount > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-tea-text-light">{t("orders.discount")}</span>
                                <span className="text-tea-green font-medium">-NT${order.discount_amount.toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm font-semibold pt-1 border-t border-tea-green-pale/40">
                              <span className="text-tea-text">{t("orders.total")}</span>
                              <span className="text-tea-text">NT${order.total_amount.toLocaleString()}</span>
                            </div>
                          </div>
                          {(canCancel) && (
                            <p className="mt-2 text-xs text-tea-text-light">
                              {t("orders.changeHint")}
                            </p>
                          )}
                        </div>

                        {/* Shipping */}
                        <div>
                          <p className="text-xs font-semibold text-tea-text-light uppercase tracking-wider mb-1">{t("orders.shipping")}</p>
                          <p className="text-sm text-tea-text-light">{shippingText}</p>
                          {/* Edit address button (home delivery only, before shipped) */}
                          {canEditAddress && (
                            <button
                              onClick={() => openEditAddress(order)}
                              className="mt-2 text-xs text-tea-green hover:text-tea-green-dark font-medium underline underline-offset-2"
                            >
                              {t("orders.editAddress")}
                            </button>
                          )}
                          {/* CVS: show contact info */}
                          {isCvsPending && (
                            <p className="mt-2 text-xs text-tea-text-light">
                              {t("orders.cvsChangeHint")}
                              <a href="tel:0972619391" className="text-tea-green hover:underline mx-1">0972-619-391</a>
                              {t("modal.or")}
                              <a href="mailto:qdbzdt2846@gmail.com" className="text-tea-green hover:underline ml-1">qdbzdt2846@gmail.com</a>
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        {(() => {
                          const canRetry = order.payment_status === "pending"
                            && order.order_status !== "cancelled"
                            && order.order_status !== "failed"
                            && (order.payment_method === "paypal" || order.payment_method === "online");
                          if (!canCancel && !canRetry) return null;
                          return (
                            <div className="pt-3 border-t border-tea-green-pale/60 flex items-center gap-3">
                              {canRetry && (
                                <button
                                  onClick={() => handleOrderRetry(order.id, order.payment_method)}
                                  disabled={orderRetryingId === order.id}
                                  className="bg-tea-green hover:bg-tea-green-dark disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-full transition-colors"
                                >
                                  {orderRetryingId === order.id ? t("orders.retrying") : t("orders.retryPayment")}
                                </button>
                              )}
                              {canCancel && (
                                <button
                                  onClick={() => { setCancelConfirmId(order.id); setCancelError(""); }}
                                  className="text-sm text-rose-400 hover:text-rose-600 font-medium transition-colors"
                                >
                                  {t("orders.cancelOrder")}
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ─── Cancel Confirmation Modal ─── */}
      {cancelConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { if (!cancelling) setCancelConfirmId(null); }} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-tea-text text-lg mb-2">{t("modal.cancelOrderTitle")}</h3>
            <p className="text-sm text-tea-text-light mb-5">
              {t("modal.cancelOrderDesc")}
            </p>
            {cancelError && (
              <p className="mb-3 text-sm text-rose-500 bg-rose-50 rounded-lg px-3 py-2">{cancelError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirmId(null)}
                disabled={cancelling}
                className="flex-1 px-4 py-2.5 rounded-xl border border-tea-green-pale text-sm font-medium text-tea-text hover:bg-tea-cream-light transition disabled:opacity-50"
              >
                {t("modal.back")}
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition disabled:opacity-60"
              >
                {cancelling ? t("modal.cancelling") : t("modal.confirmCancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Cancel Booking Modal ─── */}
      {cancelBookingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => { if (!cancellingBooking) { setCancelBookingId(null); setCancelBookingResult(null); } }} />
            <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
              {cancelBookingResult ? (
                <>
                  <h3 className="font-semibold text-tea-text text-lg mb-2">{t("modal.cancelBookingDone")}</h3>
                  {cancelBookingWasPending ? (
                    <p className="text-sm text-tea-text-light mb-5">{t("modal.cancelBookingPendingDesc")}</p>
                  ) : (
                    <p className="text-sm text-tea-text-light mb-2">
                      {t("modal.cancelBookingRefund")}
                      {cancelBookingResult.refundAmount > 0
                        ? <strong className="text-tea-text"> NT$ {cancelBookingResult.refundAmount.toLocaleString()}</strong>
                        : <span>{t("modal.cancelBookingNoRefund")}</span>
                      }
                    </p>
                  )}
                  {cancelBookingResult.refundAmount > 0 && (
                    <p className="text-xs text-tea-text-light mb-5">{t("modal.cancelBookingRefundNote")}</p>
                  )}
                  <button
                    onClick={() => { setCancelBookingId(null); setCancelBookingResult(null); }}
                    className="w-full px-4 py-2.5 rounded-xl bg-tea-green hover:bg-tea-green-dark text-white text-sm font-medium transition"
                  >
                    {t("modal.confirm")}
                  </button>
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-tea-text text-lg mb-2">{t("modal.cancelBookingTitle")}</h3>
                  {cancelBookingWasPending ? (
                    <p className="text-sm text-tea-text-light mb-4">{t("modal.cancelBookingPendingConfirmDesc")}</p>
                  ) : (
                    <>
                      <p className="text-sm text-tea-text-light mb-1">{t("modal.cancelBookingPolicyDesc")}</p>
                      <div className="bg-tea-cream-light rounded-xl px-4 py-3 mb-4 text-xs space-y-1">
                        <div className="flex justify-between"><span className="text-tea-text-light">{t("modal.refund7days")}</span><span className="text-tea-green font-medium">{t("modal.refund100")}</span></div>
                        <div className="flex justify-between"><span className="text-tea-text-light">{t("modal.refund3to6days")}</span><span className="text-amber-600 font-medium">{t("modal.refund50")}</span></div>
                        <div className="flex justify-between"><span className="text-tea-text-light">{t("modal.refund1to2days")}</span><span className="text-amber-600 font-medium">{t("modal.refund20")}</span></div>
                        <div className="flex justify-between"><span className="text-tea-text-light">{t("modal.refundUnder24h")}</span><span className="text-rose-500 font-medium">{t("modal.noRefund")}</span></div>
                      </div>
                    </>
                  )}
                  {cancelBookingError && (
                    <p className="mb-3 text-sm text-rose-500 bg-rose-50 rounded-lg px-3 py-2">{cancelBookingError}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCancelBookingId(null)}
                      disabled={cancellingBooking}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-tea-green-pale text-sm font-medium text-tea-text hover:bg-tea-cream-light transition disabled:opacity-50"
                    >
                      {t("modal.back")}
                    </button>
                    <button
                      onClick={handleCancelBooking}
                      disabled={cancellingBooking}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition disabled:opacity-60"
                    >
                      {cancellingBooking ? t("modal.cancelling") : t("modal.confirmCancel")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
      )}

      {/* ─── Review Modal ─── */}
      {reviewBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { if (!reviewSubmitting) setReviewBookingId(null); }} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-tea-text text-lg mb-4">{t("modal.reviewTitle")}</h3>

            {/* 星星評分 */}
            <div className="flex gap-1.5 mb-5 justify-center">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  onMouseEnter={() => setReviewHover(star)}
                  onMouseLeave={() => setReviewHover(0)}
                  className="transition-transform hover:scale-110"
                >
                  <svg viewBox="0 0 20 20" className={`w-9 h-9 transition-colors ${star <= (reviewHover || reviewRating) ? "fill-amber-400" : "fill-gray-200"}`}>
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>

            {/* 文字評論 */}
            <textarea
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              placeholder={t("modal.reviewPlaceholder")}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-tea-green-pale text-sm text-tea-text placeholder-tea-text-light/50 focus:outline-none focus:ring-2 focus:ring-tea-green bg-tea-cream-light/50 resize-none mb-4"
            />

            {reviewError && (
              <p className="mb-3 text-sm text-rose-500 bg-rose-50 rounded-lg px-3 py-2">{reviewError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setReviewBookingId(null)}
                disabled={reviewSubmitting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-tea-green-pale text-sm font-medium text-tea-text hover:bg-tea-cream-light transition disabled:opacity-50"
              >
                {t("modal.cancel")}
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={reviewSubmitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-tea-green hover:bg-tea-green-dark text-white text-sm font-medium transition disabled:opacity-60"
              >
                {reviewSubmitting ? t("modal.submitting") : t("modal.submitReview")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Address Modal ─── */}
      {editAddressOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { if (!savingAddress) setEditAddressOrder(null); }} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-tea-text text-lg mb-1">{t("modal.editAddressTitle")}</h3>
            <p className="text-xs text-tea-text-light mb-4">{t("modal.orderNumber", { id: shortId(editAddressOrder.id) })}</p>
            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-tea-text mb-1.5">{t("modal.editAddressCity")}</label>
                <select
                  value={addressForm.city}
                  onChange={(e) => setAddressForm(p => ({ ...p, city: e.target.value }))}
                  className={inputCls(addressError && !addressForm.city ? addressError : undefined)}
                >
                  <option value="">{t("modal.editAddressSelectCity")}</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-tea-text mb-1.5">{t("modal.editAddressAddress")}</label>
                <input
                  type="text"
                  value={addressForm.address}
                  onChange={(e) => setAddressForm(p => ({ ...p, address: e.target.value }))}
                  placeholder={t("modal.editAddressPlaceholder")}
                  className={inputCls(addressError && !addressForm.address ? addressError : undefined)}
                />
              </div>
              {addressError && (
                <p className="text-sm text-rose-500 bg-rose-50 rounded-lg px-3 py-2">{addressError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditAddressOrder(null)}
                  disabled={savingAddress}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-tea-green-pale text-sm font-medium text-tea-text hover:bg-tea-cream-light transition disabled:opacity-50"
                >
                  {t("modal.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-tea-green hover:bg-tea-green-dark text-white text-sm font-medium transition disabled:opacity-60"
                >
                  {savingAddress ? t("modal.editAddressSaving") : t("modal.editAddressSave")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
