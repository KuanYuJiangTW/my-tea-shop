"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import type {
  PaymentMethod,
  DeliveryType,
  CheckoutForm,
  EcpayCheckoutResponse,
  CreateOrderRequest,
} from "@/types";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^09\d{8}$/;
const CITIES = ["台北市","新北市","桃園市","台中市","台南市","高雄市","基隆市","新竹市","新竹縣","苗栗縣","彰化縣","南投縣","雲林縣","嘉義市","嘉義縣","屏東縣","宜蘭縣","花蓮縣","台東縣","澎湖縣","金門縣","連江縣"];

type FormErrors = {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  address?: string;
  cvsStoreName?: string;
};

export default function CheckoutClient() {
  const { items, totalPrice, clearCart } = useCart();
  const { user, loading: authLoading }   = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("checkout");
  const tCommon = useTranslations("common");
  const lp = (path: string) => locale === "en" ? `/en${path}` : path;
  const [submitting, setSubmitting]     = useState(false);
  const [selectingStore, setSelectingStore] = useState(false);
  const [error, setError]           = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [codSuccess, setCodSuccess] = useState(false);
  const [payment, setPayment]       = useState<PaymentMethod>("online");
  const [delivery, setDelivery]     = useState<DeliveryType>("home");
  const [ecpayData, setEcpayData]   = useState<EcpayCheckoutResponse | null>(null);
  const ecpayFormRef = useRef<HTMLFormElement>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);
  const [cvsOpen, setCvsOpen] = useState(false);
  const cvsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setCityOpen(false);
      }
      if (cvsRef.current && !cvsRef.current.contains(e.target as Node)) {
        setCvsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 折價券
  type CouponRow = { id: string; code: string; discount_amount: number; min_order_amount: number; expires_at: string };
  const [availableCoupons, setAvailableCoupons]   = useState<CouponRow[]>([]);
  const [couponInput, setCouponInput]             = useState("");
  const [appliedCoupon, setAppliedCoupon]         = useState<CouponRow | null>(null);
  const [couponError, setCouponError]             = useState("");
  const [showCouponDropdown, setShowCouponDropdown] = useState(false);
  const autoAppliedRef = useRef(false);

  // 點數
  const [pointsBalance, setPointsBalance] = useState(0);
  const [usePoints, setUsePoints]         = useState(false);

  // 運費
  const shippingFee = totalPrice >= 1000 ? 0 : delivery === "home" ? 250 : 60;

  // 折扣計算
  const couponDiscount  = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const afterCoupon     = totalPrice + shippingFee - couponDiscount;
  const maxPointsToUse  = Math.floor(Math.min(pointsBalance, Math.floor(afterCoupon * 0.1) * 100) / 100) * 100;
  const pointsDiscount  = usePoints && maxPointsToUse >= 200 ? maxPointsToUse / 100 : 0;
  const grandTotal      = Math.max(afterCoupon - pointsDiscount, 0);

  useEffect(() => {
    fetch("/api/user/coupons").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setAvailableCoupons(data);
    }).catch(() => {});
    fetch("/api/user/points").then(r => r.json()).then(data => {
      if (typeof data.balance === "number") setPointsBalance(data.balance);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (availableCoupons.length === 0 || autoAppliedRef.current) return;
    autoAppliedRef.current = true;
    const best = availableCoupons
      .filter(c => totalPrice + shippingFee >= c.min_order_amount)
      .sort((a, b) => b.discount_amount - a.discount_amount)[0];
    if (best) {
      setCouponInput(best.code);
      setAppliedCoupon(best);
    }
  }, [availableCoupons, totalPrice, shippingFee]);

  function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) { setAppliedCoupon(null); setCouponError(""); return; }
    const match = availableCoupons.find(c => c.code.toUpperCase() === code);
    if (!match) { setCouponError(t("couponNotFound")); setAppliedCoupon(null); return; }
    if (totalPrice + shippingFee < match.min_order_amount) {
      setCouponError(t("couponMinOrder", { min: match.min_order_amount }));
      setAppliedCoupon(null);
      return;
    }
    setCouponError("");
    setAppliedCoupon(match);
  }

  function selectCoupon(c: CouponRow) {
    setCouponInput(c.code);
    setAppliedCoupon(c);
    setCouponError("");
    setShowCouponDropdown(false);
  }

  const [form, setForm] = useState<CheckoutForm>({
    name: "", email: "", phone: "",
    city: "", address: "",
    cvsCompany: "seven", cvsStoreId: "", cvsStoreName: "",
    note: "",
  });

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("profiles")
      .select("name, phone, city, address")
      .eq("id", user.id)
      .single()
      .then((res: { data: { name?: string | null; phone?: string | null; city?: string | null; address?: string | null } | null }) => {
        const p = res.data;
        if (p) {
          setForm(prev => ({
            ...prev,
            name:    p.name    ?? prev.name,
            phone:   p.phone   ?? prev.phone,
            email:   user.email   ?? prev.email,
            city:    p.city    ?? prev.city,
            address: p.address ?? prev.address,
          }));
        } else {
          setForm(prev => ({ ...prev, email: user.email ?? prev.email }));
        }
      });
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(lp("/auth/login?redirect=" + lp("/checkout")));
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (ecpayData && ecpayFormRef.current) {
      ecpayFormRef.current.submit();
    }
  }, [ecpayData]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== "cvs-selected") return;
      setForm(prev => ({
        ...prev,
        cvsStoreId:   e.data.storeId   ?? "",
        cvsStoreName: e.data.storeName ?? "",
      }));
      setFormErrors(prev => ({ ...prev, cvsStoreName: undefined }));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  async function handleSelectStore() {
    setSelectingStore(true);
    try {
      const res = await fetch("/api/ecpay/cvs-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvsCompany: form.cvsCompany }),
      });
      if (!res.ok) throw new Error();
      const { actionUrl, params } = await res.json() as { actionUrl: string; params: Record<string, string> };

      window.open("", "cvs-map-popup", "width=1024,height=768,resizable=yes");

      const mapForm = document.createElement("form");
      mapForm.method = "POST";
      mapForm.action = actionUrl;
      mapForm.target = "cvs-map-popup";
      for (const [key, value] of Object.entries(params)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        mapForm.appendChild(input);
      }
      document.body.appendChild(mapForm);
      mapForm.submit();
      document.body.removeChild(mapForm);
    } catch {
      setError(t("cvsMapError"));
    } finally {
      setSelectingStore(false);
    }
  }

  const buildOrderPayload = (): CreateOrderRequest => ({
    customer: { name: form.name, email: form.email, phone: form.phone },
    paymentMethod: payment,
    deliveryType:  delivery,
    ...(delivery === "home"
      ? { shippingAddress: { city: form.city, address: form.address } }
      : { cvsInfo: { company: form.cvsCompany, storeId: form.cvsStoreId, storeName: form.cvsStoreName } }),
    items: items.map(i => {
      const rawId = i.product.id;
      let productId: number;
      let spec: "150g" | "75g" | "teabag";
      if (rawId >= 20000) {
        productId = rawId - 20000;
        spec = "teabag";
      } else if (rawId >= 10000) {
        productId = rawId - 10000;
        spec = "75g";
      } else {
        productId = rawId;
        spec = "150g";
      }
      return { productId, quantity: i.quantity, spec };
    }),
    note:        form.note || undefined,
    couponCode:  appliedCoupon?.code,
    pointsToUse: usePoints && maxPointsToUse >= 200 ? maxPointsToUse : undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError("");

    if (payment === "cod") {
      try {
        const res = await fetch("/api/orders", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(buildOrderPayload()),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? t("errors.orderFailed"));
        }
        clearCart();
        setCodSuccess(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("errors.orderFailed"));
      }
      setSubmitting(false);
      return;
    }

    if (payment === "stripe") {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(buildOrderPayload()),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? t("errors.networkError"));
        }
        const { url } = await res.json();
        if (url) {
          clearCart();
          // Ensure localStorage is cleared before redirect
          try { localStorage.removeItem("cart"); } catch {}
          window.location.href = url;
        } else {
          throw new Error(t("errors.networkError"));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t("errors.networkError"));
        setSubmitting(false);
      }
      return;
    }

    try {
      const res = await fetch("/api/ecpay/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(buildOrderPayload()),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? t("errors.networkError"));
      }
      setEcpayData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.networkError"));
      setSubmitting(false);
    }
  };

  function validate(): boolean {
    const e: FormErrors = {};
    const phone = form.phone.replace(/[-\s]/g, "");
    if (form.name.trim().length < 2)                       e.name  = t("errors.nameRequired");
    if (!user?.email && !emailRegex.test(form.email.trim())) e.email = t("errors.emailInvalid");
    if (!phoneRegex.test(phone))                           e.phone = t("errors.phoneInvalid");
    if (delivery === "home") {
      if (!CITIES.includes(form.city))        e.city    = t("errors.cityRequired");
      if (form.address.trim().length < 4)     e.address = t("errors.addressRequired");
    }
    if (delivery === "cvs") {
      if (!form.cvsStoreId || !form.cvsStoreName) e.cvsStoreName = t("errors.storeRequired");
    }
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  const inputCls = (hasError?: boolean) =>
    `w-full border rounded-xl px-4 py-3 text-sm text-tea-text placeholder-tea-text-light/60 focus:outline-none focus:border-tea-green bg-tea-cream-light/50 ${
      hasError ? "border-rose-300" : "border-tea-green-pale"
    }`;

  const cvsOptions = [
    { value: "seven",  label: "7-ELEVEN" },
    { value: "family", label: "全家 FamilyMart" },
    { value: "hilife", label: "萊爾富 Hi-Life" },
    { value: "ok",     label: "OK 超商" },
  ];

  if (codSuccess) {
    const cvsName = cvsOptions.find(o => o.value === form.cvsCompany)?.label ?? form.cvsCompany;
    return (
      <div className="min-h-screen bg-tea-cream-light flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-tea-green-mist rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7D9B84" strokeWidth="2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="font-serif text-3xl font-bold text-tea-text mb-3">{t("codSuccess.title")}</h2>
          <p className="text-tea-text-light mb-2">{t("codSuccess.desc")}</p>
          <p className="text-tea-text-light text-sm mb-2">
            {t("codSuccess.deliveryLabel")}{delivery === "home" ? t("codSuccess.homeDelivery") : t("codSuccess.cvsDelivery", { name: cvsName })}
          </p>
          <p className="text-tea-text-light text-sm mb-2">{t("codSuccess.paymentLabel")}</p>
          {user?.email ? (
            <p className="text-tea-text-light text-sm mb-10">{t("codSuccess.emailSent", { email: user.email })}</p>
          ) : (
            <p className="text-sm text-amber-600 mb-10">
              {t("codSuccess.noEmailPrefix")}{" "}
              <Link href={lp("/account")} className="underline font-medium">{tCommon("user.account")}</Link>
              {" "}{t("codSuccess.noEmailSuffix")}
            </p>
          )}
          <Link href={lp("/")} className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3.5 rounded-full font-medium transition-colors">
            {t("codSuccess.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-tea-cream-light flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-tea-text-light mb-6">{t("emptyCart")}</p>
          <Link href={lp("/products")} className="bg-tea-green text-white px-8 py-3.5 rounded-full font-medium">
            {t("shopNow")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tea-cream-light">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-8 md:mb-10">{t("title")}</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">

              {/* Contact Info */}
              <div className="bg-white rounded-2xl p-7 shadow-sm">
                <h2 className="font-serif text-xl font-bold text-tea-text mb-6">{t("contactInfo")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-tea-text mb-2">{t("name")} *</label>
                    <input type="text" name="name" value={form.name} onChange={(e) => { handleChange(e); setFormErrors(p => ({ ...p, name: undefined })); }} placeholder={t("namePlaceholder")} className={inputCls(!!formErrors.name)} />
                    {formErrors.name && <p className="mt-1 text-xs text-rose-500">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-tea-text mb-2">{t("phone")} *</label>
                    <input type="tel" name="phone" value={form.phone} onChange={(e) => { handleChange(e); setFormErrors(p => ({ ...p, phone: undefined })); }} placeholder={t("phonePlaceholder")} className={inputCls(!!formErrors.phone)} />
                    {formErrors.phone && <p className="mt-1 text-xs text-rose-500">{formErrors.phone}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-tea-text mb-2">{t("email")} *</label>
                    {user?.email ? (
                      <>
                        <input type="email" name="email" value={form.email} readOnly placeholder="your@email.com" className={inputCls() + " cursor-not-allowed opacity-70"} />
                        <p className="mt-1 text-xs text-tea-text-light">{t("emailReadonlyHint")}</p>
                      </>
                    ) : (
                      <>
                        <input type="email" name="email" value={form.email} onChange={(e) => { handleChange(e); setFormErrors(p => ({ ...p, email: undefined })); }} placeholder="your@email.com" className={inputCls(!!formErrors.email)} />
                        {formErrors.email && <p className="mt-1 text-xs text-rose-500">{formErrors.email}</p>}
                        <p className="mt-1 text-xs text-tea-text-light">{t("emailHint")}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-2xl p-7 shadow-sm">
                <h2 className="font-serif text-xl font-bold text-tea-text mb-5">{t("paymentMethod")}</h2>
                <div className="space-y-3">
                  {([
                    { value: "online" as PaymentMethod, label: t("onlinePayment"), desc: t("onlinePaymentDesc"),
                      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
                    { value: "stripe" as PaymentMethod, label: t("stripePayment"), desc: t("stripePaymentDesc"),
                      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7z"/><path d="M12 11c-1.5-1.5-4 .5-2 2s3.5-.5 2-2z"/><circle cx="7" cy="12" r="1"/><circle cx="17" cy="12" r="1"/></svg> },
                    { value: "cod" as PaymentMethod, label: t("cashOnDelivery"), desc: t("codDesc"),
                      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2"/><path d="M3 8h14v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/><path d="M6 8V6a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> },
                  ]).map(opt => (
                    <label key={opt.value} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${payment === opt.value ? "border-tea-green bg-tea-green-mist" : "border-tea-green-pale hover:bg-tea-cream-light"}`}>
                      <input type="radio" name="payment" value={opt.value} checked={payment === opt.value}
                        onChange={() => setPayment(opt.value)} className="accent-tea-green mt-0.5" />
                      <div className={`mt-0.5 ${payment === opt.value ? "text-tea-green" : "text-tea-text-light"}`}>{opt.icon}</div>
                      <div>
                        <div className="text-sm font-medium text-tea-text">{opt.label}</div>
                        <div className="text-xs text-tea-text-light mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Delivery Method */}
              <div className="bg-white rounded-2xl p-7 shadow-sm">
                <h2 className="font-serif text-xl font-bold text-tea-text mb-5">{t("deliveryMethod")}</h2>
                <div className="space-y-3 mb-6">
                  {([
                    { value: "home" as DeliveryType, label: t("homeDelivery"), desc: t("homeDeliveryDesc"),
                      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
                    { value: "cvs" as DeliveryType, label: t("cvsPickup"), desc: t("cvsPickupDesc"),
                      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3h18v4H3z"/><path d="M3 7v13h18V7"/><path d="M9 7v13M15 7v13"/></svg> },
                  ]).map(opt => (
                    <label key={opt.value} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${delivery === opt.value ? "border-tea-green bg-tea-green-mist" : "border-tea-green-pale hover:bg-tea-cream-light"}`}>
                      <input type="radio" name="delivery" value={opt.value} checked={delivery === opt.value}
                        onChange={() => setDelivery(opt.value)} className="accent-tea-green mt-0.5" />
                      <div className={`mt-0.5 ${delivery === opt.value ? "text-tea-green" : "text-tea-text-light"}`}>{opt.icon}</div>
                      <div>
                        <div className="text-sm font-medium text-tea-text">{opt.label}</div>
                        <div className="text-xs text-tea-text-light mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Home Delivery Address */}
                {delivery === "home" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-tea-text mb-2">{t("city")} *</label>
                      <div ref={cityRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setCityOpen(!cityOpen)}
                          className={`${inputCls(!!formErrors.city)} flex items-center justify-between text-left ${!form.city ? "text-tea-text-light/60" : "text-tea-text"}`}
                        >
                          <span>{form.city || t("selectCityPlaceholder")}</span>
                          <ChevronDown className={`w-4 h-4 flex-shrink-0 text-tea-text-light transition-transform duration-200 ${cityOpen ? "rotate-180" : ""}`} />
                        </button>
                        {cityOpen && (
                          <div className="absolute z-20 w-full mt-1 bg-white border border-tea-green-pale rounded-xl shadow-lg overflow-y-auto max-h-56">
                            {CITIES.map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => {
                                  setForm(prev => ({ ...prev, city: c }));
                                  setFormErrors(p => ({ ...p, city: undefined }));
                                  setCityOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                  form.city === c
                                    ? "bg-tea-green-mist text-tea-green font-medium"
                                    : "text-tea-text hover:bg-tea-green-mist hover:text-tea-green"
                                }`}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {formErrors.city && <p className="mt-1 text-xs text-rose-500">{formErrors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-tea-text mb-2">{t("address")} *</label>
                      <input type="text" name="address" value={form.address} onChange={(e) => { handleChange(e); setFormErrors(p => ({ ...p, address: undefined })); }}
                        placeholder={t("addressPlaceholder")} className={inputCls(!!formErrors.address)} />
                      {formErrors.address && <p className="mt-1 text-xs text-rose-500">{formErrors.address}</p>}
                    </div>
                  </div>
                )}

                {/* CVS Pickup */}
                {delivery === "cvs" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-tea-text mb-2">{t("cvsBrand")} *</label>
                      <div ref={cvsRef} className="relative">
                        {(() => {
                          const selected = cvsOptions.find(o => o.value === form.cvsCompany);
                          return (
                            <>
                              <button
                                type="button"
                                onClick={() => setCvsOpen(!cvsOpen)}
                                className={`${inputCls()} flex items-center justify-between text-left text-tea-text`}
                              >
                                <span>{selected?.label}</span>
                                <ChevronDown className={`w-4 h-4 flex-shrink-0 text-tea-text-light transition-transform duration-200 ${cvsOpen ? "rotate-180" : ""}`} />
                              </button>
                              {cvsOpen && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-tea-green-pale rounded-xl shadow-lg overflow-hidden">
                                  {cvsOptions.map(opt => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => {
                                        setForm(prev => ({ ...prev, cvsCompany: opt.value as CheckoutForm["cvsCompany"], cvsStoreId: "", cvsStoreName: "" }));
                                        setCvsOpen(false);
                                      }}
                                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                        form.cvsCompany === opt.value
                                          ? "bg-tea-green-mist text-tea-green font-medium"
                                          : "text-tea-text hover:bg-tea-green-mist hover:text-tea-green"
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-tea-text mb-2">{t("cvsStore")} *</label>
                      {form.cvsStoreName ? (
                        <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${formErrors.cvsStoreName ? "border-rose-300" : "border-tea-green"} bg-tea-green-mist/40`}>
                          <div>
                            <p className="text-sm font-medium text-tea-text">{form.cvsStoreName}</p>
                            <p className="text-xs text-tea-text-light mt-0.5">{t("cvsStoreId", { id: form.cvsStoreId })}</p>
                          </div>
                          <button type="button" onClick={handleSelectStore}
                            className="text-xs text-tea-green hover:text-tea-green-dark font-medium whitespace-nowrap ml-4 transition-colors">
                            {t("cvsReselect")}
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={handleSelectStore} disabled={selectingStore}
                          className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 border text-sm font-medium transition-colors
                            ${formErrors.cvsStoreName ? "border-rose-300" : "border-tea-green-pale hover:border-tea-green"}
                            text-tea-text hover:bg-tea-cream-light disabled:opacity-60`}>
                          {selectingStore ? (
                            <>
                              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10"/>
                              </svg>
                              {t("cvsMapOpening")}
                            </>
                          ) : (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                              </svg>
                              {t("cvsMapBtn")}
                            </>
                          )}
                        </button>
                      )}
                      {formErrors.cvsStoreName && <p className="mt-1 text-xs text-rose-500">{formErrors.cvsStoreName}</p>}
                    </div>
                    <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-3">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <p className="text-xs text-amber-700">{t("cvsNotice")}</p>
                    </div>
                  </div>
                )}

                {/* Note */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-tea-text mb-2">{t("note")}</label>
                  <textarea name="note" value={form.note} onChange={handleChange} rows={3}
                    placeholder={t("notePlaceholder")} className={`${inputCls()} resize-none`} />
                </div>
              </div>

            </div>

            {/* Order Summary */}
            <div>
              <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
                <h2 className="font-serif text-xl font-bold text-tea-text mb-5">{t("orderSummary")}</h2>
                <div className="space-y-3 mb-5">
                  {items.map(item => (
                    <div key={item.product.id} className="flex justify-between text-sm">
                      <span className="text-tea-text-light">{item.product.name} {item.product.weight} × {item.quantity}</span>
                      <span className="text-tea-text font-medium">NT${(item.product.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* Coupon */}
                <div className="border-t border-tea-green-pale pt-4 mb-3">
                  <p className="text-xs font-medium text-tea-text mb-2">{t("coupon")}</p>
                  <div className="relative">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={e => {
                          const val = e.target.value.toUpperCase();
                          setCouponInput(val);
                          setCouponError("");
                          if (appliedCoupon && val !== appliedCoupon.code) setAppliedCoupon(null);
                        }}
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleApplyCoupon())}
                        placeholder={t("couponPlaceholder")}
                        className="flex-1 border border-tea-green-pale rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-tea-green bg-tea-cream-light/50 font-mono"
                      />
                      {availableCoupons.length > 0 && (
                        <button type="button" onClick={() => setShowCouponDropdown(v => !v)}
                          className="px-2.5 border border-tea-green-pale rounded-lg hover:bg-tea-cream-light transition-colors text-tea-text-light"
                          title={t("coupon")}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        </button>
                      )}
                      <button type="button" onClick={handleApplyCoupon}
                        className="px-3 py-2 bg-tea-green hover:bg-tea-green-dark text-white text-xs rounded-lg transition-colors whitespace-nowrap">
                        {t("applyCoupon")}
                      </button>
                    </div>

                    {showCouponDropdown && availableCoupons.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-tea-green-pale rounded-xl shadow-lg overflow-hidden">
                        {availableCoupons.map(c => {
                          const eligible = totalPrice + shippingFee >= c.min_order_amount;
                          const isApplied = appliedCoupon?.id === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              disabled={!eligible}
                              onClick={() => eligible && selectCoupon(c)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors border-b border-tea-green-pale/50 last:border-0
                                ${eligible ? "hover:bg-tea-cream-light cursor-pointer" : "opacity-40 cursor-not-allowed"}
                                ${isApplied ? "bg-tea-green-mist/50" : ""}`}
                            >
                              <div>
                                <span className="font-mono text-xs font-bold text-tea-green">{c.code}</span>
                                <span className="ml-2 text-xs text-tea-text-light">{t("couponDiscountInfo", { amount: c.discount_amount })}</span>
                                {!eligible && <span className="ml-1 text-xs text-rose-400">{t("couponMinRequired", { min: c.min_order_amount })}</span>}
                              </div>
                              {isApplied && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7D9B84" strokeWidth="2.5">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {couponError && <p className="mt-1 text-xs text-rose-500">{couponError}</p>}
                  {appliedCoupon && !couponError && (
                    <p className="mt-1 text-xs text-tea-green">{t("couponAppliedMsg", { amount: appliedCoupon.discount_amount })}</p>
                  )}
                </div>

                {/* Points */}
                {pointsBalance >= 200 && maxPointsToUse >= 200 && (
                  <div className="mb-3 pb-3 border-b border-tea-green-pale">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={usePoints} onChange={e => setUsePoints(e.target.checked)}
                        className="accent-tea-green" />
                      <span className="text-xs text-tea-text">
                        {t("usePointsLabel", { points: maxPointsToUse.toLocaleString(), discount: (maxPointsToUse / 100).toLocaleString() })}
                        <span className="text-tea-text-light ml-1">{t("pointsBalanceLabel", { balance: pointsBalance.toLocaleString() })}</span>
                      </span>
                    </label>
                  </div>
                )}

                <div className="mb-6 space-y-2">
                  <div className="flex justify-between text-sm text-tea-text-light">
                    <span>{t("shippingFee")}</span>
                    {shippingFee === 0 ? (
                      <span className="text-tea-green">{t("shippingFree")}</span>
                    ) : (
                      <span className="text-tea-text">NT${shippingFee.toLocaleString()}</span>
                    )}
                  </div>
                  {shippingFee > 0 && (
                    <p className="text-xs text-amber-600">{t("shippingThreshold")}</p>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-tea-green">
                      <span>{t("couponDiscountLabel")}</span>
                      <span>-NT${couponDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {pointsDiscount > 0 && (
                    <div className="flex justify-between text-sm text-tea-green">
                      <span>{t("pointsDiscountLabel")}</span>
                      <span>-NT${pointsDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-tea-text-light">
                    <span>{t("paymentLabel")}</span>
                    <span>{payment === "stripe" ? t("stripeShort") : payment === "online" ? t("onlinePaymentShort") : t("codShort")}</span>
                  </div>
                  <div className="flex justify-between font-bold text-tea-text pt-1">
                    <span>{t("totalAmount")}</span>
                    <span className="text-tea-green text-lg">NT${grandTotal.toLocaleString()}</span>
                  </div>
                </div>
                {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
                <button type="submit" disabled={submitting}
                  className="w-full bg-tea-green hover:bg-tea-green-dark disabled:opacity-60 text-white py-3.5 rounded-full font-medium transition-colors flex items-center justify-center gap-2">
                  {submitting ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10"/>
                      </svg>
                      {t("processing")}
                    </>
                  ) : payment === "stripe" ? (
                    <>
                      {t("submitStripe")}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </>
                  ) : payment === "online" ? (
                    <>
                      {t("submitOnline")}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </>
                  ) : (
                    <>
                      {t("submitCod")}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </>
                  )}
                </button>
                <Link href={lp("/cart")} className="block text-center text-tea-text-light hover:text-tea-green text-sm mt-4 transition-colors">
                  {t("backToCart")}
                </Link>
              </div>
            </div>

          </div>
        </form>
      </div>

      {ecpayData && (
        <form ref={ecpayFormRef} method="POST" action={ecpayData.ecpayUrl} style={{ display: "none" }}>
          {Object.entries(ecpayData.params).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      )}
    </div>
  );
}
