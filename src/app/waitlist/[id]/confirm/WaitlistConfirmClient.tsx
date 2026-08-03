"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { AlertCircle } from "lucide-react";

type Entry = {
  id:               string;
  booker_name:      string;
  participant_count: number;
  status:           string;
  confirm_deadline: string;
  session: {
    session_date: string;
    start_time:   string;
    experience_types: { name: string; price: number } | null;
  } | null;
};

export default function WaitlistConfirmClient({ entry }: { entry: Entry }) {
  const router = useRouter();
  const locale = useLocale();
  const lp = (path: string) => locale === "en" ? `/en${path}` : path;
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const exp        = entry.session?.experience_types;
  const sessionDate = entry.session?.session_date ?? "";
  const startTime   = entry.session?.start_time   ?? "";
  const totalPrice  = (exp?.price ?? 0) * entry.participant_count;
  const deadline    = new Date(entry.confirm_deadline);
  const isExpired   = deadline < new Date() || entry.status !== "notified";
  const isConfirmed = entry.status === "confirmed";

  const dateLabel = sessionDate
    ? new Date(`${sessionDate}T00:00:00`).toLocaleDateString("zh-TW", {
        year: "numeric", month: "long", day: "numeric", weekday: "long",
      })
    : "—";

  async function handleConfirm() {
    setLoading(true);
    setError("");

    const res  = await fetch(`/api/waitlist/${entry.id}/confirm`, { method: "POST" });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "確認失敗，請稍後再試");
      return;
    }

    // 導向 ECPay 付款
    const payRes  = await fetch("/api/ecpay/experience-checkout", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ bookingId: json.bookingId }),
    });
    const payData = await payRes.json();

    if (!payRes.ok) {
      setError(payData.error ?? "無法建立付款，請稍後再試");
      return;
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = payData.ecpayUrl;
    Object.entries(payData.params as Record<string, string>).forEach(([k, v]) => {
      const input = document.createElement("input");
      input.type = "hidden"; input.name = k; input.value = v;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <div className="min-h-screen bg-tea-cream-light flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-sm border border-tea-green-pale">
        {isConfirmed ? (
          <>
            <div className="text-center mb-6">
              <div className="text-3xl mb-3">✅</div>
              <h2 className="font-serif text-xl font-bold text-tea-text mb-2">已完成確認</h2>
              <p className="text-sm text-tea-text-muted">您的候補資格已確認，請至會員中心查看預約狀態。</p>
            </div>
            <button
              onClick={() => router.push(lp("/account?tab=bookings"))}
              className="w-full bg-tea-green-ink hover:bg-tea-green-deep text-white py-3 rounded-full font-medium transition-colors"
            >
              查看我的預約
            </button>
          </>
        ) : isExpired ? (
          <>
            <div className="text-center mb-6">
              <div className="text-3xl mb-3">⏰</div>
              <h2 className="font-serif text-xl font-bold text-tea-text mb-2">確認時間已過</h2>
              <p className="text-sm text-tea-text-muted">此名額已釋出給下一位候補者。歡迎繼續關注後續場次。</p>
            </div>
            <button
              onClick={() => router.push(lp("/experiences"))}
              className="w-full bg-tea-green-ink hover:bg-tea-green-deep text-white py-3 rounded-full font-medium transition-colors"
            >
              瀏覽其他場次
            </button>
          </>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-xs text-tea-green-ink font-semibold tracking-widest uppercase mb-1">{exp?.name ?? "茶藝體驗"}</p>
              <h2 className="font-serif text-2xl font-bold text-tea-text mb-4">確認參加？</h2>
              <div className="space-y-2 text-sm text-tea-text-muted mb-4">
                <div className="flex justify-between"><span>日期</span><span className="text-tea-text font-medium">{dateLabel}</span></div>
                <div className="flex justify-between"><span>時間</span><span className="text-tea-text font-medium">{startTime.slice(0, 5)}</span></div>
                <div className="flex justify-between"><span>人數</span><span className="text-tea-text font-medium">{entry.participant_count} 人</span></div>
                <div className="flex justify-between font-bold"><span>費用</span><span className="text-tea-text">NT$ {totalPrice.toLocaleString()}</span></div>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>請於 {deadline.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })} 前完成付款，逾時名額將自動釋出。</span>
              </div>
            </div>

            {error && (
              <p className="mb-4 text-sm text-rose-500 bg-rose-50 rounded-xl px-3 py-2">{error}</p>
            )}

            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full bg-tea-green-ink hover:bg-tea-green-deep disabled:opacity-50 text-white py-3.5 rounded-full font-medium transition-colors"
            >
              {loading ? "處理中…" : `確認參加並付款 NT$ ${totalPrice.toLocaleString()}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
