import Link from "next/link";
import { supabase } from "@/lib/supabase";

async function getMonthSessions(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end   = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

  const { data } = await supabase
    .from("experience_sessions")
    .select("*, experience_types(name, slug)")
    .gte("session_date", start)
    .lte("session_date", end)
    .order("session_date")
    .order("start_time");

  return data ?? [];
}

async function getMonthStats(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end   = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

  const { data } = await supabase
    .from("experience_bookings")
    .select("participant_count, total_price, status, session:experience_sessions!inner(session_date)")
    .gte("session.session_date", start)
    .lte("session.session_date", end)
    .eq("status", "confirmed");

  const totalBookings     = data?.length ?? 0;
  const totalParticipants = data?.reduce((s, b) => s + b.participant_count, 0) ?? 0;
  const totalRevenue      = data?.reduce((s, b) => s + b.total_price, 0) ?? 0;

  return { totalBookings, totalParticipants, totalRevenue };
}

const EXP_COLORS: Record<string, string> = {
  "tea-ceremony": "bg-emerald-500",
  "roasted-tea":  "bg-amber-500",
  "tea-picking":  "bg-lime-500",
  "tea-making":   "bg-orange-500",
  "tea-wine":     "bg-purple-500",
};

export default async function AdminExperiencesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp    = await searchParams;
  const today = new Date();
  const year  = sp.year  ? Number(sp.year)  : today.getFullYear();
  const month = sp.month ? Number(sp.month) : today.getMonth() + 1;

  const [sessions, stats] = await Promise.all([
    getMonthSessions(year, month),
    getMonthStats(year, month),
  ]);

  // 建立日期 → 場次 Map
  const byDate: Record<string, typeof sessions> = {};
  for (const s of sessions) {
    if (!byDate[s.session_date]) byDate[s.session_date] = [];
    byDate[s.session_date].push(s);
  }

  const firstDay    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const WEEKDAYS    = ["日", "一", "二", "三", "四", "五", "六"];

  const prevMonth = month === 1 ? `?year=${year - 1}&month=12` : `?year=${year}&month=${month - 1}`;
  const nextMonth = month === 12 ? `?year=${year + 1}&month=1`  : `?year=${year}&month=${month + 1}`;

  return (
    <div className="p-6 md:p-8 min-h-screen bg-[#F9F6F1]">
      {/* 頁首 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#3D4A42] font-serif">體驗管理</h1>
          <p className="text-sm text-[#6B8872] mt-0.5">場次排程與預約總覽</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/experiences/bookings"
            className="px-4 py-2 rounded-xl bg-white border border-[#C8DDD0] text-sm text-[#3D4A42] hover:bg-[#EBF3EE] transition-colors"
          >
            預約名單
          </Link>
          <Link
            href="/admin/experiences/sessions"
            className="px-4 py-2 rounded-xl bg-[#7D9B84] text-white text-sm hover:bg-[#5C7A67] transition-colors"
          >
            + 新增場次
          </Link>
        </div>
      </div>

      {/* 本月統計 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "本月預約數",   value: stats.totalBookings,                        unit: "筆" },
          { label: "本月參加人數", value: stats.totalParticipants,                    unit: "人" },
          { label: "本月營收",     value: `NT$ ${stats.totalRevenue.toLocaleString()}`, unit: "" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-[#EDE8DC] shadow-sm">
            <div className="text-xs text-[#6B8872] mb-1">{s.label}</div>
            <div className="text-2xl font-bold text-[#3D4A42]">
              {s.value}<span className="text-sm font-normal text-[#6B8872] ml-1">{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 月曆 */}
      <div className="bg-white rounded-2xl border border-[#EDE8DC] shadow-sm p-6">
        {/* 月份導航 */}
        <div className="flex items-center justify-between mb-5">
          <Link href={prevMonth} className="p-2 rounded-xl hover:bg-[#EBF3EE] transition-colors text-[#3D4A42]">
            ←
          </Link>
          <h2 className="font-serif text-lg font-bold text-[#3D4A42]">
            {year} 年 {month} 月
          </h2>
          <Link href={nextMonth} className="p-2 rounded-xl hover:bg-[#EBF3EE] transition-colors text-[#3D4A42]">
            →
          </Link>
        </div>

        {/* 星期標題 */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-xs text-[#6B8872] py-2 font-medium">{d}</div>
          ))}
        </div>

        {/* 日格 */}
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day     = i + 1;
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const daySess = byDate[dateStr] ?? [];
            const isToday = today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day;

            return (
              <div
                key={day}
                className={`min-h-[80px] rounded-xl p-1.5 border ${
                  isToday ? "border-[#7D9B84] bg-[#EBF3EE]" : "border-[#EDE8DC]"
                }`}
              >
                <div className={`text-xs font-medium text-right mb-1 ${isToday ? "text-[#5C7A67]" : "text-[#3D4A42]"}`}>
                  {day}
                </div>
                {daySess.map((s: {
                  id: string;
                  status: string;
                  experience_types: { slug: string; name: string };
                  start_time: string;
                  current_participants: number;
                }) => (
                  <Link
                    key={s.id}
                    href={`/admin/experiences/bookings?session=${s.id}`}
                    className={`block text-xs px-1.5 py-1 rounded-lg mb-0.5 leading-tight transition-opacity hover:opacity-80 ${
                      s.status === "cancelled"
                        ? "bg-red-100 text-red-500 line-through"
                        : s.status === "full"
                        ? "bg-gray-200 text-gray-500"
                        : EXP_COLORS[s.experience_types?.slug] ?? "bg-[#7D9B84]" + " text-white"
                    } ${s.status === "open" ? "text-white" : ""}`}
                  >
                    <div className="font-medium">{s.start_time.slice(0, 5)}</div>
                    <div className="opacity-90 truncate">{s.experience_types?.name}</div>
                    <div className="opacity-75">{s.current_participants} 人</div>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>

        {/* 圖例 */}
        <div className="flex flex-wrap gap-4 mt-5 text-xs text-[#6B8872]">
          {Object.entries(EXP_COLORS).map(([slug, color]) => {
            const names: Record<string, string> = {
              "tea-ceremony": "茶藝體驗",
              "roasted-tea":  "烤茶",
              "tea-picking":  "採茶",
              "tea-making":   "紅茶製作",
              "tea-wine":     "淺漬茶果酒",
            };
            return (
              <span key={slug} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded ${color} inline-block`} />
                {names[slug]}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
