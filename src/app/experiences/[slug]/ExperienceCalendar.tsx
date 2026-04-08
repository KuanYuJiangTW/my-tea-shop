"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Users, Clock } from "lucide-react";
import { ExperienceSession, ExperienceType } from "@/types";

interface Props {
  experience: ExperienceType;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function ExperienceCalendar({ experience }: Props) {
  const router  = useRouter();
  const today   = new Date();
  const [year,  setYear]    = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth() + 1);
  const [sessions, setSessions] = useState<ExperienceSession[]>([]);
  const [loading, setLoading]   = useState(true);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/experience-sessions?slug=${experience.slug}&year=${year}&month=${month}`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [experience.slug, year, month]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // 產生月曆格子
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const getDateSessions = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return sessions.filter(s => s.sessionDate === dateStr);
  };

  const isPast = (day: number) => {
    const d = new Date(year, month - 1, day);
    d.setHours(23, 59, 59);
    return d < today;
  };

  return (
    <div>
      {/* 月份導航 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="p-2 rounded-full hover:bg-tea-green-mist transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-tea-text" />
        </button>
        <h3 className="font-serif text-lg font-bold text-tea-text">
          {year} 年 {month} 月
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 rounded-full hover:bg-tea-green-mist transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-tea-text" />
        </button>
      </div>

      {/* 星期標題 */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-xs text-tea-text-light py-2 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* 日曆格子 */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-tea-text-light text-sm">
          載入中…
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {/* 空格 */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* 日期格 */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day      = i + 1;
            const daySessions = getDateSessions(day);
            const past     = isPast(day);
            const hasOpen  = daySessions.some(s => s.status === "open");

            return (
              <div
                key={day}
                className={`min-h-[72px] rounded-xl p-1.5 border transition-colors ${
                  past
                    ? "bg-gray-50 border-transparent opacity-40"
                    : daySessions.length > 0
                    ? "border-tea-green-pale bg-tea-green-mist/40"
                    : "border-transparent"
                }`}
              >
                <div className={`text-xs mb-1 font-medium text-right ${
                  past ? "text-tea-text-light" : "text-tea-text"
                }`}>
                  {day}
                </div>
                {daySessions.map(s => (
                  <button
                    key={s.id}
                    disabled={s.status !== "open" || past}
                    onClick={() => router.push(`/experiences/booking/${s.id}`)}
                    className={`w-full text-left text-xs px-1.5 py-1 rounded-lg mb-0.5 transition-colors leading-tight ${
                      s.status === "open" && !past
                        ? "bg-tea-green text-white hover:bg-tea-green-dark cursor-pointer"
                        : s.status === "full"
                        ? "bg-tea-text-light/20 text-tea-text-light cursor-not-allowed"
                        : "bg-red-100 text-red-400 cursor-not-allowed line-through"
                    }`}
                  >
                    <div className="font-medium">{s.startTime.slice(0, 5)}</div>
                    <div className="opacity-80">
                      {s.status === "open"
                        ? `${experience.maxParticipants - s.currentParticipants} 位`
                        : s.status === "full" ? "額滿" : "取消"}
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* 圖例 */}
      <div className="flex flex-wrap gap-2 sm:gap-4 mt-5 text-xs text-tea-text-light">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-tea-green inline-block" />
          可預約
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-tea-text-light/20 inline-block" />
          額滿
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100 inline-block" />
          取消
        </span>
      </div>

      {/* 開課門檻提示 */}
      <div className="mt-5 flex items-start gap-2 bg-tea-cream rounded-xl p-4 text-sm text-tea-text-light">
        <Users className="w-4 h-4 text-tea-green mt-0.5 shrink-0" />
        <span>
          每場需滿 <strong className="text-tea-text">{experience.minParticipants} 人</strong> 才開課。
          人數不足時，活動前 3 天會通知取消並全額退款。
        </span>
      </div>
    </div>
  );
}
