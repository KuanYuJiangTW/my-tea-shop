"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ShippingAddress = {
  type: "home" | "cvs";
  city?: string;
  address?: string;
  company?: string;
  storeName?: string;
};

type Item = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type Props = {
  orderId: string;
  currentStatus: string;
  customerEmail: string;
  customerName: string;
  shippingAddress: ShippingAddress;
  items: Item[];
  totalAmount: number;
};

const STATUS_TRANSITIONS: Record<string, { label: string; next: string; sendEmail?: boolean }[]> = {
  pending:   [
    { label: "標記已付款", next: "paid" },
    { label: "開始備貨", next: "preparing" },
    { label: "直接出貨", next: "shipped", sendEmail: true },
    { label: "取消訂單", next: "cancelled" },
  ],
  paid:      [
    { label: "開始備貨", next: "preparing" },
    { label: "標記出貨", next: "shipped", sendEmail: true },
    { label: "取消訂單", next: "cancelled" },
  ],
  preparing: [
    { label: "標記出貨", next: "shipped", sendEmail: true },
    { label: "取消訂單", next: "cancelled" },
  ],
  shipped:   [
    { label: "標記已送達", next: "delivered" },
  ],
  delivered: [],
  cancelled: [],
};

const STATUS_LABEL: Record<string, string> = {
  pending: "待處理", paid: "已付款", preparing: "備貨中",
  shipped: "已出貨", delivered: "已送達", cancelled: "已取消",
};

export default function OrderActions({
  orderId,
  currentStatus,
  customerEmail,
  customerName,
  shippingAddress,
  items,
  totalAmount,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [trackingNote, setTrackingNote] = useState("");
  const [showShipModal, setShowShipModal] = useState(false);
  const [pendingShip, setPendingShip] = useState<{ next: string } | null>(null);
  const [actionError, setActionError] = useState("");
  const router = useRouter();

  const actions = STATUS_TRANSITIONS[currentStatus] ?? [];

  async function handleAction(next: string, sendEmail: boolean) {
    if (sendEmail) {
      setPendingShip({ next });
      setShowShipModal(true);
      return;
    }
    await doUpdate(next, false);
  }

  async function doUpdate(next: string, sendEmail: boolean) {
    setLoading(next);
    setShowShipModal(false);
    setActionError("");

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next,
          sendShippingEmail: sendEmail,
          customerEmail,
          customerName,
          shippingAddress,
          items,
          totalAmount,
          trackingNote: trackingNote || undefined,
        }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error ?? "操作失敗，請稍後再試。");
      }
    } catch {
      setActionError("網路錯誤，請稍後再試。");
    } finally {
      setLoading(null);
    }
  }

  if (actions.length === 0) {
    return (
      <div className="text-sm text-[#9CA89E] px-4 py-2 bg-[#FAF7F2] rounded-xl border border-[#EDE8DC]">
        訂單已完成
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center">
        {actionError && (
          <span className="w-full text-xs text-rose-500 mb-1">{actionError}</span>
        )}
        {actions.map((action) => (
          <button
            key={action.next}
            onClick={() => handleAction(action.next, !!action.sendEmail)}
            disabled={!!loading}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-60 ${
              action.next === "shipped"
                ? "bg-[#7D9B84] hover:bg-[#5C7A67] text-white shadow-sm"
                : action.next === "cancelled"
                ? "bg-[#F5EDE8] hover:bg-[#EDD5CC] text-[#7A4545] border border-[#EDE0DA]"
                : "bg-white hover:bg-[#F5F0E8] text-[#3D4A42] border border-[#EDE8DC]"
            }`}
          >
            {loading === action.next ? "處理中…" : action.label}
          </button>
        ))}
      </div>

      {/* Ship Confirmation Modal */}
      {showShipModal && pendingShip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl border border-[#EDE8DC] shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-bold text-[#3D4A42] mb-1">確認出貨</h3>
            <p className="text-sm text-[#6B8872] mb-4">
              將自動寄送出貨通知 Email 給 <strong>{customerEmail}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-[#6B8872] mb-1.5 uppercase tracking-wide">
                出貨備註（選填，會顯示在 Email 中）
              </label>
              <input
                type="text"
                value={trackingNote}
                onChange={(e) => setTrackingNote(e.target.value)}
                placeholder="例：黑貓宅急便，單號 1234567890"
                className="w-full px-4 py-2.5 rounded-xl border border-[#EDE8DC] bg-[#FAF7F2] text-sm text-[#3D4A42] placeholder-[#B8C4BC] focus:outline-none focus:ring-2 focus:ring-[#7D9B84] focus:border-transparent"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowShipModal(false); setPendingShip(null); }}
                className="px-4 py-2 rounded-xl text-sm text-[#6B8872] hover:bg-[#F5F0E8] transition"
              >
                取消
              </button>
              <button
                onClick={() => doUpdate(pendingShip.next, true)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[#7D9B84] hover:bg-[#5C7A67] text-white transition"
              >
                確認出貨並寄信
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
