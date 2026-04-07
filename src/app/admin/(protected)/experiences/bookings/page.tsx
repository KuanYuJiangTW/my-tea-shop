import { supabase } from "@/lib/supabase";
import AdminBookingsClient from "./AdminBookingsClient";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; status?: string }>;
}) {
  const sp        = await searchParams;
  const sessionId = sp.session;
  const status    = sp.status ?? "confirmed";

  let query = supabase
    .from("experience_bookings")
    .select(`
      id, booker_name, booker_phone, booker_email,
      participant_count, total_price, status,
      dietary_notes, created_at, participants_due_at,
      refund_amount, refund_status, cancelled_at, cancellation_reason,
      session:experience_sessions(
        session_date, start_time,
        experience_types(name)
      ),
      participants:booking_participants(id)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (sessionId) query = query.eq("session_id", sessionId);
  if (status !== "all") query = query.eq("status", status);

  const { data: bookings } = await query;

  return (
    <AdminBookingsClient
      key={`${status ?? "confirmed"}-${sessionId ?? "all"}`}
      bookings={(bookings ?? []) as unknown as Parameters<typeof AdminBookingsClient>[0]["bookings"]}
      sessionId={sessionId}
      status={status}
    />
  );
}
