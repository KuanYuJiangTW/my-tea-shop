"use client";

import { useState } from "react";
import Link from "next/link";

type Booking = {
  id: string;
  booker_name: string;
  booker_phone: string;
  booker_email: string;
  participant_count: number;
  total_price: number;
  status: string;
  dietary_notes: string | null;
  participants_due_at: string | null;
  refund_amount: number | null;
  refund_status: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  session: { session_date: string; start_time: string; experience_types: { name: string } } | null;
  participants: { id: string }[];
};

type Props = {
  bookings: Booking[];
  sessionId?: string;
  status: string;
};

const statusLabel: Record<string, string> = {
  pending_payment: "待付款",
  confirmed:       "已確認",
  completed:       "已完成",
  cancelled:       "已取消",
};
const statusStyle: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-700",
  confirmed:       "bg-emerald-100 text-emerald-700",
  completed:       "bg-blue-100 text-blue-700",
  cancelled:       "bg-red-100 text-red-500",
};
const refundStatusLabel: Record<string, string> = {
  none:      "不退款",
  pending:   "待退款",
  processed: "已退款",
};
const refundStatusStyle: Record<string, string> = {
  none:      "bg-gray-100 text-gray-500",
  pending:   "bg-orange-100 text-orange-700",
  processed: "bg-emerald-100 text-emerald-700",
};

