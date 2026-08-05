import { supabase } from "@/lib/supabase";
import { getLocale, getTranslations } from "next-intl/server";

type ReviewRow = {
  id:         string;
  rating:     number;
  comment:    string | null;
  created_at: string;
  user_id:    string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} viewBox="0 0 20 20" className={`w-4 h-4 ${i <= rating ? "fill-amber-400" : "fill-gray-200"}`}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export default async function ExperienceReviews({ experienceTypeId }: { experienceTypeId: number }) {
  const [{ data: reviews }, t, locale] = await Promise.all([
    supabase
      .from("experience_reviews")
      .select("id, rating, comment, created_at, user_id")
      .eq("experience_type_id", experienceTypeId)
      .eq("is_visible", true)
      .order("created_at", { ascending: false })
      .limit(20),
    getTranslations("experiences"),
    getLocale(),
  ]);

  if (!reviews || reviews.length === 0) return null;

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const dateFmt = locale === "en" ? "en-US" : "zh-TW";

  return (
    <div className="mt-12">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-serif text-xl font-bold text-tea-text">{t("reviewsTitle")}</h2>
        <div className="flex items-center gap-1.5">
          <Stars rating={Math.round(avg)} />
          <span className="text-sm font-medium text-tea-text">{avg.toFixed(1)}</span>
          <span className="text-sm text-tea-text-light">{t("reviewsCount", { count: reviews.length })}</span>
        </div>
      </div>

      <div className="space-y-4">
        {(reviews as ReviewRow[]).map(r => (
          <div key={r.id} className="bg-white rounded-2xl p-5 border border-tea-green-pale/50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Stars rating={r.rating} />
              <span className="text-xs text-tea-text-light">
                {new Date(r.created_at).toLocaleDateString(dateFmt)}
              </span>
            </div>
            {r.comment && (
              <p className="text-sm text-tea-text-light leading-relaxed">{r.comment}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
