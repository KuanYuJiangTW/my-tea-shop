import { createClient } from "next-sanity";

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset:   process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn:    true,  // 已發佈內容用 CDN 加速
});

/**
 * 所有 Sanity 查詢共用的快取標籤。
 *
 * 為什麼要顯式下 tag，而不是靠 revalidatePath 的隱含標籤：
 * fetch data cache 的鍵只由「請求本身」決定（URL + method + body，見
 * next/dist/server/lib/incremental-cache/index.js 的 generateCacheKey），
 * 同一句 GROQ 不論哪個路由先跑到都共用同一筆快取。而 Next 掛在那筆快取上的
 * 隱含標籤是**第一個寫入它的路由**的路徑（implicit-tags.js 的 getDerivedTags），
 * 所以 ALL_ARTICLES_QUERY 若先由 sitemap.ts 或 /tea-guide 列表頁寫入，
 * revalidatePath("/tea-guide/[slug]", "page") 就清不到它。
 * 顯式 tag 綁在快取條目本身，與哪個路由寫入無關。
 */
export const SANITY_CACHE_TAG = "sanity";

// 查詢快取設定（Next.js fetch data cache）
export const sanityFetch = <T>(
  query: string,
  params?: Record<string, unknown>,
): Promise<T> =>
  sanityClient.fetch<T>(query, params ?? {}, {
    // 1 小時是「webhook 沒送到時的最壞情況」，正常路徑由 webhook 清 SANITY_CACHE_TAG
    next: { revalidate: 3600, tags: [SANITY_CACHE_TAG] },
  });
