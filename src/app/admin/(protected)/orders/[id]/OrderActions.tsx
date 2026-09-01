"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ShippingAddress = {
  type: "home" | "cvs" | "international";
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

type Action = {
  label: string;
  orderStatus: string;
  paymentStatus?: string;   // 同時更新付款狀態（確認收款用）
  sendEmail?: boolean;
  variant: "primary" | "danger" | "success";
};

type Props = {
  orderId: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  customerEmail: string;
  customerName: string;
  shippingAddress: ShippingAddress;
  items: Item[];
  totalAmount: number;
};

/** 線上金流且尚未收到款——推進狀態會賠貨（見 getActions 與後端 PATCH 的同名防護） */
export function isAwaitingOnlinePayment(paymentMethod: string, paymentStatus: string): boolean {
  return paymentMethod !== "cod" && paymentStatus !== "paid";
}

function getActions(
  orderStatus: string,
  paymentMethod: string,
  paymentStatus: string
): Action[] {
  // 未付款的線上金流訂單只留取消。理由與後端 PATCH 的防護相同：線上金流付款成功
  // 才扣庫存，未付款出貨會錢貨兩失；而 preparing 之後客人就無法自助取消了。
  // 這裡是防呆，真正的強制在後端——UI 擋得住手滑，擋不住直接打 API。
  if (isAwaitingOnlinePayment(paymentMethod, paymentStatus)) {
    if (orderStatus === "cancelled" || orderStatus === "completed") return [];
    return [{ label: "取消訂單", orderStatus: "cancelled", variant: "danger" }];
  }

  if (orderStatus === "new") {
    return [
      { label: "開始備貨", orderStatus: "preparing", variant: "primary" },
      { label: "取消訂單", orderStatus: "cancelled", variant: "danger" },
    ];
  }
  if (orderStatus === "preparing") {
    return [
      { label: "確認出貨", orderStatus: "shipped", sendEmail: true, variant: "primary" },
      { label: "取消訂單", orderStatus: "cancelled", variant: "danger" },
    ];
  }
  if (orderStatus === "shipped") {
    if (paymentMethod === "cod" && paymentStatus === "pending") {
      return [
        {
          label: "確認收款",
          orderStatus: "completed",
          paymentStatus: "paid",
          variant: "success",
        },
      ];
    }
    // online payment (already paid)
    return [
      { label: "標記完成", orderStatus: "completed", variant: "primary" },
    ];
  }
  return [];
}

export default function OrderActions({
  orderId,
  orderStatus,
  paymentMethod,
  paymentStatus,
  customerEmail,
  customerName,
  shippingAddress,
  items,
  totalAmount,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [trackingNote, setTrackingNote] = useState("");
  const [showShipModal, setShowShipModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [actionError, setActionError] = useState("");
  const router = useRouter();

  const actions = getActions(orderStatus, paymentMethod, paymentStatus);
  const awaitingPayment = isAwaitingOnlinePayment(paymentMethod, paymentStatus);

  async function handleClick(action: Action) {
    if (action.sendEmail) {
      setPendingAction(action);
      setShowShipModal(true);
      return;
    }
    await doUpdate(action, false);
  }

  async function doUpdate(action: Action, sendEmail: boolean) {
    setLoading(action.orderStatus);
    setShowShipModal(false);
    setActionError("");

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderStatus:       action.orderStatus,
          paymentStatus:     action.paymentStatus,
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
      <div className="text-sm text-tea-text-faint px-4 py-2 bg-tea-cream-light rounded-xl border border-tea-cream-dark">
        {orderStatus === "completed" ? "訂單已完成" : "訂單已取消"}
      </div>
    );
  }

  const variantCls: Record<string, string> = {
    primary: "bg-white hover:bg-tea-cream text-tea-text border border-tea-cream-dark",
    danger:  "bg-[#F5EDE8] hover:bg-[#EDD5CC] text-[#7A4545] border border-[#EDE0DA]",
    success: "bg-tea-green hover:bg-tea-green-dark text-white shadow-sm",
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center">
        {actionError && (
          <span className="w-full text-xs text-rose-500 mb-1">{actionError}</span>
        )}
        {/* 說明為什麼推進按鈕不見了。沒有這行，看板的人只會覺得後台壞了 */}
        {awaitingPayment && (
          <span className="w-full text-xs text-[#7A6A45] bg-[#FBF6E9] border border-[#EFE4C8] rounded-xl px-3 py-2 mb-1">
            尚未收到付款，暫時無法備貨或出貨。客人完成付款後按鈕會自動出現；
            確定不會付款的話，直接取消訂單即可。
          </span>
        )}
        {actions.map((action) => (
          <button
            key={action.orderStatus}
            onClick={() => handleClick(action)}
            disabled={!!loading}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-60 ${variantCls[action.variant]}`}
          >
            {loading === action.orderStatus ? "處理中…" : action.label}
          </button>
        ))}
      </div>

      {/* Ship Confirmation Modal */}
      {showShipModal && pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl border border-tea-cream-dark shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-bold text-tea-text mb-1">確認出貨</h3>
            <p className="text-sm text-tea-text-light mb-4">
              將自動寄送出貨通知 Email 給 <strong>{customerEmail}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-tea-text-light mb-1.5 uppercase tracking-wide">
                出貨備註（選填，會顯示在 Email 中）
              </label>
              <input
                type="text"
                value={trackingNote}
                onChange={(e) => setTrackingNote(e.target.value)}
                placeholder="例：黑貓宅急便，單號 1234567890"
                className="w-full px-4 py-2.5 rounded-xl border border-tea-cream-dark bg-tea-cream-light text-sm text-tea-text placeholder-[#B8C4BC] focus:outline-none focus:ring-2 focus:ring-tea-green focus:border-transparent"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowShipModal(false); setPendingAction(null); }}
                className="px-4 py-2 rounded-xl text-sm text-tea-text-light hover:bg-tea-cream transition"
              >
                取消
              </button>
              <button
                onClick={() => doUpdate(pendingAction, true)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-tea-green hover:bg-tea-green-dark text-white transition"
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
