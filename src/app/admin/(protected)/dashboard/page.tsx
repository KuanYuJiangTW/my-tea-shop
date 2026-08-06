import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ORDER_STATUS, BOOKING_STATUS, statusBadge } from "@/lib/admin-status";
import RevenueChart from "./RevenueChart";
import type { MonthRevenue } from "./RevenueChart";

export const dynamic = "force-dynamic";

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
    monthProductCashRes,
    monthExpCashRes,
    pendingRes,
    recentOrdersRes,
    recentExpRes,
    chartOrdersRes,
    chartExpRes,
    monthCouponRes,
    monthPointsConsumedRes,
    monthPointsIssuedRes,
    outstandingPositiveRes,
    outstandingNegativeRes,
    monthExpiredRes,
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

    // 本月產品確認營收（completed）
    supabase
      .from("orders")
      .select("total_amount")
      .gte("created_at", monthStart)
      .eq("order_status", "completed"),

    // 本月體驗確認營收（completed）
    supabase
      .from("experience_bookings")
      .select("total_price")
      .eq("status", "completed")
      .gte("created_at", monthStart),

    // 本月產品收款金額（paid，現金流）
    supabase
      .from("orders")
      .select("total_amount")
      .gte("created_at", monthStart)
      .eq("payment_status", "paid"),

    // 本月體驗收款金額（confirmed = 已付款）
    supabase
      .from("experience_bookings")
      .select("total_price")
      .in("status", ["confirmed", "completed"])
      .gte("created_at", monthStart),

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

    // 近 6 個月商品訂單（for 圖表，改用 completed）
    supabase
      .from("orders")
      .select("created_at, total_amount, coupon_discount, points_discount")
      .eq("order_status", "completed")
      .gte("created_at", sixMonthsAgoStr),

    // 近 6 個月體驗預約（for 圖表，改用 completed）
    supabase
      .from("experience_bookings")
      .select("total_price, created_at")
      .eq("status", "completed")
      .gte("created_at", `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`),

    // 本月折價券消耗
    supabase
      .from("orders")
      .select("coupon_discount")
      .eq("order_status", "completed")
      .gte("created_at", monthStart),

    // 本月點數消耗
    supabase
      .from("orders")
      .select("points_discount")
      .eq("order_status", "completed")
      .gte("created_at", monthStart),

    // 本月點數發放
    supabase
      .from("point_transactions")
      .select("points")
      .eq("type", "earn")
      .gte("created_at", monthStart),

    // 未兌現點數負債（有效正值點數）
    supabase
      .from("point_transactions")
      .select("points")
      .gt("points", 0)
      .or(`expires_at.gt.${new Date().toISOString()},expires_at.is.null`),

    // 已兌換點數（負值 = redeem）
    supabase
      .from("point_transactions")
      .select("points")
      .lt("points", 0),

    // 本月過期沖銷
    supabase
      .from("points_expiry_events")
      .select("points_expired")
      .gte("created_at", monthStart),
  ]);

  // ── 確認營收（completed）──
  const monthProductRevenue =
    monthProductRes.data?.reduce((s, o) => s + (o.total_amount ?? 0), 0) ?? 0;
  const monthExpRevenue =
    monthExpRes.data?.reduce((s, b) => s + (b.total_price ?? 0), 0) ?? 0;

  // ── 現金流（已收款）──
  const monthProductCash =
    monthProductCashRes.data?.reduce((s, o) => s + (o.total_amount ?? 0), 0) ?? 0;
  const monthExpCash =
    monthExpCashRes.data?.reduce((s, b) => s + (b.total_price ?? 0), 0) ?? 0;
  const monthCashFlow = monthProductCash + monthExpCash;

  // ── 行銷成本 ──
  const monthCouponCost =
    monthCouponRes.data?.reduce((s, o) => s + (o.coupon_discount ?? 0), 0) ?? 0;
  const monthPointsCost =
    monthPointsConsumedRes.data?.reduce((s, o) => s + (o.points_discount ?? 0), 0) ?? 0;
  const monthPointsIssued =
    monthPointsIssuedRes.data?.reduce((s, t) => s + (t.points ?? 0), 0) ?? 0;
  const outstandingPositive =
    outstandingPositiveRes.data?.reduce((s, t) => s + (t.points ?? 0), 0) ?? 0;
  const outstandingNegative =
    outstandingNegativeRes.data?.reduce((s, t) => s + (t.points ?? 0), 0) ?? 0;
  const outstandingPoints = Math.max(outstandingPositive + outstandingNegative, 0);
  const monthExpired =
    monthExpiredRes.data?.reduce((s, e) => s + (e.points_expired ?? 0), 0) ?? 0;

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
          const bd = new Date(b.created_at as string);
          return bd.getFullYear() === y && bd.getMonth() + 1 === m;
        })
        .reduce((s, b) => s + (b.total_price ?? 0), 0) ?? 0;

    const discountSum =
      chartOrdersRes.data
        ?.filter(o => {
          const od = new Date(o.created_at as string);
          return od.getFullYear() === y && od.getMonth() + 1 === m;
        })
        .reduce((s, o) => s + ((o.coupon_discount as number ?? 0) + (o.points_discount as number ?? 0)), 0) ?? 0;

    chartData.push({ month: label, product: productSum, experience: expSum, discount: discountSum });
  }

  return {
    todayOrders:      todayOrdersRes.count ?? 0,
    todayExp:         todayExpRes.count ?? 0,
    monthProductRevenue,
    monthExpRevenue,
    monthTotalRevenue: monthProductRevenue + monthExpRevenue,
    monthCashFlow,
    monthCouponCost,
    monthPointsCost,
    monthPointsIssued,
    outstandingPoints,
    monthExpired,
    pendingShipment:  pendingRes.count ?? 0,
    recentOrders:     recentOrdersRes.data ?? [],
    recentExp:        recentExpRes.data ?? [],
    chartData,
  };
}

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

