import { createClient } from "next-sanity";

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset:   process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn:    true,  // 已發佈內容用 CDN 加速
});

// 查詢快取設定（Next.js 15 fetch cache）
export const sanityFetch = <T>(
  query: string,
  params?: Record<string, unknown>,
): Promise<T> =>
  sanityClient.fetch<T>(query, params ?? {}, {
    next: { revalidate: 3600 }, // 1 小時重新驗證
  });
