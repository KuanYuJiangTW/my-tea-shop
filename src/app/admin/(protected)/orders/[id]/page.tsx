import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import OrderActions from "./OrderActions";

export const dynamic = "force-dynamic";

type ShippingAddress = {
  type: "home" | "cvs";
  city?: string;
  address?: string;
  company?: string;
  storeName?: string;
};

type OrderItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

const ORDER_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  new:       { label: "新訂單",  cls: "bg-[#EDE8DC] text-[#7A6855]" },
  preparing: { label: "備貨中",  cls: "bg-[#D5E8DA] text-[#2D5A47]" },
  shipped:   { label: "已出貨",  cls: "bg-[#7D9B84] text-white" },
  completed: { label: "已完成",  cls: "bg-[#5C7A67] text-white" },
  cancelled: { label: "已取消",  cls: "bg-[#E0D5D5] text-[#7A4545]" },
};

const PAYMENT_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "待付款", cls: "bg-[#FEF3C7] text-[#92400E]" },
  paid:    { label: "已付款", cls: "bg-[#C8DDD0] text-[#3D6B46]" },
};

const CVS_NAME: Record<string, string> = {
  seven: "7-ELEVEN", family: "全家", hilife: "萊爾富", ok: "OK 超商",
};

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !order) {
    notFound();
  }

  const shipping = order.shipping_address as ShippingAddress;
  const items = order.items as OrderItem[];
  const orderStatus  = ORDER_STATUS_LABEL[order.order_status]   ?? ORDER_STATUS_LABEL.new;
  const paymentStatus = PAYMENT_STATUS_LABEL[order.payment_status] ?? PAYMENT_STATUS_LABEL.pending;

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#9CA89E] mb-6">
        <Link href="/admin/orders" className="hover:text-[#7D9B84] transition">訂單管理</Link>
        <span>/</span>
        <span className="text-[#3D4A42] font-mono">#{shortId(order.id)}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl font-bold text-[#3D4A42] font-serif">
              訂單 #{shortId(order.id)}
            </h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${orderStatus.cls}`}>
              {orderStatus.label}
            </span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${paymentStatus.cls}`}>
              {paymentStatus.label}
            </span>
          </div>
          <p className="text-sm text-[#9CA89E]">
            建立於 {new Date(order.created_at).toLocaleString("zh-TW")}
          </p>
        </div>

        {/* Actions */}
        <OrderActions
          orderId={order.id}
          orderStatus={order.order_status}
          paymentMethod={order.payment_method}
          paymentStatus={order.payment_status}
          customerEmail={order.customer_email}
          customerName={order.customer_name}
          shippingAddress={shipping}
          items={items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal,
          }))}
          totalAmount={order.total_amount}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Order Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Items */}
          <div className="bg-white rounded-2xl border border-[#EDE8DC] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EDE8DC]">
              <h2 className="font-semibold text-[#3D4A42] text-sm">訂購品項</h2>
            </div>
            <div className="p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[#9CA89E] border-b border-[#F5F0E8]">
                    <th className="text-left pb-2 font-medium">品項</th>
                    <th className="text-center pb-2 font-medium">數量</th>
                    <th className="text-right pb-2 font-medium">單價</th>
                    <th className="text-right pb-2 font-medium">小計</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F0E8]">
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-3 text-[#3D4A42] font-medium">{item.name}</td>
                      <td className="py-3 text-center text-[#6B8872]">{item.quantity}</td>
                      <td className="py-3 text-right text-[#6B8872]">NT${item.unitPrice?.toLocaleString()}</td>
                      <td className="py-3 text-right font-semibold text-[#3D4A42]">NT${item.subtotal?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t border-[#EDE8DC] space-y-1.5">
                <div className="flex justify-between text-sm text-[#6B8872]">
                  <span>商品小計</span>
                  <span>NT${(order.total_amount - order.shipping_fee).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-[#6B8872]">
                  <span>運費</span>
                  <span>{order.shipping_fee === 0 ? "免費" : `NT$${order.shipping_fee.toLocaleString()}`}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#3D4A42] pt-1 border-t border-[#EDE8DC]">
                  <span>總計</span>
                  <span className="text-[#7D9B84]">NT${order.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          {order.note && (
            <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5">
              <h2 className="font-semibold text-[#3D4A42] text-sm mb-2">顧客備註</h2>
              <p className="text-sm text-[#6B8872] bg-[#FAF7F2] rounded-xl p-3">{order.note}</p>
            </div>
          )}
        </div>

        {/* Right: Customer & Shipping */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5">
            <h2 className="font-semibold text-[#3D4A42] text-sm mb-3">顧客資訊</h2>
            <div className="space-y-2">
              <Row label="姓名" value={order.customer_name} />
              <Row label="Email" value={order.customer_email} />
              <Row label="電話" value={order.customer_phone} />
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5">
            <h2 className="font-semibold text-[#3D4A42] text-sm mb-3">配送資訊</h2>
            <div className="space-y-2">
              <Row
                label="方式"
                value={shipping?.type === "home" ? "宅配到府" : "超商店到店"}
              />
              {shipping?.type === "home" ? (
                <Row label="地址" value={`${shipping.city ?? ""} ${shipping.address ?? ""}`} />
              ) : (
                <>
                  <Row label="超商" value={CVS_NAME[shipping?.company ?? ""] ?? shipping?.company ?? "—"} />
                  <Row label="門市" value={shipping?.storeName ?? "—"} />
                </>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5">
            <h2 className="font-semibold text-[#3D4A42] text-sm mb-3">付款資訊</h2>
            <div className="space-y-2">
              <Row
                label="方式"
                value={order.payment_method === "cod" ? "貨到付款" : "線上付款（綠界）"}
              />
              <Row
                label="付款狀態"
                value={order.payment_status === "paid" ? "已付款" : "待付款"}
              />
              {order.ecpay_trade_no && (
                <Row label="綠界編號" value={order.ecpay_trade_no} mono />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-[#9CA89E] flex-shrink-0">{label}</span>
      <span className={`text-[#3D4A42] text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
