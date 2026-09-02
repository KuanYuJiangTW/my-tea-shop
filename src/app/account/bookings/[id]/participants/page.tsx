"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "next-intl";

type Participant = {
  id: string;
  name: string;
  id_number: string;
  date_of_birth: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  is_primary: boolean;
};

type ParticipantInfo = {
  participants: Participant[];
  total: number;
  filled: number;
  remaining: number;
  dueAt: string | null;
};

/**
 * 只取資料、不碰 state，讓呼叫端決定何時寫入。
 *
 * 原本的 `load()` 開頭同步 `setLoading(true)`，而 effect 直接呼叫它——屬 effect body
 * 內同步 setState（`react-hooks/set-state-in-effect`）。拆開後 effect 的 setState
 * 只發生在 `.then()` callback 內。
 *
 * 刻意**不加** `.catch()`：原本 `load()` 在 fetch 被 reject 時也不會把 loading 收掉，
 * 為求高風險區的最小差異，此處保留同樣行為，缺口另行回報（見 tasks A.5）。
 */
async function fetchParticipantInfo(
  bookingId: string,
): Promise<{ ok: true; info: ParticipantInfo } | { ok: false; error: string }> {
  const res = await fetch(`/api/bookings/${bookingId}/participants`);
  if (!res.ok) {
    const j = await res.json();
    return { ok: false, error: j.error ?? "載入失敗" };
  }
  return { ok: true, info: await res.json() };
}

const emptyForm = {
  name:                   "",
  idNumber:               "",
  dateOfBirth:            "",
  emergencyContactName:   "",
  emergencyContactPhone:  "",
};

type FormErrors = Partial<typeof emptyForm>;

const idRegex  = /^[A-Z][12]\d{8}$/;
const phoneReg = /^09\d{8}$/;

