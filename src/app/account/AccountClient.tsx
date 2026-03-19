"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

type Profile = {
  id: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
};

type Order = {
  id: string;
  created_at: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  payment_method: string;
  items: { name: string; quantity: number; unitPrice: number; subtotal: number }[];
  shipping_address: { type: string; city?: string; address?: string; company?: string; storeName?: string };
};

type Props = {
  user: { id: string; email: string };
  profile: Profile | null;
  orders: Order[];
};

const CITIES = ["台北市","新北市","桃園市","台中市","台南市","高雄市","基隆市","新竹市","新竹縣","苗栗縣","彰化縣","南投縣","雲林縣","嘉義市","嘉義縣","屏東縣","宜蘭縣","花蓮縣","台東縣","澎湖縣","金門縣","連江縣"];

// 會員端依 order_status + payment_status 組合顯示
function getMemberStatusLabel(orderStatus: string, paymentStatus: string): { label: string; cls: string } {
  if (orderStatus === "new") {
    return paymentStatus === "paid"
      ? { label: "已付款", cls: "bg-[#C8DDD0] text-[#3D6B46]" }
      : { label: "待處理", cls: "bg-[#EDE8DC] text-[#7A6855]" };
  }
  const map: Record<string, { label: string; cls: string }> = {
    preparing: { label: "備貨中", cls: "bg-[#D5E8DA] text-[#2D5A47]" },
    shipped:   { label: "已出貨", cls: "bg-tea-green text-white" },
    completed: { label: "已完成", cls: "bg-tea-green-dark text-white" },
    cancelled: { label: "已取消", cls: "bg-[#E0D5D5] text-[#7A4545]" },
  };
  return map[orderStatus] ?? { label: "待處理", cls: "bg-[#EDE8DC] text-[#7A6855]" };
}

const CVS_NAME: Record<string, string> = {
  seven: "7-ELEVEN", family: "全家", hilife: "萊爾富", ok: "OK 超商",
};

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

type ProfileErrors = {
  name?: string;
  phone?: string;
  city?: string;
  address?: string;
};

const phoneRegex = /^09\d{8}$/;

