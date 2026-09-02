"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertCircle, CalendarCheck } from "lucide-react";

interface RequestView {
  requestNo: string;
  status: string;
  preferredDate: string;
  preferredStartTime: string;
  headcount: number;
  isPrivate: boolean;
  contactName: string;
  tokenExpiresAt: string | null;
  sessionId: string | null;
  experience: { slug: string; name: string; nameEn?: string } | null;
  slots: number | null;
  total: number | null;
}

async function fetchRequest(token: string) {
  const res = await fetch(`/api/experience-requests/${token}`);
  return res.ok ? (res.json() as Promise<RequestView>) : null;
}

export default function RequestStatusClient({ token, locale }: { token: string; locale: string }) {
  const t = useTranslations("experiences.requestStatus");
  const [data, setData] = useState<RequestView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  /** 首次載入。不能在 effect body 同步 setState（react-hooks/set-state-in-effect） */
  useEffect(() => {
    let cancelled = false;
    fetchRequest(token).then(d => { if (!cancelled) { setData(d); setLoading(false); } });
    return () => { cancelled = true; };
  }, [token]);

  async function withdraw() {
    if (!window.confirm(t("withdrawConfirm"))) return;
    setBusy(true);
    const res = await fetch(`/api/experience-requests/${token}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setMsg(d.error ?? t("withdrawFailed"));
      return;
    }
    setMsg(t("withdrawDone"));
    setLoading(true);
    fetchRequest(token).then(d => { setData(d); setLoading(false); });
  }

  if (loading) return <p className="text-tea-text-muted">{t("loading")}</p>;

  if (!data) {
    return (
      <div className="flex items-start gap-3 bg-white rounded-2xl border border-tea-green-pale p-6">
        <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-body font-medium text-tea-text">{t("invalidTitle")}</p>
          <p className="text-caption text-tea-text-muted mt-1">{t("invalidNote")}</p>
        </div>
      </div>
    );
  }

  const isEn = locale === "en";
  const lp = (p: string) => (isEn ? `/en${p}` : p);
  const canWithdraw = data.status === "pending" || data.status === "alternative_offered";
  const canPay      = data.status === "approved" && data.sessionId;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-tea-green-pale p-6">
        <p className="text-caption text-tea-green-ink font-medium">{t("label")}</p>
        <h1 className="font-serif text-2xl font-normal text-tea-text mt-1">
          {t("statusTitle", { status: t(`status.${data.status}`) })}
        </h1>
        <p className="text-caption text-tea-text-muted mt-1">{data.requestNo}</p>

        <dl className="mt-5 space-y-2 text-body text-tea-text-muted">
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-tea-text">{t("experience")}</dt>
            <dd>{isEn ? (data.experience?.nameEn || data.experience?.name) : data.experience?.name}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-tea-text">{t("date")}</dt>
            <dd>{data.preferredDate} {String(data.preferredStartTime).slice(0, 5)}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-tea-text">{t("people")}</dt>
            <dd>{t("peopleValue", { headcount: data.headcount, slots: data.slots ?? data.headcount })}</dd>
          </div>
          {data.total !== null && (
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 text-tea-text">{t("amount")}</dt>
              <dd>NT$ {data.total.toLocaleString()}</dd>
            </div>
          )}
        </dl>

        {msg && <p className="text-caption text-tea-green-ink mt-4">{msg}</p>}

        {canPay && (
          <div className="mt-5 bg-tea-green-mist rounded-control p-4">
            <p className="text-body text-tea-text flex items-start gap-2">
              <CalendarCheck className="w-5 h-5 text-tea-green-ink mt-0.5 shrink-0" aria-hidden="true" />
              <span>{t("approvedNote", { expires: data.tokenExpiresAt?.slice(0, 16).replace("T", " ") ?? "" })}</span>
            </p>
            <Link
              href={lp(`/experiences/booking/${data.sessionId}`)}
              className="inline-block mt-3 text-label font-medium px-5 py-2.5 rounded-control bg-tea-green-dark text-white hover:bg-tea-green-dark transition-colors duration-base ease-standard"
            >{t("payCta")}</Link>
          </div>
        )}

        {canWithdraw && (
          <button
            onClick={withdraw}
            disabled={busy}
            className="mt-5 text-caption text-tea-text-muted underline hover:text-tea-text disabled:opacity-50"
          >{t("withdraw")}</button>
        )}
      </div>

      <p className="text-caption text-tea-text-muted">
        {t("help")}{" "}
        <Link href={lp("/contact")} className="text-tea-green-ink underline">{t("contact")}</Link>
      </p>
    </div>
  );
}
