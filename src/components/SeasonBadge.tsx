import { getLocale, getTranslations } from "next-intl/server";
import { CalendarClock } from "lucide-react";

import { seasonState, taipeiToday, type AvailabilityWindow } from "@/lib/experience-ordering";

/**
 * 季節狀態徽章。
 *
 * 稀缺性是季節限定體驗最強的轉換武器，而且它是真的——所以倒數要顯示實際
 * 天數，不做「限時搶購」那種製造出來的急迫感。四種狀態的判斷全部在
 * `seasonState()`，這裡只負責挑文案與樣式，**不要在這裡再算日期**。
 *
 * 末日當天不顯示「剩 0 天」（讀起來像已經結束），改成「今天是最後一天」。
 */
interface Props {
  windows?: AvailabilityWindow[];
  /** 用於 aria-label，讓讀螢幕的人知道是哪一款體驗的季節 */
  name: string;
  className?: string;
}

export default async function SeasonBadge({ windows, name, className = "" }: Props) {
  const state = seasonState(windows, taipeiToday());
  if (state.kind === "none") return null;

  const [t, locale] = await Promise.all([
    getTranslations("experiences.season"),
    getLocale(),
  ]);

  // 「2026-10-11」→ 中文 10/11、英文 Oct 11。年份省略：季節區間都在同一年內，
  // 寫出年份只會佔掉徽章寬度
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-TW", {
      month: locale === "en" ? "short" : "numeric",
      day:   "numeric",
    }).format(new Date(Date.UTC(y, m - 1, d)));
  };

  const { label, tone } = (() => {
    switch (state.kind) {
      case "in-season":
        return state.daysLeft === 0
          ? { label: t("lastDay"), tone: "bg-amber-500 text-white" }
          : {
              label: t("inSeason", { endsOn: fmt(state.endsOn), daysLeft: state.daysLeft }),
              tone:  "bg-cta-visit text-white",
            };
      case "upcoming":
        return {
          label: t("upcoming", { startsOn: fmt(state.startsOn) }),
          tone:  "bg-tea-cream text-tea-text border border-cta-visit-line",
        };
      case "ended":
        return { label: t("ended"), tone: "bg-tea-text-light/15 text-tea-text-muted" };
    }
  })();

  return (
    <span
      aria-label={`${t("badgeAriaLabel", { name })}｜${label}`}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${tone} ${className}`}
    >
      <CalendarClock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
