import { NextRequest, NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";
import { taipeiToday } from "@/lib/experience-ordering";

/**
 * 體驗的排序與季節維護。
 *
 * 排序鍵是「釘選中 → 季節中 → sort_order → id」，這支只負責寫入後兩個
 * 可調的部分；季節中與否由 experience_availability_windows 決定，不需要
 * 也不應該手動標記。
 */

/** 欄位／資料表還沒建好（未執行 supabase/add_experience_ordering.sql） */
const UNDEFINED_COLUMN = "42703";
const UNDEFINED_TABLE   = "42P01";
/** EXCLUDE 約束擋下重疊的區間 */
const EXCLUSION_VIOLATION = "23P01";

const NOT_MIGRATED = NextResponse.json(
  { error: "排序欄位尚未建立，請先在 Supabase SQL editor 執行 supabase/add_experience_ordering.sql" },
  { status: 503 },
);

function isNotMigrated(code?: string) {
  return code === UNDEFINED_COLUMN || code === UNDEFINED_TABLE;
}

// ─── GET：體驗清單（含排序、釘選、季節區間）──────────────────────────────
export const GET = withAdminAuth(async () => {
  const { data, error } = await supabase
    .from("experience_types")
    .select("id, slug, name, name_en, price, is_active, sort_order, pinned_until, " +
            "experience_availability_windows(id, start_date, end_date, note)")
    .order("id");

  if (error) return isNotMigrated(error.code) ? NOT_MIGRATED
    : NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ today: taipeiToday(), types: data });
});

// ─── PATCH：重排順序，或設定／清除釘選 ───────────────────────────────────
export const PATCH = withAdminAuth(async (req: NextRequest) => {
  const body = await req.json();

  // 1) 重排：前端送完整的 id 順序，後端重新編號。
  //    比「跟鄰居交換」穩健——不會因為兩筆 sort_order 相同而卡住，
  //    也不必處理中間有空洞的情況。
  if (Array.isArray(body.order)) {
    const ids = body.order;
    if (!ids.every((id: unknown) => Number.isInteger(id))) {
      return NextResponse.json({ error: "順序內容不正確" }, { status: 400 });
    }

    for (const [index, id] of ids.entries()) {
      const { error } = await supabase
        .from("experience_types")
        .update({ sort_order: (index + 1) * 10 })
        .eq("id", id);
      if (error) return isNotMigrated(error.code) ? NOT_MIGRATED
        : NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, count: ids.length });
  }

  // 2) 釘選：到期日必填且不得早於今天。
  //    刻意不提供「永久釘選」——沒有到期日的置頂將來一定會忘記撤下，
  //    見 design.md D2。要取消釘選就傳 null。
  if ("pinnedUntil" in body) {
    const { id, pinnedUntil } = body;
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "缺少體驗 id" }, { status: 400 });
    }

    if (pinnedUntil !== null) {
      if (typeof pinnedUntil !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(pinnedUntil)) {
        return NextResponse.json({ error: "請指定釘選的到期日" }, { status: 400 });
      }
      if (pinnedUntil < taipeiToday()) {
        return NextResponse.json({ error: "到期日不能早於今天" }, { status: 400 });
      }
    }

    const { error } = await supabase
      .from("experience_types")
      .update({ pinned_until: pinnedUntil })
      .eq("id", id);

    if (error) return isNotMigrated(error.code) ? NOT_MIGRATED
      : NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "沒有可執行的操作" }, { status: 400 });
});

// ─── POST：新增季節區間 ──────────────────────────────────────────────────
export const POST = withAdminAuth(async (req: NextRequest) => {
  const { experienceTypeId, startDate, endDate, note } = await req.json();

  if (!Number.isInteger(experienceTypeId)) {
    return NextResponse.json({ error: "缺少體驗 id" }, { status: 400 });
  }
  const validDate = (d: unknown) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
  if (!validDate(startDate) || !validDate(endDate)) {
    return NextResponse.json({ error: "請填寫起訖日期" }, { status: 400 });
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: "結束日不能早於開始日" }, { status: 400 });
  }
  if (note !== undefined && note !== null && (typeof note !== "string" || note.length > 200)) {
    return NextResponse.json({ error: "說明過長" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("experience_availability_windows")
    .insert({
      experience_type_id: experienceTypeId,
      start_date: startDate,
      end_date:   endDate,
      note:       note || null,
    })
    .select()
    .single();

  if (error) {
    if (isNotMigrated(error.code)) return NOT_MIGRATED;
    if (error.code === EXCLUSION_VIOLATION) {
      return NextResponse.json(
        { error: "這段期間與同一體驗的既有區間重疊，請先調整或刪除既有區間" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
});

// ─── DELETE：刪除季節區間 ────────────────────────────────────────────────
export const DELETE = withAdminAuth(async (req: NextRequest) => {
  const id = req.nextUrl.searchParams.get("windowId");
  if (!id) return NextResponse.json({ error: "缺少 windowId" }, { status: 400 });

  const { error } = await supabase
    .from("experience_availability_windows")
    .delete()
    .eq("id", id);

  if (error) return isNotMigrated(error.code) ? NOT_MIGRATED
    : NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
});
