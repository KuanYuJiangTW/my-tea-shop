import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/experiences — 取得所有啟用中的體驗類型
export async function GET() {
  const { data, error } = await supabase
    .from("experience_types")
    .select("*")
    .eq("is_active", true)
    .order("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // snake_case → camelCase
  const experiences = data.map((row) => ({
    id:              row.id,
    slug:            row.slug,
    name:            row.name,
    nameEn:          row.name_en,
    price:           row.price,
    durationHours:   row.duration_hours,
    maxParticipants: row.max_participants,
    minParticipants: row.min_participants,
    requiresAdult:   row.requires_adult,
    isActive:        row.is_active,
  }));

  return NextResponse.json(experiences);
}
