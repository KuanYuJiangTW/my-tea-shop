"use client";

import { useState, useEffect } from "react";
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
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  /**
   * 場次資料連同「它屬於哪個月」一起存，loading 就能在 render 時推導出來，
   * 不需要另一個 state 也不需要在 effect 裡同步 setLoading。
   *
   * 原本的寫法是 effect 呼叫 fetchSessions()，而該函式開頭同步 setLoading(true)
   * ——那會觸發連鎖 render（`react-hooks/set-state-in-effect`）。順帶修掉一個
   * 潛在的競態：原本沒有取消機制，快速切換月份時慢的回應可能覆蓋掉新的月份資料。
   */
  /**
   * 「已有 N 人想在這天開課」的需求標記。只有聚合數字，沒有個資。
   * 抓不到就當沒有——這是附加訊號，不該讓月曆壞掉。
   */
  const [demand, setDemand] = useState<{ date: string; startTime: string; headcount: number; requestCount: number }[]>([]);

  const [fetched, setFetched] = useState<{ key: string; sessions: ExperienceSession[] }>({
    key: "",
    sessions: [],
  });

  const monthKey = `${experience.slug}:${year}-${month}`;
  const loading  = fetched.key !== monthKey;
  const sessions = loading ? [] : fetched.sessions;

  useEffect(() => {
    let cancelled = false;
    const key = `${experience.slug}:${year}-${month}`;

    fetch(`/api/experience-sessions?slug=${experience.slug}&year=${year}&month=${month}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setFetched({ key, sessions: Array.isArray(data) ? data : [] });
      })
      .catch(() => {
        if (!cancelled) setFetched({ key, sessions: [] });
      });

    return () => { cancelled = true; };
  }, [experience.slug, year, month]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/experience-requests/demand?slug=${experience.slug}&year=${year}&month=${month}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setDemand(Array.isArray(d) ? d : []); })
      .catch(() => { if (!cancelled) setDemand([]); });
    return () => { cancelled = true; };
  }, [experience.slug, year, month]);

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

  const dateStrOf = (day: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const getDateSessions = (day: number) => {
    const dateStr = dateStrOf(day);
    return sessions.filter(s => s.sessionDate === dateStr);
  };

  const getDateDemand = (day: number) => {
    const dateStr = dateStrOf(day);
    return demand.filter(d => d.date === dateStr);
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
  const selectedDemand   = selectedDay !== null ? getDateDemand(selectedDay) : [];
  const selectedDateStr  = selectedDay !== null ? dateStrOf(selectedDay) : "";

  return (
    <div>
      {/* 月份導航 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="p-2 rounded-pill hover:bg-tea-green-mist transition-colors duration-base ease-standard"
        >
          <ChevronLeft className="w-5 h-5 text-tea-text" />
        </button>
        <h3 className="font-serif text-lg font-bold text-tea-text">
          {t("yearMonth", { year, month })}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 rounded-pill hover:bg-tea-green-mist transition-colors duration-base ease-standard"
        >
          <ChevronRight className="w-5 h-5 text-tea-text" />
        </button>
      </div>

      {/* 星期標題 */}
      <div className="grid grid-cols-7 mb-2">
        {weekdays.map(d => (
          <div key={d} className="text-center text-caption text-tea-text-light py-2 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* 日曆格子 */}
      {loading ? (
        <div className="h-48 flex items-center justify-center text-tea-text-light text-label">
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
            const dayDemand   = getDateDemand(day);
            const isSelected  = selectedDay === day;
            const dots        = daySessions.slice(0, 3);

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day, hasSessions || dayDemand.length > 0, past)}
                className={`
                  min-h-[44px] sm:min-h-[52px] rounded-inline p-1 flex flex-col items-center border transition-colors duration-base ease-standard
                  ${past
                    ? "border-transparent opacity-40 cursor-default"
                    : hasSessions
                      ? isSelected
                        ? "border-tea-green bg-tea-green-mist/60 ring-2 ring-tea-green cursor-pointer"
                        : "border-tea-green-pale bg-tea-green-mist/30 cursor-pointer hover:bg-tea-green-mist/50"
                      : dayDemand.length > 0
                        ? isSelected
                          ? "border-amber-400 bg-amber-50 ring-2 ring-amber-400 cursor-pointer"
                          : "border-amber-200 bg-amber-50/50 cursor-pointer hover:bg-amber-50"
                        : "border-transparent cursor-default"
                  }
                `}
              >
                {/* 日期數字 */}
                <span className={`text-caption font-medium leading-none mt-1 ${
                  past ? "text-tea-text-light" : isSelected ? "text-tea-green font-bold" : "text-tea-text"
                }`}>
                  {day}
                </span>

                {/* 需求標記：空心圓，與既有的三色實心圓點明顯不同 */}
                {!past && !hasSessions && dayDemand.length > 0 && (
                  <span
                    className="mt-1.5 w-1.5 h-1.5 rounded-pill border border-amber-500"
                    aria-hidden="true"
                  />
                )}

                {/* 圓點 */}
                {!past && hasSessions && (
                  <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center">
                    {dots.map((s, idx) => (
                      <span
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-pill ${DOT_COLOR[s.status] ?? "bg-gray-300"}`}
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
          <h4 className="text-label font-semibold text-tea-text mb-3">
            {t("sessionListTitle", { month, day: selectedDay })}
          </h4>
          {/* 已有人想在這天開課——需求可見化本身就會吸引附議 */}
          {selectedDemand.length > 0 && (
            <div className="mb-3 rounded-control bg-amber-50 border border-amber-200 px-4 py-3">
              {selectedDemand.map((d, i) => (
                <p key={i} className="text-caption text-amber-900">
                  {t("demandNote", { time: d.startTime, count: d.headcount })}
                </p>
              ))}
              <a
                href={`?requestDate=${selectedDateStr}&requestTime=${selectedDemand[0].startTime}#open-class-request`}
                className="inline-block mt-2 text-caption font-medium text-tea-green underline"
              >{t("demandJoin")}</a>
            </div>
          )}

          <div className="space-y-2">
            {selectedSessions.map(s => {
              const open = s.status === "open";
              const remaining = experience.maxParticipants - s.currentParticipants;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between bg-tea-cream-light rounded-control px-4 py-3 border border-tea-green-pale/60"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-tea-green shrink-0" />
                      <span className="text-label font-semibold text-tea-text">
                        {s.startTime.slice(0, 5)}
                      </span>
                      <span className="text-caption text-tea-text-light">
                        {t("duration", { hours: experience.durationHours })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 pl-5">
                      {open ? (
                        <span className="text-caption text-tea-green font-medium">
                          {t("remainingSpots", { count: remaining })}
                        </span>
                      ) : s.status === "full" ? (
                        <span className="text-caption text-tea-text-light bg-tea-text-light/10 px-2 py-0.5 rounded-pill">
                          {t("full")}
                        </span>
                      ) : (
                        <span className="text-caption text-red-400 bg-red-50 px-2 py-0.5 rounded-pill">
                          {t("cancelled")}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    disabled={!open}
                    onClick={() => router.push(lp(`/experiences/booking/${s.id}`))}
                    className={`text-label font-medium px-4 py-2 rounded-control transition-colors duration-base ease-standard ${
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
      <div className="flex flex-wrap gap-3 sm:gap-4 mt-5 text-caption text-tea-text-light">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-pill bg-tea-green inline-block" />
          {t("legend.available")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-pill bg-tea-text-light/40 inline-block" />
          {t("legend.full")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-pill bg-red-300 inline-block" />
          {t("legend.cancelled")}
        </span>
      </div>

      {/* 開課門檻提示 */}
      {/* text-body 而非 label：開課門檻與取消規則是交易條件，依原則 2「交易時刻，
          清晰壓倒氣氛」該用可讀的內文級距，不能塞成 14px 的附註 */}
      <div className="mt-5 flex items-start gap-2 bg-tea-cream rounded-inline p-4 text-body text-tea-text-light">
        <Users className="w-4 h-4 text-tea-green mt-0.5 shrink-0" />
        <span>
          {t("minParticipantsNotice", { min: experience.minParticipants })}
          {" "}{t("cancelNotice")}
        </span>
      </div>
    </div>
  );
}
