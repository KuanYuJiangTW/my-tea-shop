// 商品評價的純邏輯：來源列舉、輸入驗證、星等彙總。
//
// 這支刻意不 import supabase——`ProductCard` 是 client component，
// 彙總邏輯要能被前台、後台、API 與測試共用而不把 service role client
// 拖進瀏覽器 bundle（同 `bundle-core.ts` / `bundles.ts` 的分法）。

import { checkIntRange, checkText, checkDate, firstError, MAX_TEXT_LEN } from "./validate";

/** 評價來源。`site` = 站內投稿（階段二）；其餘為後台手動建檔的既有口碑。 */
export const REVIEW_SOURCES = ["site", "line", "facebook", "other"] as const;
export type ReviewSource = (typeof REVIEW_SOURCES)[number];

/**
 * 顯示平均星等的門檻。
 *
 * 與體驗頁的 `aggregateRating` 同一個值（`experiences/[slug]/page.tsx`）：
 * 評價數低時顯示平均反而扣分，這是本專案的既定判準，不在商品端另立一套。
 */
export const MIN_REVIEWS_FOR_AVERAGE = 3;

export type ProductReview = {
  id:          string;
  productId:   number;
  rating:      number;
  comment:     string | null;
  source:      ReviewSource;
  displayName: string | null;
  reviewedAt:  string;
};

export type ReviewSummary = {
  count:       number;
  /** 平均星等（一位小數）。未達門檻時仍會算出來，但 `showAverage` 為 false。 */
  average:     number;
  /** 是否可對外顯示平均星等與 `aggregateRating`。 */
  showAverage: boolean;
};

export function isReviewSource(v: unknown): v is ReviewSource {
  return typeof v === "string" && (REVIEW_SOURCES as readonly string[]).includes(v);
}

/** 由一組評價算出彙總。空陣列回傳 count 0、average 0、showAverage false。 */
export function summarizeReviews(reviews: { rating: number }[]): ReviewSummary {
  const count = reviews.length;
  if (count === 0) return { count: 0, average: 0, showAverage: false };
  const average = reviews.reduce((s, r) => s + r.rating, 0) / count;
  return {
    count,
    average: Math.round(average * 10) / 10,
    showAverage: count >= MIN_REVIEWS_FOR_AVERAGE,
  };
}

/**
 * 這筆訂單有沒有買過這款茶。
 *
 * `orders.items` 是 JSONB，同一個陣列裡混著兩種形狀（`api/orders/route.ts` 的註解）：
 *   * 單品：`{ productId, spec, name, quantity, unitPrice, subtotal }`
 *   * 組合：`{ bundleId, name, ..., bundleItems: [{ productId, spec, quantity }] }`
 *
 * **組合也算買過**——品飲組裡的三款茶是真的喝過了，不讓他們留評沒有道理。
 * 規格（150g／75g／茶包）不列入比對：評的是茶，不是包裝。
 */
export function orderContainsProduct(items: unknown, productId: number): boolean {
  if (!Array.isArray(items)) return false;
  return items.some((item) => {
    if (!item || typeof item !== "object") return false;
    const it = item as { productId?: unknown; bundleItems?: unknown };
    if (it.productId === productId) return true;
    return Array.isArray(it.bundleItems)
      && it.bundleItems.some((bi) => (bi as { productId?: unknown })?.productId === productId);
  });
}

/**
 * 這筆訂單裡「可以留評的茶」清單，供會員中心顯示留評入口。
 *
 * 組合會被展開成成分（買品飲組的人評的是裡面那三款茶，不是「品飲組」這個 SKU——
 * `product_reviews.product_id` 指向 `products`，組合沒有對應的列）。
 * 同一款茶在同一筆訂單出現多次（例如單買一包又買了組合）只出現一次。
 */
export function collectOrderProducts(items: unknown): { productId: number; name: string }[] {
  if (!Array.isArray(items)) return [];
  const out: { productId: number; name: string }[] = [];
  const seen = new Set<number>();

  const push = (productId: unknown, name: unknown) => {
    if (typeof productId !== "number" || seen.has(productId)) return;
    seen.add(productId);
    out.push({ productId, name: typeof name === "string" ? name : `#${productId}` });
  };

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const it = item as { productId?: unknown; name?: unknown; bundleItems?: unknown };
    push(it.productId, it.name);
    if (Array.isArray(it.bundleItems)) {
      for (const bi of it.bundleItems) {
        const b = bi as { productId?: unknown; productName?: unknown };
        push(b?.productId, b?.productName);
      }
    }
  }
  return out;
}

export type NewProductReview = {
  product_id:   number;
  rating:       number;
  comment:      string | null;
  source:       ReviewSource;
  display_name: string | null;
  source_note:  string | null;
  reviewed_at:  string | null;
};

/**
 * 後台建檔的輸入驗證。
 *
 * `source` 必填且必須是合法列舉——手動輸入的口碑若不標來源，前台就無從區分它
 * 與站內投稿，那等於偽造站內評價（design.md D2）。
 */
export function validateNewProductReview(
  body: unknown,
): { ok: true; value: NewProductReview } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;

  if (!isReviewSource(b.source)) {
    return { ok: false, error: "來源為必填，且須為 site／line／facebook／other" };
  }

  const err = firstError(
    checkIntRange(b.product_id, "商品", 1, Number.MAX_SAFE_INTEGER, true),
    checkIntRange(b.rating, "星等", 1, 5, true),
    checkText(b.comment, "評價內容", { max: MAX_TEXT_LEN }),
    checkText(b.display_name, "顯示名稱", { max: 100 }),
    checkText(b.source_note, "原始出處", { max: 200 }),
    checkDate(b.reviewed_at, "評價日期"),
  );
  if (err) return { ok: false, error: err };

  const text = (v: unknown) => {
    const t = typeof v === "string" ? v.trim() : "";
    return t.length > 0 ? t : null;
  };

  return {
    ok: true,
    value: {
      product_id:   b.product_id as number,
      rating:       b.rating as number,
      comment:      text(b.comment),
      source:       b.source,
      display_name: text(b.display_name),
      source_note:  text(b.source_note),
      reviewed_at:  text(b.reviewed_at),
    },
  };
}
