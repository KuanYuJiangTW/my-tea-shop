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
  // 3 小時場客人做的是**揉捻與靜置發酵**：採摘與日光萎凋在他抵達前由業主完成，
  // 烘乾也是業主做，成品事後寄出。原本這裡寫「從萎凋、揉捻到乾燥，完整體驗每個
  // 步驟」與「成品帶回」，三件事都與實際不符——備援一旦頂上來就是對客人講錯話
  "tea-making": {
    tagline:    "紅茶的滋味是在揉捻與發酵這一段長出來的。茶菁我們先採好、曬好，這 3 小時你專心做這一段，烘乾之後把成品寄給你。",
    coverImage: "/images/gallery/rolling.jpg",
    includes:   [
      "揉捻與靜置發酵全程實作",
      "茶菁已由我們採摘、完成日光萎凋",
      "製茶材料全程提供",
      "茶農全程示範與講解",
      "你做的那批由我們烘乾後寄出（約 30g）",
      "一起泡我們自己做的茶：蜜香紅茶、金萱、烏龍等，依當天有的，邊喝邊講風味差別",
    ],
    notes:      [
      "這一場做的是揉捻與靜置發酵；採摘與日光萎凋在你抵達前完成，烘乾也由我們處理",
      "成品不當天帶走——烘乾需要時間，我們通常隔天寄出，最慢 2–3 天內。台灣本島寄到同一個地址免運費；要分開寄到不同地址、或寄到海外，我們再跟你說費用",
      "建議穿著深色衣物，揉捻過程容易沾色",
      "全程約 3 小時，請預留充裕時間",
    ],
  },
  "tea-wine": {
    tagline:    "將茶元素融入傳統浸漬果酒工藝，調配出獨一無二的淺漬茶果酒，帶走一瓶親手製作的茶香美酒。",
    coverImage: "/images/gallery/farm.jpeg",
    includes:   ["所有釀造材料", "調配工具", "成品一瓶帶回（約 350ml）", "試飲時間"],
    notes:      ["本體驗含酒精，限 18 歲以上參加", "孕婦及對酒精過敏者請勿報名"],
  },
  // Sanity 掛掉時的備援。沒有這一筆，該頁會直接 404——
  // getExperienceContent 查不到內容就回 null，詳細頁 notFound()
  "cattle-egret-tour": {
    // 這句刻意不提「推廣是誰開始的」：萬鷺朝鳳是「梅山太興村賞黃頭鷺景觀平台停車場」
    // 與附近幾戶鄰居的觀景平台一起推起來的，不是哪一家的功勞（業主 2026-08-31 更正）。
    // 那段歷史寫在攻略文的「這件事是怎麼開始的」，tagline 的位置留給賣點
    tagline:    "秋季限定・停車、洗手間、茶席、賞鳥都在同一個地方，由在這裡種了四十年茶的一家人帶你看",
    coverImage: "/images/gallery/picking2.jpg",
    // 「現場有洗手間」「7 個車位」「視野無電線」三項是刻意寫進包含項目而不是
    // 只寫在注意事項裡：Google AI 模式（2026-08-23）把隔壁免費平台的
    // 「車位僅 5 個、無洗手間、可能拍到電線」寫得清清楚楚，我們這三張牌
    // 卻一張都沒被寫出來。AI 抓包含項目的權重高於注意事項
    includes:   [
      "專業在地嚮導全程帶領（約 90 分鐘）",
      "萬鷺朝鳳生態解說手冊一份",
      "看鳥茶位：遮蔭座位，坐到鳥群散去",
      "手工山泉愛玉乙份",
      "冷泡高山茶一罐",
      "停車免費（7 個車位，現場有洗手間）",
      "茶山步道清潔費",
    ],
    notes:      [
      "集合地點：信淳茶居（本身就是停車場，7 個車位），車子可以開到門口，適合推嬰兒車與長輩",
      "現場有洗手間與遮蔭座位——賞鳥要待上兩三個小時，這是帶長輩與小孩的人最需要知道的一件事",
      "觀景視野沒有電線橫過，長焦取景不必閃避",
      "本活動限定期間：8 月 22 日至 10 月 11 日（依鷺鳥族群實際抵達狀況可能微調）",
      "導覽下午 2 點開始，請準時抵達。黃頭鷺從下午 2 點左右陸續出現，3 點到傍晚 6 點最壯觀",
      "遇雨可免費改期一次，不退費",
      "請勿使用空拍機追逐鳥群，以保護野生動物棲息環境",
    ],
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
    acceptsRequests:   (row.accepts_requests as boolean | undefined) ?? false,
    requestMinSlots:   (row.request_min_slots as number | null) ?? null,
    requestLeadDays:   (row.request_lead_days as number | null) ?? null,
    requestStartTimes: (row.request_start_times as string[] | undefined) ?? undefined,
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

  // 目前沒有呼叫端（公開月曆走 /api/experience-sessions），但先把 visibility
  // 過濾補上——將來若有人接上這支，不該因為漏了一行就把私人場次公開出去。
  // 過濾的權威版本與退路在 src/app/api/experience-sessions/route.ts
  const { data, error } = await supabase
    .from("experience_sessions")
    .select("*")
    .eq("experience_type_id", experienceTypeId)
    .eq("visibility", "public")
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
