"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Order = {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  payment_method: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  shipping_address: { type: string; city?: string; address?: string; company?: string; storeName?: string };
  note?: string;
};

const STATUS_OPTIONS = [
  { value: "all",       label: "全部訂單" },
  { value: "new",       label: "新訂單" },
  { value: "preparing", label: "備貨中" },
  { value: "shipped",   label: "已出貨" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

const ORDER_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  new:       { label: "新訂單", cls: "bg-[#EDE8DC] text-[#7A6855]" },
  preparing: { label: "備貨中", cls: "bg-[#D5E8DA] text-[#2D5A47]" },
  shipped:   { label: "已出貨", cls: "bg-[#7D9B84] text-white" },
  completed: { label: "已完成", cls: "bg-[#5C7A67] text-white" },
  cancelled: { label: "已取消", cls: "bg-[#E0D5D5] text-[#7A4545]" },
};

const PAYMENT_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "待付款", cls: "bg-[#FEF3C7] text-[#92400E]" },
  paid:    { label: "已付款", cls: "bg-[#C8DDD0] text-[#3D6B46]" },
};

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

function formatShipping(addr: Order["shipping_address"]): string {
  if (!addr) return "—";
  if (addr.type === "home") return `宅配｜${addr.city ?? ""} ${addr.address ?? ""}`;
  const map: Record<string, string> = { seven: "7-ELEVEN", family: "全家", hilife: "萊爾富", ok: "OK" };
  return `超商｜${map[addr.company ?? ""] ?? addr.company} ${addr.storeName ?? ""}`;
}

export default function OrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const searchParams = useSearchParams();
  const defaultStatus = searchParams.get("status") ?? "all";

  const [filter, setFilter] = useState(defaultStatus);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return initialOrders.filter((o) => {
      const matchStatus = filter === "all" || o.order_status === filter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_email.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        shortId(o.id).toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [initialOrders, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: initialOrders.length };
    for (const o of initialOrders) {
      c[o.order_status] = (c[o.order_status] ?? 0) + 1;
    }
    return c;
  }, [initialOrders]);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#3D4A42] font-serif">訂單管理</h1>
        <p className="text-sm text-[#6B8872] mt-1">共 {initialOrders.length} 筆訂單</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 flex-wrap mb-4 bg-white rounded-xl border border-[#EDE8DC] p-1">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === opt.value
                ? "bg-[#7D9B84] text-white shadow-sm"
                : "text-[#6B8872] hover:text-[#3D4A42] hover:bg-[#F5F0E8]"
            }`}
          >
            {opt.label}
            {counts[opt.value] !== undefined && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                filter === opt.value ? "bg-white/20 text-white" : "bg-[#EDE8DC] text-[#7A6855]"
              }`}>
                {counts[opt.value] ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 fill-[#9CA89E]">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            placeholder="搜尋姓名、Email 或訂單編號…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#EDE8DC] bg-white text-sm text-[#3D4A42] placeholder-[#B8C4BC] focus:outline-none focus:ring-2 focus:ring-[#7D9B84] focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EDE8DC] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#9CA89E]">
            {search || filter !== "all" ? "找不到符合條件的訂單" : "目前尚無訂單"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EDE8DC] bg-[#FAF7F2]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B8872] uppercase tracking-wider">訂單</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B8872] uppercase tracking-wider">客戶</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B8872] uppercase tracking-wider hidden md:table-cell">配送</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B8872] uppercase tracking-wider hidden sm:table-cell">付款</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B8872] uppercase tracking-wider">狀態</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#6B8872] uppercase tracking-wider">金額</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#6B8872] uppercase tracking-wider">日期</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F0E8]">
                {filtered.map((order) => {
                  const os = ORDER_STATUS_LABEL[order.order_status] ?? ORDER_STATUS_LABEL.new;
                  const ps = PAYMENT_STATUS_LABEL[order.payment_status] ?? PAYMENT_STATUS_LABEL.pending;
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[#FAF7F2] transition cursor-pointer"
                      onClick={() => window.location.href = `/admin/orders/${order.id}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-[#6B8872]">#{shortId(order.id)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#3D4A42]">{order.customer_name}</div>
                        <div className="text-xs text-[#9CA89E]">{order.customer_email}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-[#6B8872]">
                          {formatShipping(order.shipping_address)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-[#6B8872]">
                          {order.payment_method === "cod" ? "貨到付款" : "線上付款"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex w-fit text-[10px] font-medium px-2 py-0.5 rounded-full ${os.cls}`}>
                            {os.label}
                          </span>
                          <span className={`inline-flex w-fit text-[10px] font-medium px-2 py-0.5 rounded-full ${ps.cls}`}>
                            {ps.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#3D4A42]">
                        NT${order.total_amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[#9CA89E]">
                        {new Date(order.created_at).toLocaleDateString("zh-TW")}
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
