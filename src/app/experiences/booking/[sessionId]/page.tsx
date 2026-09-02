import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase } from "@/lib/supabase";
import BookingFlow from "./BookingFlow";
import { ExperienceSession, ExperienceType } from "@/types";

type Props = { params: Promise<{ sessionId: string }> };

export default async function BookingPage({ params }: Props) {
  const { sessionId } = await params;

  // 驗證登入（未登入導向登入頁）
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirect=/experiences/booking/${sessionId}`);
  }

  // 取得場次 + 體驗類型
  const { data: session, error } = await supabase
    .from("experience_sessions")
    .select("*, experienceType:experience_types(*)")
    .eq("id", sessionId)
    .single();

  if (error || !session) notFound();

  if (session.status === "cancelled") {
    redirect(`/experiences/${session.experienceType.slug}?error=unavailable`);
  }

  // 將 snake_case 轉為 camelCase
  const exp = session.experienceType;
  const experienceType: ExperienceType = {
    id:              exp.id,
    slug:            exp.slug,
    name:            exp.name,
    nameEn:          exp.name_en,
    price:           exp.price,
    durationHours:   exp.duration_hours,
    maxParticipants: exp.max_participants,
    minParticipants: exp.min_participants,
    requiresAdult:   exp.requires_adult,
    isActive:        exp.is_active,
  };

  const sessionData: ExperienceSession & { experienceType: ExperienceType } = {
    id:                  session.id,
    experienceTypeId:    session.experience_type_id,
    sessionDate:         session.session_date,
    startTime:           session.start_time,
    status:              session.status,
    currentParticipants: session.current_participants,
    waitlistCount:       session.waitlist_count ?? 0,
    experienceType,
  };

  return (
    <div className="min-h-screen bg-tea-cream-light py-10 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="text-tea-green-ink text-xs tracking-[0.3em] uppercase mb-2">Booking</p>
          <h1 className="font-serif text-3xl md:text-4xl font-normal text-tea-text">預約體驗</h1>
        </div>
        <BookingFlow session={sessionData} userEmail={user.email ?? null} />
      </div>
    </div>
  );
}