export default function ParticipantsPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const locale  = useLocale();
  const lp = (path: string) => locale === "en" ? `/en${path}` : path;

  const [info, setInfo]       = useState<ParticipantInfo | null>(null);
  // 記「目前顯示的資料屬於哪個預約」，loading 就能在 render 推導——`id` 變動時
  // loadedId 還是舊值，自然是 loading，不必在 effect 內同步 setLoading(true)。
  // （checker 指出：原本只靠 initial state，若 id 變動而元件未重掛載，載入指示不會重新亮起）
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const loading = loadedId !== id;
  const [error, setError]     = useState("");

  const [form, setForm]             = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  /**
   * 寫入取回的結果。沿用原本語意：失敗時只設 error（不清空 info），
   * 成功時只設 info（不清空 error）。
   */
  function commitInfo(
    bookingId: string,
    result: { ok: true; info: ParticipantInfo } | { ok: false; error: string },
  ) {
    if (result.ok) setInfo(result.info);
    else setError(result.error);
    setLoadedId(bookingId);
  }

  /** 供送出參加者資料後重新載入用 */
  async function reload() {
    setLoadedId(null);
    commitInfo(id, await fetchParticipantInfo(id));
  }

  useEffect(() => {
    let cancelled = false;
    const bookingId = id;
    fetchParticipantInfo(bookingId).then((result) => {
      if (!cancelled) commitInfo(bookingId, result);
    });
    return () => { cancelled = true; };
  }, [id]);

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      e.name = "請填入真實姓名（至少 2 個字）";
    if (!idRegex.test(form.idNumber.trim().toUpperCase()))
      e.idNumber = "請填入有效的身分證號碼（例：A123456789）";
    if (!form.dateOfBirth)
      e.dateOfBirth = "請填入出生日期";
    if (!form.emergencyContactName.trim())
      e.emergencyContactName = "請填入緊急聯絡人姓名";
    if (!phoneReg.test(form.emergencyContactPhone.replace(/-/g, "")))
      e.emergencyContactPhone = "請填入有效手機號碼（例：0912345678）";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError("");

    const res = await fetch(`/api/bookings/${id}/participants`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        idNumber: form.idNumber.trim().toUpperCase(),
        isPrimary: info?.filled === 0,
      }),
    });

    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(json.error ?? "送出失敗，請稍後再試");
      return;
    }

    setForm(emptyForm);
    setFormErrors({});
    await reload();
  }

  const inputCls = (err?: string) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-tea-text placeholder-tea-text-light/50 focus:outline-none focus:ring-2 bg-tea-cream-light/50 transition ${
      err ? "border-rose-300 focus:ring-rose-300" : "border-tea-green-pale focus:ring-tea-green focus:border-tea-green"
    }`;

  if (loading) {
    return (
      <div className="min-h-screen bg-tea-cream-light flex items-center justify-center">
        <p className="text-tea-text-muted text-sm">載入中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-tea-cream-light flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-rose-500 text-sm">{error}</p>
        <Link href={lp("/account?tab=bookings")} className="text-tea-green-ink hover:underline text-sm">返回我的預約</Link>
      </div>
    );
  }

  const isDeadlinePassed = info?.dueAt ? new Date() > new Date(info.dueAt) : false;
  const isComplete       = info ? info.remaining === 0 : false;

  return (
    <div className="min-h-screen bg-tea-cream-light">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">

        {/* Back */}
        <Link
          href={lp("/account?tab=bookings")}
          className="inline-flex items-center gap-1.5 text-sm text-tea-text-muted hover:text-tea-green-ink mb-6 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          我的預約
        </Link>

        <h1 className="font-serif text-2xl font-normal text-tea-text mb-1 tracking-display">補填參加者資料</h1>
        <p className="text-sm text-tea-text-muted mb-6">活動當天須核對身分，請確認資料正確無誤。</p>

        {/* Progress */}
        <div className="bg-white rounded-2xl border border-tea-green-pale p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-tea-text">填寫進度</span>
            <span className={`text-sm font-semibold ${isComplete ? "text-tea-green-ink" : "text-amber-600"}`}>
              {info?.filled} / {info?.total} 人
            </span>
          </div>
          <div className="w-full bg-tea-green-pale/40 rounded-full h-2">
            <div
              className="bg-tea-green h-2 rounded-full transition-all"
              style={{ width: `${((info?.filled ?? 0) / (info?.total ?? 1)) * 100}%` }}
            />
          </div>
          {info?.dueAt && (
            <p className={`mt-2 text-xs ${isDeadlinePassed ? "text-rose-500" : "text-tea-text-muted"}`}>
              補填截止：{new Date(info.dueAt).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })}
              {isDeadlinePassed && "（已截止）"}
            </p>
          )}
        </div>

        {/* Already filled */}
        {info && info.participants.length > 0 && (
          <div className="bg-white rounded-2xl border border-tea-green-pale p-5 mb-6">
            <h2 className="text-sm font-semibold text-tea-text mb-3 tracking-display">已填寫的參加者</h2>
            <div className="space-y-3">
              {info.participants.map((p, i) => (
                <div key={p.id} className="flex items-start gap-3 p-3 bg-tea-cream-light/60 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-tea-green-dark flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">{i + 1}</span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-tea-text">
                      {p.name}
                      {p.is_primary && <span className="ml-1.5 text-[10px] bg-tea-green-mist text-tea-green-ink px-1.5 py-0.5 rounded-full">訂購人</span>}
                    </p>
                    <p className="text-tea-text-muted text-xs mt-0.5">
                      身分證：{p.id_number} · 生日：{p.date_of_birth} · 緊急聯絡：{p.emergency_contact_name} {p.emergency_contact_phone}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        {isComplete ? (
          <div className="bg-[#EBF3EE] rounded-2xl border border-tea-green/30 p-6 text-center">
            <svg viewBox="0 0 24 24" className="w-10 h-10 fill-tea-green mx-auto mb-3">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <p className="font-semibold text-tea-text mb-1">所有參加者資料已填寫完畢！</p>
            <p className="text-sm text-tea-text-muted">活動當天請攜帶本人身分證備查。</p>
          </div>
        ) : isDeadlinePassed ? (
          <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6 text-center">
            <p className="font-semibold text-rose-600 mb-1">補填截止日已過</p>
            <p className="text-sm text-rose-400">如有問題請來電 0972-619-391 洽詢。</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-tea-green-pale p-6">
            <h2 className="text-sm font-semibold text-tea-text mb-4 tracking-display">
              填入第 {(info?.filled ?? 0) + 1} 位參加者資料
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-tea-text mb-1.5">
                  姓名 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setFormErrors(p => ({ ...p, name: undefined })); }}
                  placeholder="請輸入真實姓名"
                  className={inputCls(formErrors.name)}
                />
                {formErrors.name && <p className="mt-1 text-xs text-rose-500">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-tea-text mb-1.5">
                  身分證號碼 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.idNumber}
                  onChange={e => { setForm(p => ({ ...p, idNumber: e.target.value })); setFormErrors(p => ({ ...p, idNumber: undefined })); }}
                  placeholder="A123456789"
                  maxLength={10}
                  className={inputCls(formErrors.idNumber)}
                />
                {formErrors.idNumber && <p className="mt-1 text-xs text-rose-500">{formErrors.idNumber}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-tea-text mb-1.5">
                  出生日期 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={e => { setForm(p => ({ ...p, dateOfBirth: e.target.value })); setFormErrors(p => ({ ...p, dateOfBirth: undefined })); }}
                  max={new Date().toISOString().slice(0, 10)}
                  className={inputCls(formErrors.dateOfBirth)}
                />
                {formErrors.dateOfBirth && <p className="mt-1 text-xs text-rose-500">{formErrors.dateOfBirth}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-tea-text mb-1.5">
                    緊急聯絡人姓名 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.emergencyContactName}
                    onChange={e => { setForm(p => ({ ...p, emergencyContactName: e.target.value })); setFormErrors(p => ({ ...p, emergencyContactName: undefined })); }}
                    placeholder="聯絡人姓名"
                    className={inputCls(formErrors.emergencyContactName)}
                  />
                  {formErrors.emergencyContactName && <p className="mt-1 text-xs text-rose-500">{formErrors.emergencyContactName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-tea-text mb-1.5">
                    緊急聯絡人手機 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.emergencyContactPhone}
                    onChange={e => { setForm(p => ({ ...p, emergencyContactPhone: e.target.value })); setFormErrors(p => ({ ...p, emergencyContactPhone: undefined })); }}
                    placeholder="0912345678"
                    className={inputCls(formErrors.emergencyContactPhone)}
                  />
                  {formErrors.emergencyContactPhone && <p className="mt-1 text-xs text-rose-500">{formErrors.emergencyContactPhone}</p>}
                </div>
              </div>

              {submitError && (
                <p className="text-sm text-rose-500 bg-rose-50 rounded-xl px-4 py-3">{submitError}</p>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-2.5 bg-tea-green-dark hover:bg-tea-green-ink disabled:opacity-60 text-white rounded-full text-sm font-medium transition-colors"
                >
                  {submitting ? "送出中…" : `儲存第 ${(info?.filled ?? 0) + 1} 位參加者`}
                </button>
                <span className="text-xs text-tea-text-muted">還需填寫 {info?.remaining} 位</span>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