export default function AccountClient({ user, profile, orders: initialOrders }: Props) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "orders" ? "orders" : "profile";
  const [tab, setTab] = useState<"profile" | "orders">(defaultTab);

  // ── Profile state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name:    profile?.name    ?? "",
    phone:   profile?.phone   ?? "",
    city:    profile?.city    ?? "",
    address: profile?.address ?? "",
  });
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ── Orders state ───────────────────────────────────────────────────────────
  const [orderList, setOrderList] = useState<Order[]>(initialOrders);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Cancel state
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Address edit state
  const [editAddressOrder, setEditAddressOrder] = useState<Order | null>(null);
  const [addressForm, setAddressForm] = useState({ city: "", address: "" });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");

  useEffect(() => {
    if (saveSuccess) {
      const t = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(t);
    }
  }, [saveSuccess]);

  function validateProfile(): boolean {
    const e: ProfileErrors = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      e.name = "姓名至少 2 個字";
    }
    if (form.phone && !phoneRegex.test(form.phone.replace(/-/g, ""))) {
      e.phone = "請輸入有效的手機號碼（例：0912345678）";
    }
    if (form.city && !CITIES.includes(form.city)) {
      e.city = "請選擇有效縣市";
    }
    setProfileErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSaveProfile(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validateProfile()) return;

    setSaving(true);
    setSaveError("");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id:      user.id,
        name:    form.name.trim(),
        phone:   form.phone.replace(/-/g, "") || null,
        city:    form.city || null,
        address: form.address.trim() || null,
      });

    setSaving(false);
    if (error) {
      setSaveError("儲存失敗，請稍後再試。");
    } else {
      setSaveSuccess(true);
    }
  }

  async function handleCancelOrder() {
    if (!cancelConfirmId) return;
    setCancelling(true);
    setCancelError("");

    const res = await fetch(`/api/orders/${cancelConfirmId}/cancel`, { method: "POST" });
    const json = await res.json();

    setCancelling(false);
    if (!res.ok) {
      setCancelError(json.error ?? "取消失敗，請稍後再試");
      return;
    }

    // Update local state
    setOrderList(prev =>
      prev.map(o => o.id === cancelConfirmId ? { ...o, order_status: "cancelled" } : o)
    );
    setCancelConfirmId(null);
  }

  function openEditAddress(order: Order) {
    setEditAddressOrder(order);
    setAddressForm({
      city:    order.shipping_address.city    ?? "",
      address: order.shipping_address.address ?? "",
    });
    setAddressError("");
  }

  async function handleSaveAddress(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editAddressOrder) return;

    if (!addressForm.city || !addressForm.address.trim()) {
      setAddressError("請填寫完整的縣市與地址");
      return;
    }

    setSavingAddress(true);
    setAddressError("");

    const res = await fetch(`/api/orders/${editAddressOrder.id}/address`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addressForm),
    });
    const json = await res.json();

    setSavingAddress(false);
    if (!res.ok) {
      setAddressError(json.error ?? "更新失敗，請稍後再試");
      return;
    }

    // Update local state
    setOrderList(prev =>
      prev.map(o =>
        o.id === editAddressOrder.id
          ? { ...o, shipping_address: { ...o.shipping_address, city: addressForm.city, address: addressForm.address } }
          : o
      )
    );
    setEditAddressOrder(null);
  }

  const inputCls = (hasError?: string) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-tea-text placeholder-tea-text-light/50 focus:outline-none focus:ring-2 bg-tea-cream-light/50 transition ${
      hasError
        ? "border-rose-300 focus:ring-rose-300"
        : "border-tea-green-pale focus:ring-tea-green focus:border-tea-green"
    }`;

  return (
    <div className="min-h-screen bg-tea-cream-light">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-tea-text mb-1">會員中心</h1>
          <p className="text-sm text-tea-text-light">{user.email}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border border-tea-green-pale p-1 w-fit">
          {(["profile", "orders"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t
                  ? "bg-tea-green text-white shadow-sm"
                  : "text-tea-text-light hover:text-tea-text"
              }`}
            >
              {t === "profile" ? "個人資料" : `訂單紀錄（${orderList.length}）`}
            </button>
          ))}
        </div>

        {/* ─── Profile Tab ─── */}
        {tab === "profile" && (
          <div className="bg-white rounded-2xl shadow-sm border border-tea-green-pale">
            <div className="px-7 py-5 border-b border-tea-green-pale">
              <h2 className="font-semibold text-tea-text">個人資料</h2>
              <p className="text-xs text-tea-text-light mt-0.5">儲存後，結帳時將自動帶入這些資料</p>
            </div>

            <form onSubmit={handleSaveProfile} className="p-7 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-tea-text mb-1.5">
                  姓名 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => { setForm(p => ({ ...p, name: e.target.value })); setProfileErrors(p => ({ ...p, name: undefined })); }}
                  placeholder="請輸入您的姓名"
                  className={inputCls(profileErrors.name)}
                />
                {profileErrors.name && <p className="mt-1 text-xs text-rose-500">{profileErrors.name}</p>}
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-tea-text mb-1.5">電子郵件</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-tea-green-pale text-sm text-tea-text-light bg-gray-50 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-tea-text-light">Email 無法修改</p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-tea-text mb-1.5">手機號碼</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => { setForm(p => ({ ...p, phone: e.target.value })); setProfileErrors(p => ({ ...p, phone: undefined })); }}
                  placeholder="0912345678"
                  className={inputCls(profileErrors.phone)}
                />
                {profileErrors.phone && <p className="mt-1 text-xs text-rose-500">{profileErrors.phone}</p>}
              </div>

              {/* City + Address */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-tea-text mb-1.5">縣市</label>
                  <select
                    value={form.city}
                    onChange={(e) => { setForm(p => ({ ...p, city: e.target.value })); setProfileErrors(p => ({ ...p, city: undefined })); }}
                    className={inputCls(profileErrors.city)}
                  >
                    <option value="">請選擇</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {profileErrors.city && <p className="mt-1 text-xs text-rose-500">{profileErrors.city}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-tea-text mb-1.5">常用地址</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))}
                    placeholder="鄉鎮市區、街道路、門牌號"
                    className={inputCls()}
                  />
                </div>
              </div>

              {/* Save */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-7 py-2.5 bg-tea-green hover:bg-tea-green-dark disabled:opacity-60 text-white rounded-full text-sm font-medium transition-colors"
                >
                  {saving ? "儲存中…" : "儲存資料"}
                </button>
                {saveSuccess && (
                  <span className="text-sm text-tea-green font-medium flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    已儲存
                  </span>
                )}
                {saveError && <span className="text-sm text-rose-500">{saveError}</span>}
              </div>
            </form>
          </div>
        )}

        {/* ─── Orders Tab ─── */}
        {tab === "orders" && (
          <div className="space-y-3">
            {orderList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-tea-green-pale p-12 text-center">
                <div className="w-12 h-12 bg-tea-green-mist rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-tea-green">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
                  </svg>
                </div>
                <p className="text-tea-text font-medium mb-1">尚無訂單紀錄</p>
                <p className="text-sm text-tea-text-light">去探索我們的高山茶品吧！</p>
              </div>
            ) : (
              orderList.map((order) => {
                const status = getMemberStatusLabel(order.order_status, order.payment_status);
                const isExpanded = expandedOrder === order.id;
                const itemCount = Array.isArray(order.items) ? order.items.reduce((s, i) => s + i.quantity, 0) : 0;
                const addr = order.shipping_address;
                const isHomeDelivery = addr?.type === "home";
                const shippingText = isHomeDelivery
                  ? `宅配｜${addr.city ?? ""} ${addr.address ?? ""}`
                  : `超商｜${CVS_NAME[addr?.company ?? ""] ?? addr?.company} ${addr?.storeName ?? ""}`;

                const canCancel = order.order_status === "new";
                const canEditAddress = isHomeDelivery && ["new", "preparing"].includes(order.order_status);
                const isCvsPending = !isHomeDelivery && ["new", "preparing"].includes(order.order_status);

                return (
                  <div key={order.id} className="bg-white rounded-2xl border border-tea-green-pale overflow-hidden">
                    {/* Order Summary Row */}
                    <button
                      className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-tea-cream-light/50 transition"
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs text-tea-text-light">#{shortId(order.id)}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.cls}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="text-sm text-tea-text-light">
                          {new Date(order.created_at).toLocaleDateString("zh-TW")} · {itemCount} 件商品 · {order.payment_method === "cod" ? "貨到付款" : "線上付款"}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold text-tea-text">NT${order.total_amount.toLocaleString()}</div>
                      </div>
                      <svg viewBox="0 0 24 24" className={`w-4 h-4 fill-tea-text-light flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                        <path d="M7 10l5 5 5-5z"/>
                      </svg>
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="border-t border-tea-green-pale px-6 py-4 bg-tea-cream-light/30 space-y-4">
                        {/* Items */}
                        <div>
                          <p className="text-xs font-semibold text-tea-text-light uppercase tracking-wider mb-2">購買品項</p>
                          <div className="space-y-1.5">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="text-tea-text-light">{item.name} × {item.quantity}</span>
                                <span className="text-tea-text font-medium">NT${item.subtotal?.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                          {(canCancel) && (
                            <p className="mt-2 text-xs text-tea-text-light">
                              如需變更商品或數量，請先取消訂單後重新下單。
                            </p>
                          )}
                        </div>

                        {/* Shipping */}
                        <div>
                          <p className="text-xs font-semibold text-tea-text-light uppercase tracking-wider mb-1">配送資訊</p>
                          <p className="text-sm text-tea-text-light">{shippingText}</p>
                          {/* Edit address button (home delivery only, before shipped) */}
                          {canEditAddress && (
                            <button
                              onClick={() => openEditAddress(order)}
                              className="mt-2 text-xs text-tea-green hover:text-tea-green-dark font-medium underline underline-offset-2"
                            >
                              修改收件地址
                            </button>
                          )}
                          {/* CVS: show contact info */}
                          {isCvsPending && (
                            <p className="mt-2 text-xs text-tea-text-light">
                              如需變更超商門市，請聯絡客服：
                              <a href="tel:0972619391" className="text-tea-green hover:underline mx-1">0972-619-391</a>
                              或
                              <a href="mailto:qdbzdt2846@gmail.com" className="text-tea-green hover:underline ml-1">qdbzdt2846@gmail.com</a>
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        {canCancel && (
                          <div className="pt-1 border-t border-tea-green-pale/60">
                            <button
                              onClick={() => { setCancelConfirmId(order.id); setCancelError(""); }}
                              className="text-sm text-rose-500 hover:text-rose-700 font-medium transition-colors"
                            >
                              取消訂單
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ─── Cancel Confirmation Modal ─── */}
      {cancelConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { if (!cancelling) setCancelConfirmId(null); }} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-tea-text text-lg mb-2">確認取消訂單？</h3>
            <p className="text-sm text-tea-text-light mb-5">
              取消後無法復原。若使用線上付款，退款事宜請聯絡客服處理。
            </p>
            {cancelError && (
              <p className="mb-3 text-sm text-rose-500 bg-rose-50 rounded-lg px-3 py-2">{cancelError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirmId(null)}
                disabled={cancelling}
                className="flex-1 px-4 py-2.5 rounded-xl border border-tea-green-pale text-sm font-medium text-tea-text hover:bg-tea-cream-light transition disabled:opacity-50"
              >
                返回
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition disabled:opacity-60"
              >
                {cancelling ? "取消中…" : "確認取消"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Address Modal ─── */}
      {editAddressOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { if (!savingAddress) setEditAddressOrder(null); }} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-tea-text text-lg mb-1">修改收件地址</h3>
            <p className="text-xs text-tea-text-light mb-4">訂單 #{shortId(editAddressOrder.id)}</p>
            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-tea-text mb-1.5">縣市</label>
                <select
                  value={addressForm.city}
                  onChange={(e) => setAddressForm(p => ({ ...p, city: e.target.value }))}
                  className={inputCls(addressError && !addressForm.city ? addressError : undefined)}
                >
                  <option value="">請選擇縣市</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-tea-text mb-1.5">地址</label>
                <input
                  type="text"
                  value={addressForm.address}
                  onChange={(e) => setAddressForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="鄉鎮市區、街道路、門牌號"
                  className={inputCls(addressError && !addressForm.address ? addressError : undefined)}
                />
              </div>
              {addressError && (
                <p className="text-sm text-rose-500 bg-rose-50 rounded-lg px-3 py-2">{addressError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditAddressOrder(null)}
                  disabled={savingAddress}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-tea-green-pale text-sm font-medium text-tea-text hover:bg-tea-cream-light transition disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-tea-green hover:bg-tea-green-dark text-white text-sm font-medium transition disabled:opacity-60"
                >
                  {savingAddress ? "儲存中…" : "儲存地址"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
