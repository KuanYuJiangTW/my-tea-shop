import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/admin-auth-guard";
import { getLatestBirdReport, insertBirdReport } from "@/lib/bird-report";
import { visibleBirdReport } from "@/lib/bird-report-core";
import { getExperienceBySlug } from "@/lib/experiences";
import { hasSeason, isInSeason, taipeiToday } from "@/lib/experience-ordering";

/**
 * 今日鳥況回報的後台 API。
 *
 * `GET` 回「最新一則是什麼、它現在有沒有在對外顯示、為什麼」——業主打開頁面的
 * 第一個問題永遠是「現在網站上寫的是什麼」。沒有這個，他會因為不確定而重複送出。
 *
 * `POST` 建立新的一則（不是更新舊的）。送錯了補送一則就蓋過去。
 */

/** 鳥況綁在這款體驗的季節區間上——日期只有一個真相來源 */
const EGRET_SLUG = "cattle-egret-tour";

const NOT_MIGRATED = NextResponse.json(
  { error: "鳥況資料表尚未建立，請先在 Supabase SQL editor 執行 supabase/add_bird_report.sql" },
  { status: 503 },
);

/** 業主看得懂的狀態，不是內部代號 */
type Status = "showing" | "expired" | "offSeason" | "none";

async function egretWindows() {
  const exp = await getExperienceBySlug(EGRET_SLUG);
  return exp?.windows;
}

export const GET = withAdminAuth(async () => {
  const { report, notMigrated } = await getLatestBirdReport();
  if (notMigrated) return NOT_MIGRATED;

  const windows = await egretWindows();
  const today   = taipeiToday();

  let status: Status = "none";
  if (report) {
    if (visibleBirdReport(report, windows, new Date())) status = "showing";
    else if (hasSeason(windows) && !isInSeason(windows, today)) status = "offSeason";
    else status = "expired";
  } else if (hasSeason(windows) && !isInSeason(windows, today)) {
    status = "offSeason";
  }

  return NextResponse.json({ report, status });
});

export const POST = withAdminAuth(async (req: NextRequest) => {
  const body = await req.json().catch(() => null) as { note?: unknown } | null;
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!note) {
    return NextResponse.json({ error: "請先寫一行鳥況再送出" }, { status: 400 });
  }
  // 與資料表的 CHECK 一致。前端也擋，但 API 不能只靠前端擋
  if (note.length > 500) {
    return NextResponse.json({ error: "太長了，請控制在 500 字以內" }, { status: 400 });
  }

  const result = await insertBirdReport(note);
  if (!result.ok) {
    if (result.notMigrated) return NOT_MIGRATED;
    return NextResponse.json({ error: result.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});
