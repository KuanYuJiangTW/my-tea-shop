import { supabase } from "@/lib/supabase";
import AdminReviewsClient from "./AdminReviewsClient";

export default async function AdminReviewsPage() {
  const { data: reviews } = await supabase
    .from("experience_reviews")
    .select(`
      id, rating, comment, is_visible, created_at, user_id,
      experience_types(name)
    `)
    .order("created_at", { ascending: false });

  return (
    <AdminReviewsClient
      reviews={(reviews ?? []) as unknown as Parameters<typeof AdminReviewsClient>[0]["reviews"]}
    />
  );
}
