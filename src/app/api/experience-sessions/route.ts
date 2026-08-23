import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/experience-sessions?slug=tea-ceremony&year=2026&month=5
// 取得特定體驗類型某月份的所有**公開**場次

/** 欄位不存在。SQL 還沒執行時退回舊查法，不能讓整個月曆變空 */
const UNDEFINED_COLUMN = "42703";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slug  = searchParams.get("slug");
  const year  = searchParams.get("year");
  const month = searchParams.get("month");

  if (!slug || !year || !month) {
    return NextResponse.json(
      { error: "需要提供 slug、year、month 參數" },
      { status: 400 }
    );
  }

  // 取得體驗類型 id
  const { data: expType, error: typeError } = await supabase
    .from("experience_types")
    .select("id, min_participants, max_participants")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (typeError || !expType) {
    return NextResponse.json({ error: "找不到此體驗類型" }, { status: 404 });
  }

  // 查詢該月份所有場次
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate   = new Date(Number(year), Number(month), 0)
    .toISOString()
    .split("T")[0]; // 該月最後一天

  /**
   * **私人場次不得出現在公開月曆。**
   *
   * 核准開課請求時建立的場次先是 private，只有拿到專屬連結的人看得到；
   * 申請人付款後若非包場才轉 public。這一行是最容易在後續重構中被順手拿掉
   * 的一行，回歸測試在 src/__tests__/experiences/session-visibility.test.ts。
   *
   * 兩段式查詢：`visibility` 欄位還沒建好時（SQL 未執行）PostgREST 會回
   * 42703 讓整個查詢失敗，月曆就變空了——products 踩過同一個坑。
   */
  const withVisibility = await supabase
    .from("experience_sessions")
    .select("*")
    .eq("experience_type_id", expType.id)
    .eq("visibility", "public")
    .gte("session_date", startDate)
    .lte("session_date", endDate)
    .order("session_date")
    .order("start_time");

  let sessions = withVisibility.data;

  if (withVisibility.error) {
    if (withVisibility.error.code !== UNDEFINED_COLUMN) {
      return NextResponse.json({ error: withVisibility.error.message }, { status: 500 });
    }
    console.warn(
      "[experience-sessions] visibility 欄位尚未建立，暫時不過濾私人場次。" +
      "請執行 supabase/add_experience_requests.sql",
    );
    const fallback = await supabase
      .from("experience_sessions")
      .select("*")
      .eq("experience_type_id", expType.id)
      .gte("session_date", startDate)
      .lte("session_date", endDate)
      .order("session_date")
      .order("start_time");

    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }
    sessions = fallback.data;
  }

  const result = (sessions ?? []).map((s) => ({
    id:                  s.id,
    experienceTypeId:    s.experience_type_id,
    sessionDate:         s.session_date,
    startTime:           s.start_time,
    status:              s.status,
    currentParticipants: s.current_participants,
    maxParticipants:     expType.max_participants,
    minParticipants:     expType.min_participants,
    availableSpots:      expType.max_participants - s.current_participants,
    cancelReason:        s.cancel_reason ?? undefined,
  }));

  return NextResponse.json(result);
}
