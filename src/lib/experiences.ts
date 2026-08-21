import { sortExperiences, taipeiToday } from "@/lib/experience-ordering";
import { supabase } from "@/lib/supabase";
import { sanityFetch } from "@/sanity/client";
import { ALL_EXPERIENCES_QUERY, EXPERIENCE_BY_SLUG_QUERY } from "@/sanity/queries";
import { ExperienceType, ExperienceSession } from "@/types";

// Sanity 回傳的體驗內容型別
export interface AdmissionTier {
  name:           string;
  nameEn?:        string;
  price:          number;   // 0 代表免費
  description?:   string;
  descriptionEn?: string;
}

export interface ExperienceContent {
  slug:            string;
  name:            string;
  nameEn:          string;
  tagline:         string;
  taglineEn?:      string;
  description?:    unknown[];   // Portable Text blocks
  descriptionEn?:  unknown[];
  coverImage:      string | null;
  gallery?:        string[];
  includes:        string[];
  includesEn?:     string[];
  notes:           string[];
  notesEn?:        string[];
  admissionTiers?:   AdmissionTier[];
  seoDescription?:   string;
  seoDescriptionEn?: string;
}

// 靜態備援（Sanity 尚未建立內容時使用）
const FALLBACK_CONTENT: Record<string, Omit<ExperienceContent, "slug" | "name" | "nameEn">> = {
  "tea-ceremony": {
    tagline:    "由專業茶藝師為您泡茶，在阿里山梅山迷人的山景陪伴下，靜心感受台灣高山茶的清甜甘醇。",
    coverImage: "/images/gallery/tea-cup.jpg",
    includes:   ["專業茶藝師全程帶領", "四款精選高山茶品茗", "茶點輕食", "山景茶席位"],
    notes:      ["建議穿著舒適輕便服裝", "場地有高低差，不建議穿高跟鞋"],
  },
  "roasted-tea": {
    tagline:    "親手體驗古早焙茶工藝，用有趣互動的方式了解焙火如何改變茶葉的風味，完成後帶走自己焙的茶。",
    coverImage: "/images/gallery/roasting.jpg",
    includes:   ["焙茶工具與材料", "職人手把手指導", "完成品茶葉帶回", "品茗時間"],
    notes:      ["現場有火源，請勿著易燃材質衣物", "不建議 10 歲以下兒童單獨參加"],
  },
  "tea-picking": {
    tagline:    "漫步茶園，親手採摘嫩芽，感受農人每日清晨的日常，了解好茶從採摘那一刻就開始講究。",
    coverImage: "/images/gallery/picking.jpeg",
    includes:   ["茶園導覽解說", "採茶工具", "採摘茶葉帶回", "清茶招待"],
    notes:      ["建議穿著好行走的鞋子", "雨天仍照常進行，建議自備雨具"],
  },
  "tea-making": {
    tagline:    "從萎凋、揉捻到乾燥，完整體驗紅茶製作的每個步驟，親手完成一批屬於自己的手工紅茶。",
    coverImage: "/images/gallery/rolling.jpg",
    includes:   ["全程製茶材料", "職人師傅指導", "自製紅茶成品帶回（約 30g）", "品茗時間"],
    notes:      ["製程較長（3小時），請保持體力", "建議穿著深色衣物，製茶過程容易沾色"],
  },
  "tea-wine": {
    tagline:    "將茶元素融入傳統浸漬果酒工藝，調配出獨一無二的淺漬茶果酒，帶走一瓶親手製作的茶香美酒。",
    coverImage: "/images/gallery/farm.jpeg",
    includes:   ["所有釀造材料", "調配工具", "成品一瓶帶回（約 300ml）", "試飲時間"],
    notes:      ["本體驗含酒精，限 18 歲以上參加", "孕婦及對酒精過敏者請勿報名"],
  },
};

// ── Sanity 內容 ────────────────────────────────────────────────

export async function getExperienceContents(): Promise<ExperienceContent[]> {
  try {
    const data = await sanityFetch<ExperienceContent[]>(ALL_EXPERIENCES_QUERY);
    if (data && data.length > 0) return data;
  } catch { /* Sanity 未設定時用備援 */ }

  // 備援：從靜態資料產生
  return Object.entries(FALLBACK_CONTENT).map(([slug, c]) => ({
    slug,
    name:      slug,
    nameEn:    slug,
    tagline:   c.tagline,
    coverImage: c.coverImage,
    includes:  c.includes,
    notes:     c.notes,
  }));
}

