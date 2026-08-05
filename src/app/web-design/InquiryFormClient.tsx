"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";

type Status = "idle" | "submitting" | "success" | "error";

interface FormState {
  referralSource: string;
  industryBrand: string;
  painPoints: string[];
  budgetRange: string;
  timeline: string;
  contactName: string;
  contactLine: string;
  contactEmail: string;
  contactTime: string;
  website: string; // honeypot
}

const initialForm: FormState = {
  referralSource: "",
  industryBrand: "",
  painPoints: [],
  budgetRange: "",
  timeline: "",
  contactName: "",
  contactLine: "",
  contactEmail: "",
  contactTime: "",
  website: "",
};

const REFERRAL_OPTIONS = ["site", "referral", "search", "social", "other"] as const;
const PAIN_POINT_OPTIONS = ["noWebsite", "oldWebsite", "onlineOrders", "booking", "seo", "other"] as const;
const BUDGET_OPTIONS = ["under50k", "50to150k", "150to300k", "over300k", "undecided"] as const;
const TIMELINE_OPTIONS = ["within1m", "within3m", "evaluating"] as const;

export default function InquiryFormClient({ lineUrl }: { lineUrl?: string }) {
  const t = useTranslations("webDesign.form");
  const locale = useLocale();

  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputClass =
    "w-full border border-tea-green-pale bg-white rounded-xl px-4 py-3 text-tea-text placeholder-tea-text-light/50 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/40 focus:border-tea-green transition";

  function togglePainPoint(value: string) {
    setForm((prev) => ({
      ...prev,
      painPoints: prev.painPoints.includes(value)
        ? prev.painPoints.filter((p) => p !== value)
        : [...prev.painPoints, value],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!form.contactName.trim()) {
      setErrorMsg(t("errorName"));
      return;
    }
    if (!form.contactLine.trim() && !form.contactEmail.trim()) {
      setErrorMsg(t("errorContact"));
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/web-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale }),
      });
      if (!res.ok) throw new Error("send failed");
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg(t("errorGeneric"));
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-8 bg-white rounded-2xl shadow-sm border border-tea-green-pale/40">
        <div className="w-16 h-16 bg-tea-green-mist rounded-full flex items-center justify-center mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7D9B84" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="font-serif text-2xl font-bold text-tea-text mb-2">{t("successTitle")}</h3>
        {lineUrl && (
          <>
            <p className="text-tea-text-light text-sm mb-6">{t("successLine")}</p>
            <a
              href={lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3 rounded-full text-sm font-medium transition-colors mb-4"
            >
              {t("lineButton")}
            </a>
          </>
        )}
        <button
          onClick={() => { setStatus("idle"); setForm(initialForm); }}
          className="text-tea-text-light hover:text-tea-green text-sm underline mt-2"
        >
          {t("sendAgain")}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-sm border border-tea-green-pale/40 p-8 space-y-7"
    >
      {/* honeypot：一般訪客看不到；機器人常會自動填入 */}
      <div style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
        />
      </div>

      {/* Q1 認識管道 */}
      <div>
        <label className="block text-sm font-medium text-tea-text mb-2.5">{t("q1.label")}</label>
        <div className="flex flex-wrap gap-2">
          {REFERRAL_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, referralSource: opt }))}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                form.referralSource === opt
                  ? "bg-tea-green text-white border-tea-green"
                  : "bg-white text-tea-text border-tea-green-pale hover:border-tea-green"
              }`}
            >
              {t(`q1.options.${opt}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Q2 產業與品牌 */}
      <div>
        <label className="block text-sm font-medium text-tea-text mb-2.5">{t("q2.label")}</label>
        <input
          type="text"
          name="industryBrand"
          placeholder={t("q2.placeholder")}
          value={form.industryBrand}
          onChange={(e) => setForm((prev) => ({ ...prev, industryBrand: e.target.value }))}
          className={inputClass}
        />
      </div>

      {/* Q3 痛點（複選） */}
      <div>
        <label className="block text-sm font-medium text-tea-text mb-2.5">{t("q3.label")}</label>
        <div className="flex flex-wrap gap-2">
          {PAIN_POINT_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => togglePainPoint(opt)}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                form.painPoints.includes(opt)
                  ? "bg-tea-green text-white border-tea-green"
                  : "bg-white text-tea-text border-tea-green-pale hover:border-tea-green"
              }`}
            >
              {t(`q3.options.${opt}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Q4 預算 */}
      <div>
        <label className="block text-sm font-medium text-tea-text mb-2.5">{t("q4.label")}</label>
        <div className="flex flex-wrap gap-2">
          {BUDGET_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, budgetRange: opt }))}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                form.budgetRange === opt
                  ? "bg-tea-green text-white border-tea-green"
                  : "bg-white text-tea-text border-tea-green-pale hover:border-tea-green"
              }`}
            >
              {t(`q4.options.${opt}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Q5 上線時程 */}
      <div>
        <label className="block text-sm font-medium text-tea-text mb-2.5">{t("q5.label")}</label>
        <div className="flex flex-wrap gap-2">
          {TIMELINE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, timeline: opt }))}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                form.timeline === opt
                  ? "bg-tea-green text-white border-tea-green"
                  : "bg-white text-tea-text border-tea-green-pale hover:border-tea-green"
              }`}
            >
              {t(`q5.options.${opt}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Q6 聯絡方式 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-tea-text mb-2.5">
            {t("q6.nameLabel")} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="contactName"
            placeholder={t("q6.namePlaceholder")}
            value={form.contactName}
            onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-tea-text mb-2.5">{t("q6.timeLabel")}</label>
          <input
            type="text"
            name="contactTime"
            placeholder={t("q6.timePlaceholder")}
            value={form.contactTime}
            onChange={(e) => setForm((prev) => ({ ...prev, contactTime: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-tea-text mb-2.5">{t("q6.lineLabel")}</label>
          <input
            type="text"
            name="contactLine"
            placeholder={t("q6.linePlaceholder")}
            value={form.contactLine}
            onChange={(e) => setForm((prev) => ({ ...prev, contactLine: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-tea-text mb-2.5">{t("q6.emailLabel")}</label>
          <input
            type="email"
            name="contactEmail"
            placeholder={t("q6.emailPlaceholder")}
            value={form.contactEmail}
            onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
            className={inputClass}
          />
        </div>
      </div>

      {errorMsg && (
        <p className="text-red-500 text-sm text-center">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full bg-tea-green hover:bg-tea-green-dark disabled:opacity-60 text-white py-3.5 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
      >
        {status === "submitting" ? (
          <>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0110 10" />
            </svg>
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </button>
    </form>
  );
}
