"use client";

import { useState } from "react";

type Review = {
  id:         string;
  rating:     number;
  comment:    string | null;
  is_visible: boolean;
  created_at: string;
  user_id:    string;
  experience_types: { name: string } | null;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} viewBox="0 0 20 20" className={`w-3.5 h-3.5 ${i <= rating ? "fill-amber-400" : "fill-gray-200"}`}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export default function AdminReviewsClient({ reviews: initial }: { reviews: Review[] }) {
  const [reviews, setReviews] = useState(initial);
  const [processing, setProcessing] = useState<string | null>(null);

  async function toggleVisibility(id: string, is_visible: boolean) {
    setProcessing(id);
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ is_visible }),
    });
    setProcessing(null);
    if (res.ok) {
      setReviews(prev => prev.map(r => r.id === id ? { ...r, is_visible } : r));
    }
  }

  const visible  = reviews.filter(r => r.is_visible).length;
  const hidden   = reviews.filter(r => !r.is_visible).length;

  return (
    <div className="p-6 md:p-8 min-h-screen bg-[#F9F6F1]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#3D4A42] font-serif">評價管理</h1>
        <p className="text-sm text-[#6B8872] mt-0.5">
          共 {reviews.length} 則評價，{visible} 則顯示中，{hidden} 則已下架
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-12 text-center text-sm text-[#6B8872]">
          尚無評價紀錄
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div
              key={r.id}
              className={`bg-white rounded-2xl border border-[#EDE8DC] shadow-sm p-5 ${!r.is_visible ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <Stars rating={r.rating} />
                    <span className="text-xs font-medium text-[#3D4A42]">
                      {r.experience_types?.name ?? "—"}
                    </span>
                    {!r.is_visible && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">已下架</span>
                    )}
                  </div>
                  {r.comment ? (
                    <p className="text-sm text-[#6B8872] leading-relaxed">{r.comment}</p>
                  ) : (
                    <p className="text-xs text-[#A8C0AE] italic">無文字評論</p>
                  )}
                  <p className="text-xs text-[#A8C0AE] mt-2">
                    {new Date(r.created_at).toLocaleDateString("zh-TW")}
                  </p>
                </div>
                <button
                  onClick={() => toggleVisibility(r.id, !r.is_visible)}
                  disabled={processing === r.id}
                  className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
                    r.is_visible
                      ? "border border-red-200 text-red-500 hover:bg-red-50"
                      : "border border-[#C8DDD0] text-[#6B8872] hover:bg-[#EBF3EE]"
                  }`}
                >
                  {processing === r.id ? "處理中…" : r.is_visible ? "下架" : "恢復顯示"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
