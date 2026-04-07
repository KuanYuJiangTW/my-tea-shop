import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AdminCalendarClient from "./AdminCalendarClient";

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

async function getExpTypes() {
  const { data } = await supabase
    .from("experience_types")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("id");
  return data ?? [];
}

export default async function AdminExperiencesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp    = await searchParams;
  const today = new Date();
  const year  = sp.year  ? Number(sp.year)  : today.getFullYear();
  const month = sp.month ? Number(sp.month) : today.getMonth() + 1;

  const [sessions, stats, expTypes] = await Promise.all([
    getMonthSessions(year, month),
    getMonthStats(year, month),
    getExpTypes(),
  ]);

  const firstDay    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

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
        <Link
          href="/admin/experiences/bookings"
          className="px-4 py-2 rounded-xl bg-white border border-[#C8DDD0] text-sm text-[#3D4A42] hover:bg-[#EBF3EE] transition-colors"
        >
          預約名單
        </Link>
      </div>

      {/* 本月統計 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "本月預約數",   value: stats.totalBookings,                          unit: "筆" },
          { label: "本月參加人數", value: stats.totalParticipants,                      unit: "人" },
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

      {/* 月曆（含新增 Modal） */}
      <AdminCalendarClient
        expTypes={expTypes}
        sessions={sessions as Parameters<typeof AdminCalendarClient>[0]["sessions"]}
        year={year}
        month={month}
        firstDay={firstDay}
        daysInMonth={daysInMonth}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
      />
    </div>
  );
}