export default function AdminBookingsClient({ bookings: initial, sessionId, status }: Props) {
  const [bookings, setBookings] = useState<Booking[]>(initial);
  const [processing, setProcessing] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // cancel state
  const [cancelId, setCancelId]       = useState<string | null>(null);
  const [cancelling, setCancelling]   = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelResult, setCancelResult] = useState<{ refundAmount: number } | null>(null);

  async function handleMarkComplete(id: string) {
    setProcessing(id);
    const res = await fetch(`/api/admin/experience-bookings/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: "completed" }),
    });
    setProcessing(null);
    if (res.ok) {
      setBookings(prev =>
        prev.map(b => b.id === id ? { ...b, status: "completed" } : b)
      );
    }
  }

  async function handleAdminCancel() {
    if (!cancelId) return;
    setCancelling(true);
    setCancelError("");

    const res  = await fetch(`/api/admin/experience-bookings/${cancelId}/cancel`, { method: "POST" });
    const json = await res.json();
    setCancelling(false);

    if (!res.ok) {
      setCancelError(json.error ?? "取消失敗");
      return;
    }

    setCancelResult(json);
    setBookings(prev =>
      prev.map(b => b.id === cancelId
        ? { ...b, status: "cancelled", refund_amount: json.refundAmount, refund_status: json.refundAmount > 0 ? "pending" : "none", cancellation_reason: "管理者代為取消" }
        : b
      )
    );
  }

  const filteredBookings = search.trim()
    ? bookings.filter(b => {
        const q = search.toLowerCase();
        return b.booker_name.toLowerCase().includes(q) || b.booker_phone.includes(q);
      })
    : bookings;

  function handleExportCsv() {
    const headers = ["場次日期", "時間", "體驗名稱", "訂購人", "電話", "Email", "人數", "金額", "狀態", "退款狀態", "特殊需求"];
    const rows = bookings.map(b => [
      b.session?.session_date ?? "",
      b.session?.start_time?.slice(0, 5) ?? "",
      (b.session?.experience_types as { name: string } | null)?.name ?? "",
      b.booker_name,
      b.booker_phone,
      b.booker_email,
      b.participant_count,
      b.total_price,
      statusLabel[b.status] ?? b.status,
      refundStatusLabel[b.refund_status ?? "none"],
      b.dietary_notes ?? "",
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function markRefundProcessed(id: string) {
    setProcessing(id);
    const res = await fetch(`/api/admin/experience-bookings/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ refund_status: "processed" }),
    });
    setProcessing(null);
    if (res.ok) {
      setBookings(prev =>
        prev.map(b => b.id === id ? { ...b, refund_status: "processed" } : b)
      );
    }
  }

  return (
    <div className="p-6 md:p-8 min-h-screen bg-[#F9F6F1]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#3D4A42] font-serif">預約名單</h1>
          <p className="text-sm text-[#6B8872] mt-0.5">
            {sessionId ? "篩選特定場次" : "所有預約紀錄"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="text-sm text-[#6B8872] hover:text-[#3D4A42] border border-[#C8DDD0] hover:border-[#6B8872] px-3 py-1.5 rounded-lg transition-colors"
          >
            匯出 CSV
          </button>
          <Link
            href="/admin/experiences"
            className="text-sm text-[#6B8872] hover:text-[#3D4A42] transition-colors"
          >
            ← 回月曆
          </Link>
        </div>
      </div>

      {/* 搜尋 + 狀態篩選 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="搜尋姓名或電話…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 rounded-full border border-[#C8DDD0] text-sm text-[#3D4A42] placeholder-[#A8C0AE] bg-white focus:outline-none focus:ring-2 focus:ring-[#7D9B84] w-full sm:w-56"
        />
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { value: "confirmed",       label: "已確認" },
          { value: "pending_payment", label: "待付款" },
          { value: "completed",       label: "已完成" },
          { value: "cancelled",       label: "已取消" },
          { value: "all",             label: "全部" },
        ].map(opt => (
          <Link
            key={opt.value}
            href={`?status=${opt.value}${sessionId ? `&session=${sessionId}` : ""}`}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              status === opt.value
                ? "bg-[#7D9B84] text-white"
                : "bg-white border border-[#C8DDD0] text-[#6B8872] hover:bg-[#EBF3EE]"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {/* 名單表格 */}
      <div className="bg-white rounded-2xl border border-[#EDE8DC] shadow-sm overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#6B8872]">
            {search.trim() ? "無符合的搜尋結果" : "尚無預約紀錄"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-[#F9F6F1] text-left">
                  <th className="px-6 py-3 text-xs font-medium text-[#6B8872]">場次</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#6B8872]">訂購人</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#6B8872]">電話</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#6B8872]">人數</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#6B8872]">金額</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#6B8872]">參加者資料</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#6B8872]">狀態</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#6B8872]">退款</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#6B8872]">特殊需求</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#6B8872]">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F0E8]">
                {filteredBookings.map((b) => {
                  const filledCount = b.participants?.length ?? 0;
                  const needFill    = b.participant_count - filledCount;
                  const dueAt       = b.participants_due_at ? new Date(b.participants_due_at) : null;
                  const isOverdue   = dueAt && dueAt < new Date() && needFill > 0;
                  const isCancelled  = b.status === "cancelled";
                  const isConfirmed  = b.status === "confirmed";
                  const refundSt     = b.refund_status ?? "none";
                  const needsRefund  = isCancelled && refundSt === "pending";
                  const sessionDateTime = b.session
                    ? new Date(`${b.session.session_date}T${b.session.start_time}`)
                    : null;
                  const isPastSession   = sessionDateTime && sessionDateTime < new Date();
                  const isAwaitingComplete = isConfirmed && isPastSession;

                  return (
                    <tr key={b.id} className={`hover:bg-[#F9F6F1] transition-colors ${needsRefund ? "bg-orange-50" : isAwaitingComplete ? "bg-amber-50" : ""}`}>
                      <td className="px-6 py-3.5">
                        <div className="font-medium text-[#3D4A42]">
                          {(b.session?.experience_types as { name: string } | null)?.name ?? "—"}
                        </div>
                        <div className="text-xs text-[#6B8872]">
                          {b.session?.session_date} {b.session?.start_time?.slice(0, 5)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-[#3D4A42]">{b.booker_name}</div>
                        <div className="text-xs text-[#6B8872]">{b.booker_email}</div>
                      </td>
                      <td className="px-4 py-3.5 text-[#6B8872]">{b.booker_phone}</td>
                      <td className="px-4 py-3.5 text-[#3D4A42] font-medium">{b.participant_count} 人</td>
                      <td className="px-4 py-3.5 text-[#3D4A42]">NT$ {b.total_price.toLocaleString()}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs ${
                          isOverdue ? "text-red-500 font-medium"
                            : needFill > 0 ? "text-amber-600"
                            : "text-emerald-600"
                        }`}>
                          {filledCount}/{b.participant_count} 份
                          {isOverdue && " (已逾期)"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[b.status] ?? ""}`}>
                          {statusLabel[b.status] ?? b.status}
                        </span>
                        {isCancelled && b.cancellation_reason && (
                          <div className="text-xs text-[#6B8872] mt-1 max-w-[120px] truncate" title={b.cancellation_reason}>
                            {b.cancellation_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {isCancelled ? (
                          <div className="space-y-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${refundStatusStyle[refundSt]}`}>
                              {refundStatusLabel[refundSt]}
                            </span>
                            {b.refund_amount != null && b.refund_amount > 0 && (
                              <div className="text-xs text-[#6B8872]">
                                NT$ {b.refund_amount.toLocaleString()}
                              </div>
                            )}
                            {refundSt === "pending" && (
                              <button
                                onClick={() => markRefundProcessed(b.id)}
                                disabled={processing === b.id}
                                className="block text-xs text-white bg-[#7D9B84] hover:bg-[#5C7A67] disabled:opacity-50 px-2.5 py-1 rounded-full transition-colors"
                              >
                                {processing === b.id ? "處理中…" : "標記已退款"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#6B8872]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#6B8872] max-w-[120px] truncate">
                        {b.dietary_notes || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1.5">
                          {isAwaitingComplete && (
                            <button
                              onClick={() => handleMarkComplete(b.id)}
                              disabled={processing === b.id}
                              className="text-xs text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap"
                            >
                              {processing === b.id ? "處理中…" : "標記完成"}
                            </button>
                          )}
                          {(isConfirmed || b.status === "pending_payment") && (
                            <button
                              onClick={() => { setCancelId(b.id); setCancelError(""); setCancelResult(null); }}
                              className="text-xs text-rose-500 hover:text-rose-700 border border-rose-200 hover:border-rose-400 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap"
                            >
                              代為取消
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* 取消確認 Modal */}
      {cancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { if (!cancelling) { setCancelId(null); setCancelResult(null); } }} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            {cancelResult ? (
              <>
                <h3 className="font-semibold text-[#3D4A42] text-lg mb-2">預約已取消</h3>
                <p className="text-sm text-[#6B8872] mb-1">
                  退款金額：
                  {cancelResult.refundAmount > 0
                    ? <strong className="text-[#3D4A42]"> NT$ {cancelResult.refundAmount.toLocaleString()}</strong>
                    : <span> 不退款</span>
                  }
                </p>
                {cancelResult.refundAmount > 0 && (
                  <p className="text-xs text-[#6B8872] mb-4">退款狀態已設為「待退款」，請完成退款後標記已退款。</p>
                )}
                <button
                  onClick={() => { setCancelId(null); setCancelResult(null); }}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#7D9B84] hover:bg-[#5C7A67] text-white text-sm font-medium transition"
                >
                  確認
                </button>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-[#3D4A42] text-lg mb-2">代為取消預約？</h3>
                <p className="text-sm text-[#6B8872] mb-4">
                  此操作將取消預約並依退款政策計算退款金額，取消後無法復原。
                </p>
                {cancelError && (
                  <p className="mb-3 text-sm text-rose-500 bg-rose-50 rounded-lg px-3 py-2">{cancelError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setCancelId(null)}
                    disabled={cancelling}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#C8DDD0] text-sm font-medium text-[#3D4A42] hover:bg-[#F9F6F1] transition disabled:opacity-50"
                  >
                    返回
                  </button>
                  <button
                    onClick={handleAdminCancel}
                    disabled={cancelling}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition disabled:opacity-60"
                  >
                    {cancelling ? "取消中…" : "確認取消"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
