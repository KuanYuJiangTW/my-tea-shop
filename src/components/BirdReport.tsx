import { getLocale, getTranslations } from "next-intl/server";

import { getLatestBirdReport } from "@/lib/bird-report";
import { visibleBirdReport } from "@/lib/bird-report-core";
import { getExperienceBySlug } from "@/lib/experiences";

/**
 * 今日鳥況——對外顯示。
 *
 * 客人最怕的不是花錢，是開一小時山路上來卻沒看到鳥。這一行字是唯一能消掉
 * 那個顧慮的東西，而且只有住在賞鳥起點的人給得出來。
 *
 * 三個條件（有內容、48 小時內、季節內）任一不成立就**完全不算繪**——
 * 不留空區塊、不顯示「暫無資料」。空的欄位會讓人覺得站在維護中；
 * 什麼都沒有的話，讀者根本不知道曾經有這個東西。
 *
 * 資料表還沒建立時（業主尚未執行 supabase/add_bird_report.sql）同樣靜默略過，
 * 訪客不需要知道站方的 SQL 還沒跑。
 */

/** 鳥況綁在這款體驗的季節區間上——日期只有一個真相來源 */
const EGRET_SLUG = "cattle-egret-tour";

export default async function BirdReport() {
  const [{ report }, exp, locale, t] = await Promise.all([
    getLatestBirdReport(),
    getExperienceBySlug(EGRET_SLUG),
    getLocale(),
    getTranslations("birdReport"),
  ]);

  const visible = visibleBirdReport(report, exp?.windows, new Date());
  if (!visible) return null;

  const isEn = locale === "en";
  // 時間一律顯示：「鳥況良好」是宣稱，「8/30 傍晚：鳥況良好」是回報。
  // 讀者要能自己判斷這則還準不準——這也是 48 小時可以放到這麼長的前提
  const when = new Intl.DateTimeFormat(isEn ? "en-US" : "zh-TW", {
    month: isEn ? "short" : "numeric",
    day:   "numeric",
    hour:  "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Taipei",
  }).format(new Date(visible.reportedAt));

  return (
    <section className="rounded-2xl border border-tea-green-pale bg-tea-cream/60 p-5">
      <div className="flex items-center gap-2 mb-2">
        <span
          aria-hidden="true"
          className="inline-block w-2 h-2 rounded-full bg-tea-green-ink shrink-0"
        />
        <h3 className="text-label font-medium text-tea-text">{t("title")}</h3>
        <span className="text-caption text-tea-text-muted">{when}</span>
      </div>
      {/* 業主寫的原文，中英文頁都一樣——他的口吻本身就是最有說服力的部分 */}
      <p className="text-body text-tea-text leading-relaxed">{visible.note}</p>
      <p className="text-caption text-tea-text-muted mt-2">{t("byline")}</p>
    </section>
  );
}
