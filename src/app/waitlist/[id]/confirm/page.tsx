import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase } from "@/lib/supabase";
import WaitlistConfirmClient from "./WaitlistConfirmClient";

type Props = { params: Promise<{ id: string }> };

export default async function WaitlistConfirmPage({ params }: Props) {
  const { id } = await params;

  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=/waitlist/${id}/confirm`);
  }

  const { data: entry } = await supabase
    .from("waitlist_entries")
    .select(`
      id, booker_name, participant_count, status, confirm_deadline,
      session:experience_sessions(
        session_date, start_time,
        experience_types(name, price)
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!entry) {
    return (
      <div className="min-h-screen bg-tea-cream-light flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-tea-green-pale">
          <p className="text-tea-text font-medium mb-2">找不到此候補記錄</p>
          <p className="text-sm text-tea-text-light">連結可能已失效或不屬於此帳號。</p>
        </div>
      </div>
    );
  }

  return <WaitlistConfirmClient entry={entry as unknown as Parameters<typeof WaitlistConfirmClient>[0]["entry"]} />;
}
