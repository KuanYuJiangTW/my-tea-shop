import { supabase } from "@/lib/supabase";
import Link from "next/link";

async function getStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [todayRes, monthRes, pendingRes, recentRes] = await Promise.all([
    // Today's orders count
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart),

    // Monthly revenue (all non-cancelled orders)
    supabase
      .from("orders")
      .select("total_amount, payment_status")
      .gte("created_at", monthStart)
      .neq("payment_status", "cancelled"),

    // Pending shipment (pending or paid, not yet shipped/delivered/cancelled)
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("payment_status", ["pending", "paid", "preparing"]),

    // Recent 5 orders
    supabase
      .from("orders")
      .select("id, created_at, customer_name, total_amount, payment_status, items")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const monthRevenue =
    monthRes.data?.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) ?? 0;

  return {
    todayOrders: todayRes.count ?? 0,
    monthRevenue,
    pendingShipment: pendingRes.count ?? 0,
    recentOrders: recentRes.data ?? [],
  };
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:   { label: "待處理", cls: "bg-[#EDE8DC] text-[#7A6855]" },
  paid:      { label: "已付款", cls: "bg-[#C8DDD0] text-[#3D6B46]" },
  preparing: { label: "備貨中", cls: "bg-[#D5E8DA] text-[#2D5A47]" },
  shipped:   { label: "已出貨", cls: "bg-[#7D9B84] text-white" },
  delivered: { label: "已送達", cls: "bg-[#5C7A67] text-white" },
  cancelled: { label: "已取消", cls: "bg-[#E0D5D5] text-[#7A4545]" },
};

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

export default async function DashboardPage() {
  const { todayOrders, monthRevenue, pendingShipment, recentOrders } = await getStats();

  const stats = [
    {
      label: "今日訂單",
      value: todayOrders,
      unit: "筆",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#7D9B84]">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
        </svg>
      ),
    },
    {
      label: "本月營收",
      value: `NT$${monthRevenue.toLocaleString()}`,
      unit: "",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#7D9B84]">
          <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
        </svg>
      ),
    },
    {
      label: "待出貨",
      value: pendingShipment,
      unit: "筆",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#7D9B84]">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#3D4A42] font-serif">儀表板</h1>
        <p className="text-sm text-[#6B8872] mt-1">
          {new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-[#EDE8DC] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#6B8872] uppercase tracking-wider">{stat.label}</span>
              <div className="w-8 h-8 rounded-xl bg-[#EBF3EE] flex items-center justify-center">
                {stat.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-[#3D4A42]">
              {stat.value}
              {stat.unit && <span className="text-sm font-normal text-[#6B8872] ml-1">{stat.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-[#EDE8DC] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE8DC]">
          <h2 className="font-semibold text-[#3D4A42] text-sm">最新訂單</h2>
          <Link
            href="/admin/orders"
            className="text-xs text-[#7D9B84] hover:text-[#5C7A67] font-medium transition"
          >
            查看全部 →
          </Link>
        </div>

        <div className="divide-y divide-[#F5F0E8]">
          {recentOrders.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-[#9CA89E]">目前尚無訂單</div>
          ) : (
            recentOrders.map((order) => {
              const status = STATUS_LABEL[order.payment_status] ?? STATUS_LABEL.pending;
              const itemCount = Array.isArray(order.items) ? order.items.length : 0;
              return (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAF7F2] transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-[#6B8872]">#{shortId(order.id)}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-[#3D4A42]">{order.customer_name}</div>
                    <div className="text-xs text-[#9CA89E]">{itemCount} 件商品</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-[#3D4A42]">
                      NT${(order.total_amount as number).toLocaleString()}
                    </div>
                    <div className="text-xs text-[#9CA89E]">
                      {new Date(order.created_at as string).toLocaleDateString("zh-TW")}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <Link
          href="/admin/orders?status=pending"
          className="bg-white rounded-2xl border border-[#EDE8DC] p-5 hover:border-[#A3BFA8] hover:bg-[#FAF7F2] transition group"
        >
          <div className="text-sm font-medium text-[#3D4A42] mb-1 group-hover:text-[#5C7A67]">
            待出貨訂單
          </div>
          <div className="text-xs text-[#9CA89E]">查看需要出貨的訂單</div>
        </Link>
        <Link
          href="/admin/products"
          className="bg-white rounded-2xl border border-[#EDE8DC] p-5 hover:border-[#A3BFA8] hover:bg-[#FAF7F2] transition group"
        >
          <div className="text-sm font-medium text-[#3D4A42] mb-1 group-hover:text-[#5C7A67]">
            管理產品
          </div>
          <div className="text-xs text-[#9CA89E]">調整庫存、價格與上下架</div>
        </Link>
      </div>
    </div>
  );
}
