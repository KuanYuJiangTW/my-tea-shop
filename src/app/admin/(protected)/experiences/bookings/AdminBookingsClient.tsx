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
  cancelled:       "已取消",
};
const statusStyle: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-700",
  confirmed:       "bg-emerald-100 text-emerald-700",
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
        <Link
          href="/admin/experiences"
          className="text-sm text-[#6B8872] hover:text-[#3D4A42] transition-colors"
        >
          ← 回月曆
        </Link>
      </div>

      {/* 狀態篩選 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { value: "confirmed",       label: "已確認" },
          { value: "pending_payment", label: "待付款" },
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
        {bookings.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#6B8872]">尚無預約紀錄</div>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F0E8]">
                {bookings.map((b) => {
                  const filledCount = b.participants?.length ?? 0;
                  const needFill    = b.participant_count - filledCount;
                  const dueAt       = b.participants_due_at ? new Date(b.participants_due_at) : null;
                  const isOverdue   = dueAt && dueAt < new Date() && needFill > 0;
                  const isCancelled = b.status === "cancelled";
                  const refundSt    = b.refund_status ?? "none";
                  const needsRefund = isCancelled && refundSt === "pending";

                  return (
                    <tr key={b.id} className={`hover:bg-[#F9F6F1] transition-colors ${needsRefund ? "bg-orange-50" : ""}`}>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
