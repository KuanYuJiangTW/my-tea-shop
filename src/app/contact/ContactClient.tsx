"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ContactForm as FormState, ContactStatus as Status } from "@/types";

export default function ContactClient() {
  const t = useTranslations("contactPage");

  const subjectOptions = [
    { value: "product",   label: t("subjects.product") },
    { value: "order",     label: t("subjects.order") },
    { value: "wholesale", label: t("subjects.wholesale") },
    { value: "visit",     label: t("subjects.visit") },
    { value: "other",     label: t("subjects.other") },
  ];

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [subjectOpen, setSubjectOpen] = useState(false);
  const subjectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (subjectRef.current && !subjectRef.current.contains(e.target as Node)) {
        setSubjectOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("send failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  // bg-tea-cream-light/50 與 login／register／checkout／account 的輸入框一致。
  // 原本是 bg-white，壓在同為白底的表單卡上只剩邊框，且是全站唯一的例外寫法
  const inputClass =
    "w-full border border-tea-green-pale bg-tea-cream-light/50 rounded-control px-4 py-3 text-tea-text placeholder-tea-text-light/50 text-label focus:outline-none focus:ring-2 focus:ring-tea-green/40 focus:border-tea-green transition duration-base ease-standard";

  const infoItems = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
      label: t("info.addressLabel"),
      value: t("info.addressValue"),
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.09 2.18 2 2 0 012.07 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" />
        </svg>
      ),
      label: t("info.phoneLabel"),
      value: t("info.phoneValue"),
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
      label: t("info.emailLabel"),
      value: t("info.emailValue"),
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      label: t("info.responseLabel"),
      value: t("info.responseValue"),
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-section">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

        {/* Left: Info */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="font-serif text-2xl font-bold text-tea-text mb-5">{t("info.title")}</h2>
            <div className="space-y-5">
              {infoItems.map((item) => (
                <div key={item.label} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-tea-green-mist rounded-control flex items-center justify-center text-tea-green">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-caption text-tea-text-light mb-0.5">{item.label}</p>
                    <p className="text-tea-text text-label font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-tea-green-pale" />

          <div className="bg-tea-green-mist rounded-card p-6">
            <p className="font-serif text-tea-text font-semibold mb-2">{t("info.bulkTitle")}</p>
            {/* 大量採購說明是敘事型內容，升 body；行高由 token 帶（1.8），不另寫 leading */}
            <p className="text-tea-text-light text-body">
              {t("info.bulkDesc")}
            </p>
          </div>
        </div>

        {/* Right: Form */}
        <div className="lg:col-span-3">
          {status === "success" ? (
            <div className="flex flex-col items-center justify-center text-center py-24 px-8 bg-white rounded-card shadow-resting border border-tea-green-pale/40">
              <div className="w-16 h-16 bg-tea-green-mist rounded-pill flex items-center justify-center mb-5">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="stroke-tea-green" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="font-serif text-2xl font-bold text-tea-text mb-2">{t("form.successTitle")}</h3>
              <p className="text-tea-text-light text-body mb-8">{t("form.successDesc")}</p>
              <button
                onClick={() => { setStatus("idle"); setForm({ name: "", email: "", subject: "", message: "" }); }}
                className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3 rounded-pill text-label font-medium transition-colors duration-base ease-standard"
              >
                {t("form.sendAgain")}
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-card shadow-resting border border-tea-green-pale/40 p-8 space-y-5"
            >
              <h2 className="font-serif text-2xl font-bold text-tea-text mb-1">{t("form.sendTitle")}</h2>
              <p className="text-tea-text-light text-body mb-4">{t("form.sendSubtitle")}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-label font-medium text-tea-text mb-1.5">
                    {t("form.name")} <span className="text-status-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder={t("form.namePlaceholder")}
                    value={form.name}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-label font-medium text-tea-text mb-1.5">
                    {t("form.email")} <span className="text-status-danger">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder={t("form.emailPlaceholder")}
                    value={form.email}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-label font-medium text-tea-text mb-1.5">
                  {t("form.subject")} <span className="text-status-danger">*</span>
                </label>
                <div ref={subjectRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setSubjectOpen(!subjectOpen)}
                    className={`${inputClass} flex items-center justify-between text-left ${!form.subject ? "text-tea-text-light/50" : "text-tea-text"}`}
                  >
                    <span>{subjectOptions.find(o => o.value === form.subject)?.label ?? t("form.subjectDefault")}</span>
                    <ChevronDown className={`w-4 h-4 flex-shrink-0 text-tea-text-light transition-transform duration-base ease-standard ${subjectOpen ? "rotate-180" : ""}`} />
                  </button>
                  {subjectOpen && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-tea-green-pale rounded-control shadow-float overflow-hidden">
                      {subjectOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setForm(prev => ({ ...prev, subject: opt.value as FormState["subject"] }));
                            setSubjectOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-label transition-colors duration-base ease-standard ${
                            form.subject === opt.value
                              ? "bg-tea-green-mist text-tea-green font-medium"
                              : "text-tea-text hover:bg-tea-green-mist hover:text-tea-green"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-label font-medium text-tea-text mb-1.5">
                  {t("form.message")} <span className="text-status-danger">*</span>
                </label>
                <textarea
                  name="message"
                  required
                  rows={6}
                  placeholder={t("form.messagePlaceholder")}
                  value={form.message}
                  onChange={handleChange}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {status === "error" && (
                <p className="text-status-danger text-label text-center">{t("form.error")}</p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full bg-tea-green hover:bg-tea-green-dark disabled:opacity-60 text-white py-3.5 rounded-control font-medium text-label transition-colors duration-base ease-standard flex items-center justify-center gap-2"
              >
                {status === "submitting" ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0110 10" />
                    </svg>
                    {t("form.submitting")}
                  </>
                ) : (
                  <>
                    {t("form.submit")}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </>
                )}
              </button>

              <p className="text-center text-caption text-tea-text-light">
                {t("form.privacyNote")}
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
