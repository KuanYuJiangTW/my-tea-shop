"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus, CheckCircle } from "lucide-react";

/**
 * 客製開課請求的前台入口與表單。
 *
 * 文案直接寫成交條件（最低名額、金額、回覆時效），不是「有問題請洽詢」——
 * 把條件講在前面會過濾掉不可能成交的申請，也讓可能成交的人有信心。
 *
 * 顯示條件是 `accepts_requests = true`；關著時整個元件不渲染（由父層決定）。
 */
interface Props {
  experienceTypeId: number;
  locale: string;
  /** 開團最低名額與對應金額——成交條件要在送出前就看得到 */
  minSlots: number;
  minTotal: number;
  leadDays: number;
  startTimes: string[];
  /** 最早可申請日（YYYY-MM-DD），前置天數已算進去 */
  minDate: string;
  maxDate: string;
  /** 季節外時的下一段開放起始日 */
  nextWindowStart?: string | null;
  lineUrl?: string;
  /** 這個月沒有任何場次——入口升級為主要 CTA */
  emphasis?: boolean;
}

export default function OpenClassRequest({
  experienceTypeId, locale, minSlots, minTotal, leadDays,
  startTimes, minDate, maxDate, nextWindowStart, lineUrl, emphasis = false,
}: Props) {
  const t = useTranslations("experiences.openClass");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ no: string; token: string } | null>(null);
  const [f, setF] = useState({
    preferredDate: "", preferredStartTime: startTimes[0] ?? "14:00",
    altDate: "", headcount: String(minSlots), isPrivate: false,
    contactName: "", contactPhone: "", contactEmail: "", contactLine: "",
    contactTime: "", note: "", website: "",
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!f.contactName.trim() || !f.contactPhone.trim() || !f.contactEmail.trim()) {
      setError(t("required")); return;
    }
    setBusy(true);
    const res = await fetch("/api/experience-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        experienceTypeId,
        preferredDate: f.preferredDate,
        preferredStartTime: f.preferredStartTime,
        altDate: f.altDate || undefined,
        headcount: Number(f.headcount),
        isPrivate: f.isPrivate,
        contactName: f.contactName.trim(),
        contactPhone: f.contactPhone.trim(),
        contactEmail: f.contactEmail.trim(),
        contactLine: f.contactLine.trim() || undefined,
        contactTime: f.contactTime.trim() || undefined,
        note: f.note.trim() || undefined,
        locale,
        website: f.website,
      }),
    }).catch(() => null);
    setBusy(false);

    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => ({})) : {};
      setError(d.error ?? t("failed"));
      return;
    }
    const d = await res.json();
    setDone({ no: d.requestNo, token: d.token });
  }

  const lp = (p: string) => (locale === "en" ? `/en${p}` : p);
  const field = "w-full border border-tea-green-pale rounded-control px-3 py-2 text-body bg-white";

  if (done) {
    return (
      <div className="flex items-start gap-3 bg-tea-green-mist rounded-2xl border border-tea-green-pale p-5">
        <CheckCircle className="w-5 h-5 text-tea-green mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-body font-medium text-tea-text">{t("doneTitle", { no: done.no })}</p>
          <p className="text-caption text-tea-text-light mt-1">{t("doneNote")}</p>
          <a href={lp(`/experiences/request/${done.token}`)} className="text-caption text-tea-green font-medium mt-2 inline-block">
            {t("doneLink")} →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-5 border ${
      emphasis ? "bg-tea-green-mist border-tea-green" : "bg-tea-cream border-tea-green-pale"
    }`}>
      <div className="flex items-start gap-3">
        <CalendarPlus className="w-5 h-5 text-tea-green mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className={emphasis ? "text-body-lg font-medium text-tea-text" : "text-body font-medium text-tea-text"}>
            {emphasis ? t("emptyMonthTitle") : t("title")}
          </p>
          <p className="text-caption text-tea-text-light mt-1">{t("intro", { days: leadDays })}</p>
          {/* 成交條件用內文級距，不是附註——依設計原則 2「交易時刻，清晰壓倒氣氛」 */}
          <p className="text-body text-tea-text mt-2">
            {t("slotsNote", { slots: minSlots, total: minTotal.toLocaleString() })}
          </p>
          {nextWindowStart && (
            <p className="text-caption text-amber-700 mt-2">{t("seasonNote", { date: nextWindowStart })}</p>
          )}

          {!open && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-label font-medium px-5 py-2.5 rounded-control bg-tea-green text-white hover:bg-tea-green-dark transition-colors duration-base ease-standard"
              >{t("cta")}</button>
              {lineUrl && (
                <a href={lineUrl} target="_blank" rel="noopener noreferrer"
                  className="text-label font-medium px-5 py-2.5 rounded-control border border-tea-green text-tea-green hover:bg-white transition-colors duration-base ease-standard">
                  {t("askLine")}
                </a>
              )}
            </div>
          )}

          {open && (
            <form onSubmit={submit} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-caption text-tea-text-light">
                  {t("dateLabel")}
                  <input type="date" required min={minDate} max={maxDate}
                    value={f.preferredDate} onChange={set("preferredDate")} className={`${field} mt-1`} />
                </label>
                <label className="text-caption text-tea-text-light">
                  {t("timeLabel")}
                  <select value={f.preferredStartTime} onChange={set("preferredStartTime")} className={`${field} mt-1`}>
                    {startTimes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="text-caption text-tea-text-light">
                  {t("altDateLabel")}
                  <input type="date" min={minDate} max={maxDate}
                    value={f.altDate} onChange={set("altDate")} className={`${field} mt-1`} />
                </label>
                <label className="text-caption text-tea-text-light">
                  {t("headcountLabel")}
                  <input type="number" min={1} max={50} required inputMode="numeric"
                    value={f.headcount} onChange={set("headcount")} className={`${field} mt-1`} />
                </label>
              </div>

              <label className="flex items-center gap-2 text-caption text-tea-text-light">
                <input type="checkbox" checked={f.isPrivate} onChange={set("isPrivate")} />
                {t("privateLabel")}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-caption text-tea-text-light">
                  {t("nameLabel")}
                  <input type="text" required maxLength={100} value={f.contactName} onChange={set("contactName")} className={`${field} mt-1`} />
                </label>
                <label className="text-caption text-tea-text-light">
                  {t("phoneLabel")}
                  <input type="tel" required maxLength={50} value={f.contactPhone} onChange={set("contactPhone")} className={`${field} mt-1`} />
                </label>
                <label className="text-caption text-tea-text-light">
                  {t("emailLabel")}
                  <input type="email" required maxLength={200} value={f.contactEmail} onChange={set("contactEmail")} className={`${field} mt-1`} />
                </label>
                <label className="text-caption text-tea-text-light">
                  {t("lineLabel")}
                  <input type="text" maxLength={100} value={f.contactLine} onChange={set("contactLine")} className={`${field} mt-1`} />
                </label>
              </div>

              <label className="block text-caption text-tea-text-light">
                {t("contactTimeLabel")}
                <input type="text" maxLength={200} value={f.contactTime} onChange={set("contactTime")} className={`${field} mt-1`} />
              </label>

              <label className="block text-caption text-tea-text-light">
                {t("noteLabel")}
                <textarea rows={2} maxLength={500} value={f.note} onChange={set("note")} className={`${field} mt-1`} />
              </label>

              {/* honeypot */}
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
                value={f.website} onChange={set("website")}
                className="absolute left-[-9999px] w-px h-px opacity-0" />

              {error && <p className="text-caption text-red-600">{error}</p>}

              <button type="submit" disabled={busy}
                className="text-label font-medium px-5 py-2.5 rounded-control bg-tea-green text-white hover:bg-tea-green-dark disabled:opacity-50 transition-colors duration-base ease-standard">
                {busy ? t("sending") : t("submit")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
