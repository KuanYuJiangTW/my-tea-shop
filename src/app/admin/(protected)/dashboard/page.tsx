import { supabase } from "@/lib/supabase";
import Link from "next/link";
import dynamicImport from "next/dynamic";
import type { MonthRevenue } from "./RevenueChart";

export const dynamic = "force-dynamic";

// 動態載入圖表（避免 SSR 錯誤）
const RevenueChart = dynamicImport(() => import("./RevenueChart"), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] flex items-center justify-center text-sm text-[#9CA89E]">
      載入圖表中…
    </div>
  ),
});

async function getStats() {
  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthStartDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEndDate   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

  // 近 6 個月起始日期
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString();

  const [
    todayOrdersRes,
    todayExpRes,
    monthProductRes,
    monthExpRes,
    pendingRes,
    recentOrdersRes,
    recentExpRes,
    chartOrdersRes,
    chartExpRes,
  ] = await Promise.all([
    // 今日商品訂單數
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart),

    // 今日體驗預約數
    supabase
      .from("experience_bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed")
      .gte("created_at", todayStart),

    // 本月產品營收
    supabase
      .from("orders")
      .select("total_amount")
      .gte("created_at", monthStart)
      .eq("payment_status", "paid"),

    // 本月體驗營收（透過 session join 篩選 session_date 在本月）
    supabase
      .from("experience_bookings")
      .select("total_price, session:experience_sessions!inner(session_date)")
      .eq("status", "confirmed")
      .gte("session.session_date", monthStartDate)
      .lte("session.session_date", monthEndDate),

    // 待出貨訂單
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("order_status", ["new", "preparing"]),

    // 最近 5 筆商品訂單
    supabase
      .from("orders")
      .select("id, created_at, customer_name, total_amount, order_status, payment_status, items")
      .order("created_at", { ascending: false })
      .limit(5),

    // 最近 5 筆體驗預約
    supabase
      .from("experience_bookings")
      .select("id, created_at, contact_name, participant_count, total_price, status, session:experience_sessions!inner(session_date, experience_types(name))")
      .order("created_at", { ascending: false })
      .limit(5),

    // 近 6 個月商品訂單（for 圖表）
    supabase
      .from("orders")
      .select("created_at, total_amount")
      .eq("payment_status", "paid")
      .gte("created_at", sixMonthsAgoStr),

    // 近 6 個月體驗預約（for 圖表）
    supabase
      .from("experience_bookings")
      .select("total_price, session:experience_sessions!inner(session_date)")
      .eq("status", "confirmed")
      .gte("session.session_date", `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`),
  ]);

  const monthProductRevenue =
    monthProductRes.data?.reduce((s, o) => s + (o.total_amount ?? 0), 0) ?? 0;
  const monthExpRevenue =
    monthExpRes.data?.reduce((s, b) => s + (b.total_price ?? 0), 0) ?? 0;

  // 產生近 6 個月圖表資料
  const chartData: MonthRevenue[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const label = `${m}月`;

    const productSum =
      chartOrdersRes.data
        ?.filter(o => {
          const od = new Date(o.created_at as string);
          return od.getFullYear() === y && od.getMonth() + 1 === m;
        })
        .reduce((s, o) => s + (o.total_amount ?? 0), 0) ?? 0;

    const expSum =
      chartExpRes.data
        ?.filter(b => {
          const sess = b.session as unknown as { session_date: string } | null;
          if (!sess) return false;
          const [sy, sm] = sess.session_date.split("-").map(Number);
          return sy === y && sm === m;
        })
        .reduce((s, b) => s + (b.total_price ?? 0), 0) ?? 0;

    chartData.push({ month: label, product: productSum, experience: expSum });
  }

  return {
    todayOrders:      todayOrdersRes.count ?? 0,
    todayExp:         todayExpRes.count ?? 0,
    monthProductRevenue,
    monthExpRevenue,
    monthTotalRevenue: monthProductRevenue + monthExpRevenue,
    pendingShipment:  pendingRes.count ?? 0,
    recentOrders:     recentOrdersRes.data ?? [],
    recentExp:        recentExpRes.data ?? [],
    chartData,
  };
}

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  new:       { label: "新訂單", cls: "bg-[#EDE8DC] text-[#7A6855]" },
  preparing: { label: "備貨中", cls: "bg-[#D5E8DA] text-[#2D5A47]" },
  shipped:   { label: "已出貨", cls: "bg-[#7D9B84] text-white" },
  completed: { label: "已完成", cls: "bg-[#5C7A67] text-white" },
  cancelled: { label: "已取消", cls: "bg-[#E0D5D5] text-[#7A4545]" },
};

const EXP_STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "已確認", cls: "bg-[#D5E8DA] text-[#2D5A47]" },
  pending:   { label: "待付款", cls: "bg-[#EDE8DC] text-[#7A6855]" },
  cancelled: { label: "已取消", cls: "bg-[#E0D5D5] text-[#7A4545]" },
};

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

