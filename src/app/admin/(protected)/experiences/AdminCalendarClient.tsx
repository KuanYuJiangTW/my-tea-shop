"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ExpType {
  id:   number;
  name: string;
  slug: string;
}

interface Session {
  id:                  string;
  status:              string;
  session_date:        string;
  start_time:          string;
  current_participants: number;
  experience_types:    { slug: string; name: string };
}

interface Props {
  expTypes:    ExpType[];
  sessions:    Session[];
  year:        number;
  month:       number;
  firstDay:    number;
  daysInMonth: number;
  prevMonth:   string;
  nextMonth:   string;
}

const EXP_COLORS: Record<string, string> = {
  "tea-ceremony": "bg-emerald-500",
  "roasted-tea":  "bg-amber-500",
  "tea-picking":  "bg-lime-500",
  "tea-making":   "bg-orange-500",
  "tea-wine":     "bg-purple-500",
};

const TIME_SLOTS = ["10:00", "14:00"];
const WEEKDAYS   = ["日", "一", "二", "三", "四", "五", "六"];

export default function AdminCalendarClient({
  expTypes, sessions, year, month, firstDay, daysInMonth, prevMonth, nextMonth,
}: Props) {
  const router = useRouter();

  // 日期 → 場次 Map
  const byDate: Record<string, Session[]> = {};
  for (const s of sessions) {
    if (!byDate[s.session_date]) byDate[s.session_date] = [];
    byDate[s.session_date].push(s);
  }

  const today = new Date();

  // ── Modal state ────────────────────────────────────────────────
  const [modalDate, setModalDate]   = useState("");
  const [expId, setExpId]           = useState(expTypes[0]?.id ?? 0);
  const [time, setTime]             = useState("10:00");
  const [adding, setAdding]         = useState(false);
  const [addError, setAddError]     = useState("");

  // ── Cancel state ───────────────────────────────────────────────
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  function openModal(dateStr: string) {
    setModalDate(dateStr);
    setExpId(expTypes[0]?.id ?? 0);
    setTime("10:00");
    setAddError("");
  }

  function closeModal() {
    setModalDate("");
    setAddError("");
  }

  async function handleAdd() {
    setAdding(true);
    setAddError("");
    const res  = await fetch("/api/admin/experience-sessions", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ experienceTypeId: expId, date: modalDate, time }),
    });
    const json = await res.json();
    setAdding(false);
    if (!res.ok) {
      setAddError(json.error ?? "新增失敗");
      return;
    }
    closeModal();
    router.refresh();
  }

  async function handleCancel(sessionId: string) {
    if (!confirm("確定取消此場次？")) return;
    setCancellingId(sessionId);
    const res = await fetch(`/api/admin/experience-sessions/${sessionId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: "cancelled" }),
    });
    setCancellingId(null);
    if (res.ok) router.refresh();
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-tea-cream-dark shadow-sm p-6">
        {/* 月份導航 */}
        <div className="flex items-center justify-between mb-5">
          <Link href={prevMonth} className="p-2 rounded-xl hover:bg-tea-green-mist transition-colors text-tea-text">←</Link>
          <h2 className="font-serif text-lg font-bold text-tea-text">{year} 年 {month} 月</h2>
          <Link href={nextMonth} className="p-2 rounded-xl hover:bg-tea-green-mist transition-colors text-tea-text">→</Link>
        </div>

        {/* 星期標題 */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-xs text-tea-text-light py-2 font-medium">{d}</div>
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
            const isPast  = new Date(dateStr) < new Date(today.toISOString().split("T")[0]);

            return (
              <div
                key={day}
                onClick={() => !isPast && openModal(dateStr)}
                className={`min-h-[60px] sm:min-h-[80px] rounded-xl p-1.5 border transition-colors ${
                  isToday  ? "border-tea-green bg-tea-green-mist" : "border-tea-cream-dark"
                } ${isPast ? "opacity-50 cursor-default" : "cursor-pointer hover:bg-tea-cream-light"}`}
              >
                <div className={`text-xs font-medium text-right mb-1 ${isToday ? "text-tea-green-dark" : "text-tea-text"}`}>
                  {day}
                </div>

                {daySess.map(s => {
                  const colorClass = s.status === "cancelled"
                    ? "bg-red-400"
                    : s.status === "full"
                    ? "bg-gray-400"
                    : (EXP_COLORS[s.experience_types?.slug] ?? "bg-tea-green");
                  return (
                    <Link
                      key={s.id}
                      href={`/admin/experiences/bookings?session=${s.id}`}
                      onClick={e => e.stopPropagation()}
                      className="block mb-0.5"
                    >
                      {/* 手機：只顯示彩色圓點 */}
                      <span className={`sm:hidden block w-2.5 h-2.5 rounded-full mx-auto ${colorClass} ${s.status === "cancelled" ? "opacity-50" : ""}`} />
                      {/* 桌機：完整文字區塊 */}
                      <span className={`hidden sm:block text-xs px-1.5 py-1 rounded-lg leading-tight transition-opacity hover:opacity-80 ${
                        s.status === "cancelled"
                          ? "bg-red-100 text-red-500 line-through"
                          : s.status === "full"
                          ? "bg-gray-200 text-gray-500"
                          : colorClass + " text-white"
                      }`}>
                        <span className="block font-medium">{s.start_time.slice(0, 5)}</span>
                        <span className="block opacity-90 truncate">{s.experience_types?.name}</span>
                        <span className="block opacity-75">{s.current_participants} 人</span>
                      </span>
                    </Link>
                  );
                })}

                {/* 點空白區域提示 */}
                {!isPast && daySess.length === 0 && (
                  <div className="flex items-center justify-center h-8 text-tea-green-pale text-lg">+</div>
                )}
              </div>
            );
          })}
        </div>

        {/* 圖例 */}
        <div className="flex flex-wrap gap-2 sm:gap-4 mt-5 text-xs text-tea-text-light">
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
          <span className="flex items-center gap-1.5 ml-auto text-tea-text-faint">
            點擊日期格子可新增場次
          </span>
        </div>
      </div>

      {/* ── 取消場次按鈕（浮動在月曆外，透過 sessions list） ── */}
      {sessions.filter(s => s.status === "open").length > 0 && (
        <div className="bg-white rounded-2xl border border-tea-cream-dark shadow-sm overflow-hidden mt-4">
          <div className="px-6 py-3 border-b border-tea-cream-dark">
            <p className="text-sm font-semibold text-tea-text">本月開放場次</p>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <tbody className="divide-y divide-tea-cream">
              {sessions
                .filter(s => s.status === "open")
                .map(s => (
                  <tr key={s.id} className="hover:bg-tea-cream-light transition-colors">
                    <td className="px-6 py-3 font-medium text-tea-text">{s.session_date}</td>
                    <td className="px-4 py-3 text-tea-text-light">{s.start_time.slice(0, 5)}</td>
                    <td className="px-4 py-3 text-tea-text">{s.experience_types?.name}</td>
                    <td className="px-4 py-3 text-tea-text-light">{s.current_participants} 人</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleCancel(s.id)}
                        disabled={cancellingId === s.id}
                        className="text-xs text-rose-500 hover:text-rose-700 border border-rose-200 hover:border-rose-400 px-2.5 py-1 rounded-full transition-colors disabled:opacity-50"
                      >
                        {cancellingId === s.id ? "取消中…" : "取消場次"}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ── 新增場次 Modal ── */}
      {modalDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-tea-text text-lg mb-1">新增場次</h3>
            <p className="text-sm text-tea-text-light mb-5">{modalDate}</p>

            <div className="space-y-4 mb-5">
              <div>
                <label className="text-xs text-tea-text-light mb-1.5 block">體驗類型</label>
                <select
                  value={expId}
                  onChange={e => setExpId(Number(e.target.value))}
                  className="w-full border border-tea-green-pale rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/30"
                >
                  {expTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-tea-text-light mb-1.5 block">時段</label>
                <select
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full border border-tea-green-pale rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/30"
                >
                  {TIME_SLOTS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {addError && (
              <p className="mb-4 text-sm text-rose-500 bg-rose-50 rounded-xl px-3 py-2">{addError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={adding}
                className="flex-1 px-4 py-2.5 rounded-xl border border-tea-green-pale text-sm font-medium text-tea-text hover:bg-tea-cream-light transition disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex-1 px-4 py-2.5 rounded-xl bg-tea-green hover:bg-tea-green-dark text-white text-sm font-medium transition disabled:opacity-60"
              >
                {adding ? "新增中…" : "確認新增"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
