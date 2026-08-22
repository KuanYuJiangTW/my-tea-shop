"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus, CheckCircle } from "lucide-react";

/**
 * 「找不到適合的日期？」的需求登記（客製開課請求 Phase 0）。
 *
 * 只收訊號，不做審核工作流——客人留下聯絡方式，業主之後自己聯絡。刻意做成
 * 摺疊的：預設只是一行邀請，不跟月曆搶注意力；按下去才展開表單。
 *
 * 這個位置本來是死路——客人翻完月曆沒有合適的日期，除了關掉分頁沒有第二個
 * 動作可做，而且流失得無聲無息（後台看不到有多少人想來但沒訂到）。
 */
interface Props {
  experienceTypeId: number;
  locale: string;
}

export default function InterestForm({ experienceTypeId, locale }: Props) {
  const t = useTranslations("experiences.interest");
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    preferredDate: "", headcount: "", contactEmail: "", contactLine: "", note: "",
    website: "",   // honeypot：真人看不到，機器人會填
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.contactEmail.trim() && !form.contactLine.trim()) {
      setError(t("needContact"));
      return;
    }

    setBusy(true);
    const res = await fetch("/api/experience-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        experienceTypeId,
        contactEmail:  form.contactEmail.trim() || undefined,
        contactLine:   form.contactLine.trim()  || undefined,
        preferredDate: form.preferredDate || undefined,
        headcount:     form.headcount ? Number(form.headcount) : undefined,
        note:          form.note.trim() || undefined,
        source:        "no-date",
        locale,
        website:       form.website,
      }),
    }).catch(() => null);
    setBusy(false);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => ({})) : {};
      setError(data.error ?? t("failed"));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex items-start gap-3 bg-tea-green-mist rounded-2xl border border-tea-green-pale p-5">
        <CheckCircle className="w-5 h-5 text-tea-green mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-body font-medium text-tea-text">{t("doneTitle")}</p>
          <p className="text-caption text-tea-text-light mt-1">{t("doneNote")}</p>
        </div>
      </div>
    );
  }

  const field = "w-full border border-tea-green-pale rounded-control px-3 py-2 text-body bg-white";

  return (
    <div className="bg-tea-cream rounded-2xl border border-tea-green-pale p-5">
      <div className="flex items-start gap-3">
        <CalendarPlus className="w-5 h-5 text-tea-green mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-tea-text">{t("title")}</p>
          <p className="text-caption text-tea-text-light mt-1">{t("intro")}</p>

          {!open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 text-label font-medium px-4 py-2 rounded-control border border-tea-green text-tea-green hover:bg-tea-green hover:text-white transition-colors duration-base ease-standard"
            >
              {t("cta")}
            </button>
          )}

          {open && (
            <form onSubmit={submit} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-caption text-tea-text-light">
                  {t("dateLabel")}
                  <input type="date" value={form.preferredDate} onChange={set("preferredDate")} className={`${field} mt-1`} />
                </label>
                <label className="text-caption text-tea-text-light">
                  {t("headcountLabel")}
                  <input type="number" min={1} max={50} inputMode="numeric" value={form.headcount} onChange={set("headcount")} className={`${field} mt-1`} />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-caption text-tea-text-light">
                  {t("emailLabel")}
                  <input type="email" value={form.contactEmail} onChange={set("contactEmail")} className={`${field} mt-1`} />
                </label>
                <label className="text-caption text-tea-text-light">
                  {t("lineLabel")}
                  <input type="text" maxLength={100} value={form.contactLine} onChange={set("contactLine")} className={`${field} mt-1`} />
                </label>
              </div>

              <label className="block text-caption text-tea-text-light">
                {t("noteLabel")}
                <textarea rows={2} maxLength={500} value={form.note} onChange={set("note")} className={`${field} mt-1`} />
              </label>

              {/* honeypot：真人看不到也 tab 不到 */}
              <input
                type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
                value={form.website} onChange={set("website")}
                className="absolute left-[-9999px] w-px h-px opacity-0"
              />

              {error && <p className="text-caption text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="text-label font-medium px-5 py-2.5 rounded-control bg-tea-green text-white hover:bg-tea-green-dark disabled:opacity-50 transition-colors duration-base ease-standard"
              >
                {busy ? t("sending") : t("submit")}
              </button>
              <p className="text-caption text-tea-text-light">{t("privacy")}</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