export default async function DashboardPage() {
  const {
    todayOrders, todayExp,
    monthProductRevenue, monthExpRevenue, monthTotalRevenue,
    pendingShipment,
    recentOrders, recentExp,
    chartData,
  } = await getStats();

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
      label: "今日體驗預約",
      value: todayExp,
      unit: "筆",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#7D9B84]">
          <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
        </svg>
      ),
    },
    {
      label: "本月產品營收",
      value: `NT$${monthProductRevenue.toLocaleString()}`,
      unit: "",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#7D9B84]">
          <path d="M17 8C8 10 5.9 16.17 3.82 19.8L5.71 21l1-1.5A4.49 4.49 0 0 0 8 20c4 0 4-2 8-2s4 2 8 2v-2c-4 0-4-2-8-2c-.65 0-1.2.05-1.7.12C14.93 12.12 16 10 17 8z" />
        </svg>
      ),
    },
    {
      label: "本月體驗營收",
      value: `NT$${monthExpRevenue.toLocaleString()}`,
      unit: "",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#D97706]">
          <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
        </svg>
      ),
    },
    {
      label: "本月總營收",
      value: `NT$${monthTotalRevenue.toLocaleString()}`,
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
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#3D4A42] font-serif">儀表板</h1>
        <p className="text-sm text-[#6B8872] mt-1">
          {new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
        </p>
      </div>

      {/* Stats Cards — 2 欄手機 / 3 欄桌機 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-[#EDE8DC] p-4 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-medium text-[#6B8872] uppercase tracking-wider truncate pr-1">
                {stat.label}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#EBF3EE] flex items-center justify-center flex-shrink-0">
                {stat.icon}
              </div>
            </div>
            <div className="text-base sm:text-2xl font-bold text-[#3D4A42] break-all leading-tight">
              {stat.value}
              {stat.unit && <span className="text-xs sm:text-sm font-normal text-[#6B8872] ml-1">{stat.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* 近 6 個月營收趨勢圖 */}
      <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5 mb-4">
        <h2 className="font-semibold text-[#3D4A42] text-sm mb-4">近 6 個月營收趨勢</h2>
        <RevenueChart data={chartData} />
      </div>

      {/* Recent Orders & Recent Experience Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* 最新商品訂單 */}
        <div className="bg-white rounded-2xl border border-[#EDE8DC] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EDE8DC]">
            <h2 className="font-semibold text-[#3D4A42] text-sm">最新訂單</h2>
            <Link href="/admin/orders" className="text-xs text-[#7D9B84] hover:text-[#5C7A67] font-medium transition">
              查看全部 →
            </Link>
          </div>
          <div className="divide-y divide-[#F5F0E8]">
            {recentOrders.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#9CA89E]">目前尚無訂單</div>
            ) : (
              recentOrders.map((order) => {
                const status = ORDER_STATUS[order.order_status as string] ?? ORDER_STATUS.new;
                const itemCount = Array.isArray(order.items) ? order.items.length : 0;
                return (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#FAF7F2] transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-xs font-mono text-[#6B8872]">#{shortId(order.id as string)}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.cls}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-[#3D4A42] truncate">{order.customer_name as string}</div>
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

        {/* 最近體驗預約 */}
        <div className="bg-white rounded-2xl border border-[#EDE8DC] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EDE8DC]">
            <h2 className="font-semibold text-[#3D4A42] text-sm">最近體驗預約</h2>
            <Link href="/admin/experiences/bookings" className="text-xs text-[#7D9B84] hover:text-[#5C7A67] font-medium transition">
              查看全部 →
            </Link>
          </div>
          <div className="divide-y divide-[#F5F0E8]">
            {recentExp.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#9CA89E]">目前尚無預約</div>
            ) : (
              recentExp.map((b) => {
                const session = b.session as unknown as { session_date: string; experience_types: { name: string } } | null;
                const status  = EXP_STATUS[b.status as string] ?? EXP_STATUS.pending;
                return (
                  <Link
                    key={b.id}
                    href="/admin/experiences/bookings"
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#FAF7F2] transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.cls}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-[#3D4A42] truncate">{b.contact_name as string}</div>
                      <div className="text-xs text-[#9CA89E] truncate">
                        {session?.experience_types?.name ?? "—"} · {session?.session_date ?? "—"} · {b.participant_count as number} 人
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-[#3D4A42]">
                        NT${(b.total_price as number).toLocaleString()}
                      </div>
                      <div className="text-xs text-[#9CA89E]">
                        {new Date(b.created_at as string).toLocaleDateString("zh-TW")}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/admin/orders?status=pending"
          className="bg-white rounded-2xl border border-[#EDE8DC] p-5 hover:border-[#A3BFA8] hover:bg-[#FAF7F2] transition group"
        >
          <div className="text-sm font-medium text-[#3D4A42] mb-1 group-hover:text-[#5C7A67]">待出貨訂單</div>
          <div className="text-xs text-[#9CA89E]">查看需要出貨的訂單</div>
        </Link>
        <Link
          href="/admin/products"
          className="bg-white rounded-2xl border border-[#EDE8DC] p-5 hover:border-[#A3BFA8] hover:bg-[#FAF7F2] transition group"
        >
          <div className="text-sm font-medium text-[#3D4A42] mb-1 group-hover:text-[#5C7A67]">管理產品</div>
          <div className="text-xs text-[#9CA89E]">調整庫存、價格與上下架</div>
        </Link>
        <Link
          href="/admin/experiences/bookings"
          className="bg-white rounded-2xl border border-[#EDE8DC] p-5 hover:border-[#A3BFA8] hover:bg-[#FAF7F2] transition group"
        >
          <div className="text-sm font-medium text-[#3D4A42] mb-1 group-hover:text-[#5C7A67]">體驗管理</div>
          <div className="text-xs text-[#9CA89E]">查看體驗預約與場次</div>
        </Link>
      </div>
    </div>
  );
}
