"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Users, Clock, Calendar, ChevronRight, AlertCircle } from "lucide-react";
import { ExperienceSession, ExperienceType } from "@/types";
import { ExperienceContent } from "@/lib/experiences";

interface Props {
  session:    ExperienceSession & { experienceType: ExperienceType };
  userEmail:  string | null;
  content?:   ExperienceContent | null;
}

type Step = 1 | 2;

export default function BookingFlow({ session, userEmail }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("experienceBooking");
  const lp = (path: string) => locale === "en" ? `/en${path}` : path;

  const REFUND_POLICY = [
    { key: "7days",    color: "text-tea-green-ink" },
    { key: "3to6days", color: "text-amber-600" },
    { key: "1to2days", color: "text-amber-600" },
    { key: "under24h", color: "text-red-500" },
  ] as const;

  const DIET_OPTIONS = [
    { value: "素食",     label: t("dietaryOptions.vegetarian") },
    { value: "對茶類過敏", label: t("dietaryOptions.teaAllergy") },
  ];
  const exp    = session.experienceType;

  const available = exp.maxParticipants - session.currentParticipants;
  const isFull    = available <= 0;

  const [step, setStep]           = useState<Step>(1);
  const [count, setCount]         = useState(Math.max(exp.minParticipants, 1));
  const [adultConfirmed, setAdult]= useState(false);
  const [name,  setName]          = useState("");
  const [phone, setPhone]         = useState("");
  const [diet,  setDiet]          = useState("");
  const [agreed, setAgreed]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error,  setError]        = useState("");
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsMaxRate, setPointsMaxRate] = useState(0.10);
  const [pointsInput, setPointsInput]     = useState("");

  useEffect(() => {
    fetch("/api/user/points")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.balance) setPointsBalance(d.balance);
        if (d?.tier?.max_discount_rate) setPointsMaxRate(d.tier.max_discount_rate);
      })
      .catch(() => {});
  }, []);

  // 候補模式
  const [waitlistCount, setWaitlistCount] = useState(1);
  const [waitlistDone, setWaitlistDone]   = useState(false);

  const totalPrice      = exp.price * count;
  const parsedPoints    = parseInt(pointsInput) || 0;
  const maxPointsAllow  = Math.min(pointsBalance, Math.floor(totalPrice * pointsMaxRate));
  const validPoints     = parsedPoints >= 10 && parsedPoints <= maxPointsAllow ? parsedPoints : 0;
  const pointsDiscount  = validPoints; // 1:1
  const finalPrice      = Math.max(totalPrice - pointsDiscount, 0);
  const dateLabel  = new Date(session.sessionDate + "T00:00:00").toLocaleDateString(
    locale === "en" ? "en-US" : "zh-TW",
    { year: "numeric", month: "long", day: "numeric", weekday: "long" }
  );

  const handleJoinWaitlist = async () => {
    if (!name.trim())  return setError(t("errors.nameRequired"));
    if (!phone.trim()) return setError(t("errors.phoneRequired"));
    if (exp.requiresAdult && !adultConfirmed) return setError(t("errors.adultRequired"));

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/waitlist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId:        session.id,
          participantCount: waitlistCount,
          bookerName:       name.trim(),
          bookerPhone:      phone.trim(),
          dietaryNotes:     diet.trim() || undefined,
          adultConfirmed,
        }),
      });

      if (res.status === 401) {
        router.push(lp(`/auth/login?redirect=${lp(`/experiences/booking/${session.id}`)}`));
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("apiErrors.waitlistFailed"));
        return;
      }

      setWaitlistDone(true);
    } catch {
      setError(t("apiErrors.networkError"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim())  return setError(t("errors.nameRequired"));
    if (!phone.trim()) return setError(t("errors.phoneRequired"));
    if (!agreed)       return setError(t("errors.agreeRequired"));
    if (exp.requiresAdult && !adultConfirmed) return setError(t("errors.adultRequired"));

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bookings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId:        session.id,
          participantCount: count,
          bookerName:       name.trim(),
          bookerPhone:      phone.trim(),
          dietaryNotes:     diet.trim() || undefined,
          adultConfirmed,
        }),
      });

      if (res.status === 401) {
        router.push(lp(`/auth/login?redirect=${lp(`/experiences/booking/${session.id}`)}`));
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("apiErrors.bookingFailed"));
        return;
      }

      // 導向 ECPay 付款（複用現有金流）
      const payRes = await fetch("/api/ecpay/experience-checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: data.bookingId, pointsToUse: validPoints }),
      });
      const payData = await payRes.json();

      if (!payRes.ok) {
        setError(payData.error ?? t("apiErrors.paymentFailed"));
        return;
      }

      // 建立隱藏表單送出到 ECPay
      const form = document.createElement("form");
      form.method = "POST";
      form.action = payData.ecpayUrl;
      Object.entries(payData.params as Record<string, string>).forEach(([k, v]) => {
        const input = document.createElement("input");
        input.type  = "hidden";
        input.name  = k;
        input.value = v;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch {
      setError(t("apiErrors.networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* 場次摘要 */}
      <div className="bg-white rounded-2xl p-6 border border-tea-green-pale/50 shadow-sm mb-6">
        <p className="text-tea-green-ink text-xs tracking-widest uppercase mb-1">{exp.nameEn}</p>
        <h2 className="font-serif text-2xl font-bold text-tea-text mb-4">{exp.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2 text-tea-text-muted">
            <Calendar className="w-4 h-4 text-tea-green-ink mt-0.5 shrink-0" />
            <div>
              <div className="text-xs mb-0.5">{t("sessionDate")}</div>
              <div className="font-medium text-tea-text">{dateLabel}</div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-tea-text-muted">
            <Clock className="w-4 h-4 text-tea-green-ink mt-0.5 shrink-0" />
            <div>
              <div className="text-xs mb-0.5">{t("sessionTime")}</div>
              <div className="font-medium text-tea-text">{session.startTime.slice(0, 5)}</div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-tea-text-muted">
            <Users className="w-4 h-4 text-tea-green-ink mt-0.5 shrink-0" />
            <div>
              <div className="text-xs mb-0.5">{t("availableSpots")}</div>
              <div className="font-medium text-tea-text">{available} / {exp.maxParticipants}</div>
            </div>
          </div>
        </div>
        {session.currentParticipants < exp.minParticipants && (
          <div className="mt-4 flex items-center gap-2 bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {t("minParticipantsWarning", { current: session.currentParticipants, min: exp.minParticipants })}
          </div>
        )}
      </div>

      {/* 額滿：候補模式 */}
      {isFull && !waitlistDone && (
        <div className="bg-white rounded-2xl p-6 border border-tea-green-pale/50 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-amber-600 bg-amber-50 rounded-xl p-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {t("waitlist.fullNotice")}
          </div>
          <h3 className="font-serif text-lg font-bold text-tea-text mb-5">{t("waitlist.title")}</h3>

          {/* 候補人數 */}
          <div className="flex items-center gap-6 mb-5">
            <button onClick={() => setWaitlistCount(c => Math.max(1, c - 1))} disabled={waitlistCount <= 1}
              className="w-10 h-10 rounded-full border-2 border-tea-green text-tea-green-ink font-bold text-xl hover:bg-tea-green-ink hover:text-white transition-colors disabled:opacity-30">−</button>
            <span className="text-3xl font-bold text-tea-text w-8 text-center">{waitlistCount}</span>
            <button onClick={() => setWaitlistCount(c => Math.min(exp.maxParticipants, c + 1))} disabled={waitlistCount >= exp.maxParticipants}
              className="w-10 h-10 rounded-full border-2 border-tea-green text-tea-green-ink font-bold text-xl hover:bg-tea-green-ink hover:text-white transition-colors disabled:opacity-30">+</button>
            <span className="text-sm text-tea-text-muted">{t("participantCount")}</span>
          </div>

          {/* 姓名電話 */}
          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">{t("bookerName")} <span className="text-red-500">*</span></label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t("bookerNamePlaceholder")}
                className="w-full border border-tea-green-pale rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/30 focus:border-tea-green" />
            </div>
            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">{t("bookerPhone")} <span className="text-red-500">*</span></label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t("bookerPhonePlaceholder")}
                className="w-full border border-tea-green-pale rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/30 focus:border-tea-green" />
            </div>
            {exp.requiresAdult && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={adultConfirmed} onChange={e => setAdult(e.target.checked)} className="mt-0.5 accent-tea-green w-4 h-4 shrink-0" />
                <span className="text-sm text-tea-text-muted">{t("adultConfirmBasic")}</span>
              </label>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm mb-4 bg-red-50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          <button onClick={handleJoinWaitlist} disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-full font-medium transition-colors disabled:opacity-50">
            {loading ? t("processing") : t("waitlist.joinBtn")}
          </button>
        </div>
      )}

      {/* 候補成功 */}
      {isFull && waitlistDone && (
        <div className="bg-white rounded-2xl p-8 border border-tea-green-pale/50 shadow-sm text-center">
          <div className="text-4xl mb-4">🎋</div>
          <h3 className="font-serif text-xl font-bold text-tea-text mb-2">{t("waitlist.successTitle")}</h3>
          <p className="text-sm text-tea-text-muted mb-6">{t("waitlist.successDesc")}</p>
          <button onClick={() => router.push(lp("/account?tab=bookings"))} className="text-sm text-tea-green-ink hover:underline">{t("waitlist.viewWaitlist")}</button>
        </div>
      )}

      {/* Step 1：選人數 */}
      {!isFull && step === 1 && (
        <div className="bg-white rounded-2xl p-6 border border-tea-green-pale/50 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-tea-text mb-6">{t("selectParticipants")}</h3>

          {/* 人數選擇器 */}
          <div className="flex items-center gap-6 mb-6">
            <button
              onClick={() => setCount(c => Math.max(1, c - 1))}
              className="w-10 h-10 rounded-full border-2 border-tea-green text-tea-green-ink font-bold text-xl hover:bg-tea-green-ink hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={count <= 1}
            >
              −
            </button>
            <span className="text-3xl font-bold text-tea-text w-8 text-center">{count}</span>
            <button
              onClick={() => setCount(c => Math.min(available, c + 1))}
              className="w-10 h-10 rounded-full border-2 border-tea-green text-tea-green-ink font-bold text-xl hover:bg-tea-green-ink hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={count >= available}
            >
              +
            </button>
            <span className="text-sm text-tea-text-muted">{t("participantCount")}</span>
          </div>

          {/* 費用試算 */}
          <div className="bg-tea-green-mist rounded-xl p-4 mb-6 space-y-1.5">
            <div className="flex justify-between text-sm text-tea-text-muted">
              <span>{t("pricePerPerson", { price: exp.price.toLocaleString(), count })}</span>
              <span>NT$ {totalPrice.toLocaleString()}</span>
            </div>
            {pointsDiscount > 0 && (
              <div className="flex justify-between text-sm text-tea-green-ink">
                <span>{t("pointsDiscount", { points: validPoints })}</span>
                <span>－NT$ {pointsDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-tea-text text-lg border-t border-tea-green-pale/50 pt-1.5">
              <span>{t("finalAmount")}</span>
              <span>NT$ {finalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* 點數折抵（新制 1:1）*/}
          {pointsBalance >= 10 && maxPointsAllow >= 10 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-tea-text mb-1.5">
                {t("usePointsLabel")}
                <span className="ml-2 text-xs font-normal text-tea-text-muted">{t("availablePoints", { balance: pointsBalance.toLocaleString(), max: maxPointsAllow.toLocaleString() })}</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={maxPointsAllow}
                  step={1}
                  value={pointsInput}
                  onChange={e => setPointsInput(e.target.value)}
                  placeholder={`10 ~ ${maxPointsAllow}`}
                  className="flex-1 border border-tea-green-pale rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/30 focus:border-tea-green"
                />
                <button
                  type="button"
                  onClick={() => setPointsInput(String(maxPointsAllow))}
                  className="text-xs text-tea-green-ink hover:underline whitespace-nowrap"
                >{t("pointsUseMax")}</button>
              </div>
              {pointsInput && !validPoints && parsedPoints > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  {parsedPoints < 10 ? t("pointsErrors.min10") :
                   parsedPoints > pointsBalance ? t("pointsErrors.exceeds") :
                   t("pointsErrors.maxDiscount", { max: maxPointsAllow })}
                </p>
              )}
              {validPoints > 0 && (
                <p className="text-xs text-tea-green-ink mt-1">{t("pointsWillSave", { amount: validPoints.toLocaleString() })}</p>
              )}
            </div>
          )}

          {/* 18+ 確認（茶果酒） */}
          {exp.requiresAdult && (
            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={adultConfirmed}
                onChange={e => setAdult(e.target.checked)}
                className="mt-0.5 accent-tea-green w-4 h-4 shrink-0"
              />
              <span className="text-sm text-tea-text-muted">{t("adultConfirm")}</span>
            </label>
          )}

          {/* 退款政策摘要 */}
          <div className="border-t border-tea-green-pale pt-5 mb-6">
            <h4 className="text-sm font-medium text-tea-text mb-3">{t("refundPolicy.title")}</h4>
            <div className="space-y-1.5">
              {REFUND_POLICY.map(p => (
                <div key={p.key} className="flex justify-between text-xs text-tea-text-muted">
                  <span>{t(`refundPolicy.items.${p.key}.label`)}</span>
                  <span className={`font-medium ${p.color}`}>{t(`refundPolicy.items.${p.key}.value`)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-tea-text-muted/70 mt-2">
              {t("refundPolicy.changeNote")}
            </p>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={exp.requiresAdult && !adultConfirmed}
            className="w-full bg-tea-green-ink hover:bg-tea-green-deep text-white py-3.5 rounded-full font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("nextStep")}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2：訂購人資料 */}
      {!isFull && step === 2 && (
        <div className="bg-white rounded-2xl p-6 border border-tea-green-pale/50 shadow-sm">
          <button
            onClick={() => setStep(1)}
            className="text-sm text-tea-text-muted hover:text-tea-green-ink mb-5 flex items-center gap-1"
          >
            {t("back")}
          </button>
          <h3 className="font-serif text-lg font-bold text-tea-text mb-6">{t("bookerInfo")}</h3>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">
                {t("bookerName")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t("bookerNamePlaceholder")}
                className="w-full border border-tea-green-pale rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/30 focus:border-tea-green"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">
                {t("bookerPhone")} <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder={t("bookerPhonePlaceholder")}
                className="w-full border border-tea-green-pale rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/30 focus:border-tea-green"
              />
            </div>

            {userEmail && (
              <div>
                <label className="block text-sm font-medium text-tea-text mb-1.5">Email</label>
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="w-full border border-tea-green-pale rounded-xl px-4 py-2.5 text-sm bg-tea-green-mist text-tea-text-muted"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">
                {t("dietaryNeeds")}
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-2">
                {DIET_OPTIONS.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-1.5 text-sm text-tea-text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-tea-green"
                      checked={diet.includes(value)}
                      onChange={e => {
                        if (e.target.checked) setDiet(d => d ? `${d}、${value}` : value);
                        else setDiet(d => d.replace(`、${value}`, "").replace(value, "").replace(/^、|、$/, ""));
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <input
                type="text"
                value={diet}
                onChange={e => setDiet(e.target.value)}
                placeholder={t("dietaryPlaceholder")}
                className="w-full border border-tea-green-pale rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/30 focus:border-tea-green"
              />
            </div>
          </div>

          {/* 同意退款政策 */}
          <label className="flex items-start gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 accent-tea-green w-4 h-4 shrink-0"
            />
            <span className="text-sm text-tea-text-muted">
              {t("agreePolicy")}
            </span>
          </label>

          {/* 費用確認 */}
          <div className="bg-tea-green-mist rounded-xl p-4 mb-5 space-y-1">
            <div className="flex justify-between text-sm text-tea-text-muted">
              <span>{t("pricePerPerson", { price: exp.price.toLocaleString(), count })}</span>
              <span>NT$ {totalPrice.toLocaleString()}</span>
            </div>
            {pointsDiscount > 0 && (
              <div className="flex justify-between text-sm text-tea-green-ink">
                <span>{t("pointsDiscount", { points: validPoints })}</span>
                <span>－NT$ {pointsDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-tea-text text-base border-t border-tea-green-pale/50 pt-1">
              <span>{t("finalAmount")}</span>
              <span>NT$ {finalPrice.toLocaleString()}</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm mb-4 bg-red-50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-tea-green-ink hover:bg-tea-green-deep text-white py-3.5 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("processing") : t("payBtn", { amount: finalPrice.toLocaleString() })}
          </button>

          <p className="text-center text-xs text-tea-text-muted mt-3">
            {t("participantNote")}
          </p>
        </div>
      )}
    </div>
  );
}
