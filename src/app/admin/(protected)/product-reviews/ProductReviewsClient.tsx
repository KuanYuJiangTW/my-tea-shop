"use client";

import { useState } from "react";
import { REVIEW_SOURCES, type ReviewSource } from "@/lib/product-review-core";

export type AdminProductReview = {
  id:           string;
  product_id:   number;
  productName:  string;
  rating:       number;
  comment:      string | null;
  source:       ReviewSource;
  display_name: string | null;
  source_note:  string | null;
  reviewed_at:  string;
  is_visible:   boolean;
};

const SOURCE_LABEL: Record<ReviewSource, string> = {
  site:     "站內投稿",
  line:     "LINE",
  facebook: "Facebook",
  other:    "其他",
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

const inputClass =
  "w-full rounded-xl border border-tea-cream-dark bg-white px-3 py-2 text-sm text-tea-text " +
  "focus:border-tea-green focus:outline-none focus:ring-1 focus:ring-tea-green";

/**
 * 商品評價管理。
 *
 * 新增表單裡 `來源` 是必填的下拉，不是自由文字——手動建檔的口碑一律不是站內投稿，
 * 前台會據此標明出處。這是刻意的誠實設計（design.md D2），請不要為了省事改成
 * 預設 site。
 */
export default function ProductReviewsClient({
  products,
  initialReviews,
}: {
  products: { id: number; name: string }[];
  initialReviews: AdminProductReview[];
}) {
  const [reviews, setReviews]     = useState(initialReviews);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);

  const [productId,   setProductId]   = useState<number | "">(products[0]?.id ?? "");
  const [rating,      setRating]      = useState(5);
  const [comment,     setComment]     = useState("");
  const [displayName, setDisplayName] = useState("");
  const [source,      setSource]      = useState<ReviewSource>("line");
  const [sourceNote,  setSourceNote]  = useState("");
  const [reviewedAt,  setReviewedAt]  = useState("");

  const visible = reviews.filter(r => r.is_visible).length;

  async function toggleVisibility(id: string, is_visible: boolean) {
    setProcessing(id);
    setError(null);
    const res = await fetch(`/api/admin/reviews/${id}?type=product`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ is_visible }),
    });
    setProcessing(null);
    if (res.ok) {
      setReviews(prev => prev.map(r => (r.id === id ? { ...r, is_visible } : r)));
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.detail ?? j.error ?? "更新失敗");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (productId === "") return;
    setSaving(true);
    setError(null);

    const payload = {
      product_id:   productId,
      rating,
      comment:      comment.trim() || null,
      display_name: displayName.trim() || null,
      source,
      source_note:  sourceNote.trim() || null,
      reviewed_at:  reviewedAt || null,
    };

    const res = await fetch("/api/admin/product-reviews", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    setSaving(false);

    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j.detail ?? j.error ?? "新增失敗");
      return;
    }

    setReviews(prev => [
      {
        id:           j.id as string,
        product_id:   productId,
        productName:  products.find(p => p.id === productId)?.name ?? `#${productId}`,
        rating,
        comment:      payload.comment,
        source,
        display_name: payload.display_name,
        source_note:  payload.source_note,
        reviewed_at:  reviewedAt || new Date().toISOString().slice(0, 10),
        is_visible:   true,
      },
      ...prev,
    ]);
    setComment("");
    setDisplayName("");
    setSourceNote("");
    setReviewedAt("");
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-tea-text">商品評價</h1>
        <p className="text-sm text-tea-text-light mt-1">
          共 {reviews.length} 則，{visible} 則顯示中，{reviews.length - visible} 則已下架
          ＊同一款茶要滿 3 則才會在前台顯示平均星等
        </p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2">{error}</p>
      )}

      {/* 新增 */}
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl border border-tea-cream-dark shadow-sm p-5 mb-6 space-y-4"
      >
        <p className="font-medium text-tea-text text-sm">新增評價</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-xs text-tea-text-light">商品</span>
            <select
              value={productId}
              onChange={e => setProductId(Number(e.target.value))}
              className={inputClass}
              required
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-tea-text-light">星等</span>
            <select
              value={rating}
              onChange={e => setRating(Number(e.target.value))}
              className={inputClass}
            >
              {[5, 4, 3, 2, 1].map(n => (
                <option key={n} value={n}>{"★".repeat(n)}（{n}）</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-tea-text-light">來源（必填）</span>
            <select
              value={source}
              onChange={e => setSource(e.target.value as ReviewSource)}
              className={inputClass}
              required
            >
              {REVIEW_SOURCES.map(s => (
                <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-xs text-tea-text-light">評價內容</span>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="顧客原話，不要改寫"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-xs text-tea-text-light">顯示名稱</span>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className={inputClass}
              placeholder="王小姐"
            />
          </label>

          <label className="block">
            <span className="text-xs text-tea-text-light">原始出處（只給後台看）</span>
            <input
              value={sourceNote}
              onChange={e => setSourceNote(e.target.value)}
              className={inputClass}
              placeholder="2026-07-12 LINE 對話"
            />
          </label>

          <label className="block">
            <span className="text-xs text-tea-text-light">評價日期</span>
            <input
              type="date"
              value={reviewedAt}
              onChange={e => setReviewedAt(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving || products.length === 0}
          className="rounded-full bg-tea-green px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-tea-green-dark disabled:opacity-50"
        >
          {saving ? "新增中…" : "新增評價"}
        </button>
      </form>

      {/* 列表 */}
      {reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-tea-cream-dark p-12 text-center text-sm text-tea-text-light">
          尚無商品評價
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div
              key={r.id}
              className={`bg-white rounded-2xl border border-tea-cream-dark shadow-sm p-5 ${!r.is_visible ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <Stars rating={r.rating} />
                    <span className="text-xs font-medium text-tea-text">{r.productName}</span>
                    <span className="text-[10px] bg-tea-green-mist text-tea-green px-2 py-0.5 rounded-full">
                      {SOURCE_LABEL[r.source]}
                    </span>
                    {r.display_name && (
                      <span className="text-xs text-tea-text-light">{r.display_name}</span>
                    )}
                    {!r.is_visible && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">已下架</span>
                    )}
                  </div>
                  {r.comment ? (
                    <p className="text-sm text-tea-text-light leading-relaxed">{r.comment}</p>
                  ) : (
                    <p className="text-xs text-[#A8C0AE] italic">無文字評論</p>
                  )}
                  <p className="text-xs text-[#A8C0AE] mt-2">
                    {r.reviewed_at}
                    {r.source_note && <span className="ml-2">出處：{r.source_note}</span>}
                  </p>
                </div>
                <button
                  onClick={() => toggleVisibility(r.id, !r.is_visible)}
                  disabled={processing === r.id}
                  className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
                    r.is_visible
                      ? "border border-red-200 text-red-500 hover:bg-red-50"
                      : "border border-tea-green-pale text-tea-text-light hover:bg-tea-green-mist"
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
