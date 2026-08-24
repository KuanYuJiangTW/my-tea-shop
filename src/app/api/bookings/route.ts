import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { ECPAY_STAGE } from "@/lib/ecpay-env";

const RL_KEY = (ip: string) => `bookings:${ip}`; // 20 req/min per IP

// POST /api/bookings — 建立預約（付款前，取得 booking id 後導向 ECPay）
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await rateLimit(RL_KEY(ip), 20, 60_000))) {
    return NextResponse.json({ error: "請求過於頻繁，請稍後再試。" }, { status: 429 });
  }

  // 驗證登入狀態
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  // Facebook 只給 public_profile、不給 email，所以 FB 建立的帳號 user.email 是空的。
  // 沒有這道防線的話會一路撞到 experience_bookings.booker_email 的 NOT NULL，
  // 使用者看到的是 Postgres 原文錯誤（500）。預約確認信、行前提醒、取消退款通知
  // 全都寄到這個欄位，所以這裡不接受空值，請他先去會員中心綁定（那裡會寄驗證信）。
  if (!user.email) {
    return NextResponse.json(
      { error: "請先到會員中心設定 Email，我們需要它寄送預約確認信與行前提醒。" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { sessionId, participantCount, bookerName, bookerPhone, dietaryNotes, adultConfirmed } = body;

  if (!sessionId || !participantCount || !bookerName || !bookerPhone) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  // 人數必須為正整數且在合理上限內，避免負數繞過名額檢查並產生負金額
  if (!Number.isInteger(participantCount) || participantCount < 1 || participantCount > 50) {
    return NextResponse.json({ error: "參加人數不正確" }, { status: 400 });
  }

  // 查詢場次資訊
  const { data: session, error: sessionError } = await supabase
    .from("experience_sessions")
    .select("*, experience_types(*)")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "找不到此場次" }, { status: 404 });
  }

  if (session.status !== "open") {
    return NextResponse.json({ error: "此場次已額滿或取消" }, { status: 409 });
  }

  const expType = session.experience_types;

  // 檢查剩餘名額
  const available = expType.max_participants - session.current_participants;
  if (participantCount > available) {
    return NextResponse.json(
      { error: `名額不足，目前剩餘 ${available} 個名額` },
      { status: 409 }
    );
  }

  // 茶果酒需確認成年
  if (expType.requires_adult && !adultConfirmed) {
    return NextResponse.json(
      { error: "請確認所有參加者均已年滿 18 歲" },
      { status: 400 }
    );
  }

  const totalPrice = expType.price * participantCount;

  // 參加者資料截止日（活動前 5 天）
  const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
  const participantsDueAt = new Date(sessionDateTime);
  participantsDueAt.setDate(participantsDueAt.getDate() - 5);

  // 建立預約（status: pending_payment，待付款完成後改 confirmed）
  const { data: booking, error: bookingError } = await supabase
    .from("experience_bookings")
    .insert({
      session_id:          sessionId,
      user_id:             user.id,
      participant_count:   participantCount,
      total_price:         totalPrice,
      status:              "pending_payment",
      booker_name:         bookerName,
      booker_phone:        bookerPhone,
      booker_email:        user.email,
      dietary_notes:       dietaryNotes ?? null,
      adult_confirmed:     adultConfirmed ?? false,
      participants_due_at: participantsDueAt.toISOString(),
      // 只有測試模式才帶這個欄位。正式站永遠不提它——這樣即使
      // add_experience_bookings_is_test.sql 還沒跑，真實結帳也不可能因為
      // 「欄位不存在」而失敗。付款路徑上不接受這種風險
      ...(ECPAY_STAGE ? { is_test: true } : {}),
    })
    .select()
    .single();

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }

  return NextResponse.json({
    bookingId:   booking.id,
    totalPrice,
    sessionDate: session.session_date,
    startTime:   session.start_time,
    experience:  expType.name,
  });
}