export default async function DashboardPage() {
  const {
    todayOrders, todayExp,
    monthProductRevenue, monthExpRevenue, monthTotalRevenue,
    monthCashFlow, monthCouponCost, monthPointsCost, monthPointsIssued, outstandingPoints, monthExpired,
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
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-tea-green">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
        </svg>
      ),
    },
    {
      label: "今日體驗預約",
      value: todayExp,
      unit: "筆",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-tea-green">
          <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
        </svg>
      ),
    },
    {
      label: "本月產品營收",
      value: `NT$${monthProductRevenue.toLocaleString()}`,
      unit: "",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-tea-green">
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
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-tea-green">
          <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
        </svg>
      ),
    },
    {
      label: "本月現金流",
      value: `NT$${monthCashFlow.toLocaleString()}`,
      unit: "",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#2D7A4F]">
          <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      ),
    },
    {
      label: "待出貨",
      value: pendingShipment,
      unit: "筆",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-tea-green">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      ),
    },
    {
      label: "折價券消耗",
      value: `NT$${monthCouponCost.toLocaleString()}`,
      unit: "",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#B45309]">
          <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
        </svg>
      ),
    },
    {
      label: "點數消耗",
      value: `NT$${monthPointsCost.toLocaleString()}`,
      unit: "",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#B45309]">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      ),
    },
    {
      label: "本月發放點數",
      value: monthPointsIssued.toLocaleString(),
      unit: "點",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#6B21A8]">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.87c0 1.92-1.43 2.96-3.12 3.17z" />
        </svg>
      ),
    },
    {
      label: "未兌現點數負債",
      value: `NT$${outstandingPoints.toLocaleString()}`,
      unit: "",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#9333EA]">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H11.5v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.65c.09 1.71 1.37 2.66 2.85 2.97V19h1.73v-1.67c1.52-.29 2.72-1.16 2.72-2.74 0-2.21-1.87-2.97-3.64-3.45z" />
        </svg>
      ),
    },
    {
      label: "本月過期沖銷",
      value: `NT$${monthExpired.toLocaleString()}`,
      unit: "",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#DC2626]">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-tea-text font-serif">儀表板</h1>
        <p className="text-sm text-tea-text-light mt-1">
          {new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
        </p>
      </div>

      {/* Stats Cards — 2 欄手機 / 3 欄平板 / 4 欄桌機 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-tea-cream-dark p-4 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-medium text-tea-text-light uppercase tracking-wider truncate pr-1">
                {stat.label}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-tea-green-mist flex items-center justify-center flex-shrink-0">
                {stat.icon}
              </div>
            </div>
            <div className="text-base sm:text-2xl font-bold text-tea-text break-all leading-tight">
              {stat.value}
              {stat.unit && <span className="text-xs sm:text-sm font-normal text-tea-text-light ml-1">{stat.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* 近 6 個月營收趨勢圖 */}
      <div className="bg-white rounded-2xl border border-tea-cream-dark p-5 mb-4">
        <h2 className="font-semibold text-tea-text text-sm mb-4">近 6 個月營收趨勢</h2>
        <RevenueChart data={chartData} />
      </div>

      {/* Recent Orders & Recent Experience Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* 最新商品訂單 */}
        <div className="bg-white rounded-2xl border border-tea-cream-dark overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-tea-cream-dark">
            <h2 className="font-semibold text-tea-text text-sm">最新訂單</h2>
            <Link href="/admin/orders" className="text-xs text-tea-green hover:text-tea-green-dark font-medium transition">
              查看全部 →
            </Link>
          </div>
          <div className="divide-y divide-tea-cream">
            {recentOrders.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-tea-text-faint">目前尚無訂單</div>
            ) : (
              recentOrders.map((order) => {
                const status = statusBadge(ORDER_STATUS, order.order_status as string);
                const itemCount = Array.isArray(order.items) ? order.items.length : 0;
                return (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-tea-cream transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-xs font-mono text-tea-text-light">#{shortId(order.id as string)}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.cls}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-tea-text truncate">{order.customer_name as string}</div>
                      <div className="text-xs text-tea-text-faint">{itemCount} 件商品</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-tea-text">
                        NT${(order.total_amount as number).toLocaleString()}
                      </div>
                      <div className="text-xs text-tea-text-faint">
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
        <div className="bg-white rounded-2xl border border-tea-cream-dark overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-tea-cream-dark">
            <h2 className="font-semibold text-tea-text text-sm">最近體驗預約</h2>
            <Link href="/admin/experiences/bookings" className="text-xs text-tea-green hover:text-tea-green-dark font-medium transition">
              查看全部 →
            </Link>
          </div>
          <div className="divide-y divide-tea-cream">
            {recentExp.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-tea-text-faint">目前尚無預約</div>
            ) : (
              recentExp.map((b) => {
                const session = b.session as unknown as { session_date: string; experience_types: { name: string } } | null;
                const status  = statusBadge(BOOKING_STATUS, b.status as string);
                return (
                  <Link
                    key={b.id}
                    href="/admin/experiences/bookings"
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-tea-cream transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.cls}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-tea-text truncate">{b.contact_name as string}</div>
                      <div className="text-xs text-tea-text-faint truncate">
                        {session?.experience_types?.name ?? "—"} · {session?.session_date ?? "—"} · {b.participant_count as number} 人
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-tea-text">
                        NT${(b.total_price as number).toLocaleString()}
                      </div>
                      <div className="text-xs text-tea-text-faint">
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
          className="bg-white rounded-2xl border border-tea-cream-dark p-5 hover:border-tea-green-light hover:bg-tea-cream transition group"
        >
          <div className="text-sm font-medium text-tea-text mb-1 group-hover:text-tea-green-dark">待出貨訂單</div>
          <div className="text-xs text-tea-text-faint">查看需要出貨的訂單</div>
        </Link>
        <Link
          href="/admin/products"
          className="bg-white rounded-2xl border border-tea-cream-dark p-5 hover:border-tea-green-light hover:bg-tea-cream transition group"
        >
          <div className="text-sm font-medium text-tea-text mb-1 group-hover:text-tea-green-dark">管理產品</div>
          <div className="text-xs text-tea-text-faint">調整庫存、價格與上下架</div>
        </Link>
        <Link
          href="/admin/experiences/bookings"
          className="bg-white rounded-2xl border border-tea-cream-dark p-5 hover:border-tea-green-light hover:bg-tea-cream transition group"
        >
          <div className="text-sm font-medium text-tea-text mb-1 group-hover:text-tea-green-dark">體驗管理</div>
          <div className="text-xs text-tea-text-faint">查看體驗預約與場次</div>
        </Link>
      </div>
    </div>
  );
}