export async function getExperienceContent(slug: string): Promise<ExperienceContent | null> {
  try {
    const data = await sanityFetch<ExperienceContent>(EXPERIENCE_BY_SLUG_QUERY, { slug });
    if (data) return data;
  } catch { /* 備援 */ }

  const fallback = FALLBACK_CONTENT[slug];
  if (!fallback) return null;
  return { slug, name: slug, nameEn: slug, ...fallback };
}

// ── Supabase 體驗類型 ──────────────────────────────────────────

/**
 * 帶季節區間一起查。這張表可能還不存在（業主尚未執行
 * supabase/add_experience_ordering.sql），所以查詢要能退回沒有它的版本——
 * 見 SELECT_WITH_WINDOWS 上方的說明。
 */
const SELECT_WITH_WINDOWS =
  "*, experience_availability_windows(start_date, end_date, note)";

type WindowRow = { start_date: string; end_date: string; note: string | null };

function mapRow(row: Record<string, unknown>): ExperienceType {
  const windowRows = (row.experience_availability_windows as WindowRow[] | undefined) ?? [];
  return {
    id:              row.id as number,
    slug:            row.slug as string,
    name:            row.name as string,
    nameEn:          row.name_en as string,
    price:           row.price as number,
    durationHours:   row.duration_hours as number,
    maxParticipants: row.max_participants as number,
    minParticipants: row.min_participants as number,
    requiresAdult:   row.requires_adult as boolean,
    isActive:        row.is_active as boolean,
    sortOrder:       (row.sort_order as number | null) ?? null,
    pinnedUntil:     (row.pinned_until as string | null) ?? null,
    windows:         windowRows.map(w => ({
      startDate: w.start_date,
      endDate:   w.end_date,
      note:      w.note ?? undefined,
    })),
  };
}

/**
 * **排序的唯一入口。** 首頁、體驗列表頁、後台一律呼叫這支，不要自己查
 * experience_types 再排——排序規則（釘選 → 季節 → sort_order → id）只有
 * src/lib/experience-ordering.ts 一份。理由見該 change 的 design.md D3。
 *
 * 兩段式查詢是刻意的：季節表與新欄位可能還沒建好（程式先於 SQL 部署），
 * 那時第一段會失敗，退回原本的查法。**壞掉的方向是安全的**——順序退回
 * id 排序，跟現在一模一樣，而不是整頁空白。
 */
export async function getExperienceTypes(): Promise<ExperienceType[]> {
  const withWindows = await supabase
    .from("experience_types")
    .select(SELECT_WITH_WINDOWS)
    .eq("is_active", true)
    .order("id");

  if (!withWindows.error && withWindows.data) {
    return sortExperiences(withWindows.data.map(mapRow), taipeiToday());
  }

  console.warn(
    "[experiences] 季節欄位尚未建立，排序退回 id 順序。" +
    "請執行 supabase/add_experience_ordering.sql。原因：",
    withWindows.error?.message,
  );

  const { data, error } = await supabase
    .from("experience_types")
    .select("*")
    .eq("is_active", true)
    .order("id");

  if (error || !data) return [];
  return data.map(mapRow);
}

export async function getExperienceBySlug(slug: string): Promise<ExperienceType | null> {
  // 詳細頁的季節徽章要用到 windows，所以這裡也帶；同樣要能退回舊查法
  const withWindows = await supabase
    .from("experience_types")
    .select(SELECT_WITH_WINDOWS)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!withWindows.error && withWindows.data) return mapRow(withWindows.data);

  const { data, error } = await supabase
    .from("experience_types")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return mapRow(data);
}

export async function getSessionsForMonth(
  experienceTypeId: number,
  year: number,
  month: number,
): Promise<ExperienceSession[]> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay   = new Date(year, month, 0).getDate();
  const endDate   = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const { data, error } = await supabase
    .from("experience_sessions")
    .select("*")
    .eq("experience_type_id", experienceTypeId)
    .gte("session_date", startDate)
    .lte("session_date", endDate)
    .order("session_date")
    .order("start_time");

  if (error || !data) return [];
  return data.map((s) => ({
    id:                  s.id as string,
    experienceTypeId:    s.experience_type_id as number,
    sessionDate:         s.session_date as string,
    startTime:           s.start_time as string,
    status:              s.status as ExperienceSession["status"],
    currentParticipants: s.current_participants as number,
    waitlistCount:       (s.waitlist_count as number) ?? 0,
    cancelReason:        s.cancel_reason as string | undefined,
  }));
}
