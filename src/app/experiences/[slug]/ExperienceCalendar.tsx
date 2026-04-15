"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Users, Clock } from "lucide-react";
import { ExperienceSession, ExperienceType } from "@/types";

interface Props {
  experience: ExperienceType;
}

const DOT_COLOR: Record<string, string> = {
  open:      "bg-tea-green",
  full:      "bg-tea-text-light/40",
  cancelled: "bg-red-300",
};

export default function ExperienceCalendar({ experience }: Props) {
  const router  = useRouter();
  const locale  = useLocale();
  const t = useTranslations("experienceCalendar");
  const lp = (path: string) => locale === "en" ? `/en${path}` : path;
  const weekdays = t.raw("weekdays") as string[];
  const today   = new Date();
  const [year,  setYear]       = useState(today.getFullYear());
  const [month, setMonth]      = useState(today.getMonth() + 1);
  const [sessions, setSessions]       = useState<ExperienceSession[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

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

  const firstDay    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    setSelectedDay(null);
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelectedDay(null);
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

  const handleDayClick = (day: number, hasSessions: boolean, past: boolean) => {
    if (past || !hasSessions) return;
    setSelectedDay(prev => (prev === day ? null : day));
  };

  // 選中日期的場次清單
  const selectedSessions = selectedDay !== null ? getDateSessions(selectedDay) : [];

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
          {t("yearMonth", { year, month })}
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
        {weekdays.map(d => (
          <div key={d} className="text-center text-xs text-tea-text-light py-2 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* 日曆格子 */}
      {loading ? (
        <div className="h-48 flex items-center justify-center text-tea-text-light text-sm">
          {t("loading")}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {/* 空格 */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* 日期格 */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day         = i + 1;
            const daySessions = getDateSessions(day);
            const past        = isPast(day);
            const hasSessions = daySessions.length > 0;
            const isSelected  = selectedDay === day;
            const dots        = daySessions.slice(0, 3);

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day, hasSessions, past)}
                className={`
                  min-h-[44px] sm:min-h-[52px] rounded-lg p-1 flex flex-col items-center border transition-colors
                  ${past
                    ? "border-transparent opacity-40 cursor-default"
                    : hasSessions
                      ? isSelected
                        ? "border-tea-green bg-tea-green-mist/60 ring-2 ring-tea-green cursor-pointer"
                        : "border-tea-green-pale bg-tea-green-mist/30 cursor-pointer hover:bg-tea-green-mist/50"
                      : "border-transparent cursor-default"
                  }
                `}
              >
                {/* 日期數字 */}
                <span className={`text-xs font-medium leading-none mt-1 ${
                  past ? "text-tea-text-light" : isSelected ? "text-tea-green font-bold" : "text-tea-text"
                }`}>
                  {day}
                </span>

                {/* 圓點 */}
                {!past && hasSessions && (
                  <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center">
                    {dots.map((s, idx) => (
                      <span
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR[s.status] ?? "bg-gray-300"}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 選中日期的場次清單 */}
      {selectedDay !== null && (
        <div className="mt-4 border-t border-tea-green-pale pt-4">
          <h4 className="text-sm font-semibold text-tea-text mb-3">
            {t("sessionListTitle", { month, day: selectedDay })}
          </h4>
          <div className="space-y-2">
            {selectedSessions.map(s => {
              const open = s.status === "open";
              const remaining = experience.maxParticipants - s.currentParticipants;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between bg-tea-cream-light rounded-xl px-4 py-3 border border-tea-green-pale/60"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-tea-green shrink-0" />
                      <span className="text-sm font-semibold text-tea-text">
                        {s.startTime.slice(0, 5)}
                      </span>
                      <span className="text-xs text-tea-text-light">
                        {t("duration", { hours: experience.durationHours })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 pl-5">
                      {open ? (
                        <span className="text-xs text-tea-green font-medium">
                          {t("remainingSpots", { count: remaining })}
                        </span>
                      ) : s.status === "full" ? (
                        <span className="text-xs text-tea-text-light bg-tea-text-light/10 px-2 py-0.5 rounded-full">
                          {t("full")}
                        </span>
                      ) : (
                        <span className="text-xs text-red-400 bg-red-50 px-2 py-0.5 rounded-full">
                          {t("cancelled")}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    disabled={!open}
                    onClick={() => router.push(lp(`/experiences/booking/${s.id}`))}
                    className={`text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
                      open
                        ? "bg-tea-green text-white hover:bg-tea-green-dark cursor-pointer"
                        : "bg-tea-text-light/10 text-tea-text-light cursor-not-allowed"
                    }`}
                  >
                    {open ? t("bookBtn") : t("unavailableBtn")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 圖例 */}
      <div className="flex flex-wrap gap-3 sm:gap-4 mt-5 text-xs text-tea-text-light">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-tea-green inline-block" />
          {t("legend.available")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-tea-text-light/40 inline-block" />
          {t("legend.full")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-300 inline-block" />
          {t("legend.cancelled")}
        </span>
      </div>

      {/* 開課門檻提示 */}
      <div className="mt-5 flex items-start gap-2 bg-tea-cream rounded-xl p-4 text-sm text-tea-text-light">
        <Users className="w-4 h-4 text-tea-green mt-0.5 shrink-0" />
        <span>
          {t("minParticipantsNotice", { min: experience.minParticipants })}
          {" "}{t("cancelNotice")}
        </span>
      </div>
    </div>
  );
}
