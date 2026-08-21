import { sanityFetch } from "@/sanity/client";
import { ALL_ARTICLES_QUERY, ARTICLE_BY_SLUG_QUERY } from "@/sanity/queries";

/**
 * 茶知識文章的讀取層。
 *
 * 沒有靜態備援（不像 experiences 的 FALLBACK_CONTENT）——文章完全由 Sanity
 * 產生，Sanity 掛掉時列表為空、單篇 404，而不是顯示過時的硬編內容。
 */

export interface ArticleSection {
  heading:       string;
  headingEn?:    string;
  paragraphs:    string[];
  paragraphsEn?: string[];
}

export interface ArticleSummary {
  slug:             string;
  title:            string;
  titleEn?:         string;
  excerpt:          string;
  excerptEn?:       string;
  coverImage:       string | null;
  coverImageAlt?:   string;
  coverImageAltEn?: string;
  publishedAt:      string;
  updatedAt?:       string;
}

export interface Article extends ArticleSummary {
  keywords?:   string[];
  keywordsEn?: string[];
  sections:    ArticleSection[];
  relatedExperiences?: {
    slug:       string;
    name:       string;
    nameEn?:    string;
    coverImage: string | null;
  }[];
}

export async function getArticles(): Promise<ArticleSummary[]> {
  try {
    return (await sanityFetch<ArticleSummary[]>(ALL_ARTICLES_QUERY)) ?? [];
  } catch {
    return [];
  }
}

export async function getArticle(slug: string): Promise<Article | null> {
  try {
    return (await sanityFetch<Article>(ARTICLE_BY_SLUG_QUERY, { slug })) ?? null;
  } catch {
    return null;
  }
}

/** 依語系挑欄位。英文缺漏時退回中文——寧可顯示中文，也不要空白 */
export function pick(zh: string, en: string | undefined, isEn: boolean): string {
  return isEn ? (en || zh) : zh;
}

export function pickList(zh: string[], en: string[] | undefined, isEn: boolean): string[] {
  return isEn && en && en.length > 0 ? en : zh;
}
