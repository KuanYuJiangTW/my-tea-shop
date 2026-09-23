import { sanityFetch } from "@/sanity/client";
import {
  ALL_ARTICLES_QUERY,
  ARTICLE_BY_SLUG_QUERY,
  ARTICLES_FOR_EXPERIENCE_QUERY,
} from "@/sanity/queries";

/**
 * 茶知識文章的讀取層。
 *
 * 沒有靜態備援（不像 experiences 的 FALLBACK_CONTENT）——文章完全由 Sanity
 * 產生，Sanity 掛掉時列表為空、單篇 404，而不是顯示過時的硬編內容。
 */

export interface ArticleSection {
  /** Sanity 陣列項目的 key。當段落錨點用：插入新段落時不會讓其他段的錨點位移 */
  _key?:         string;
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

/** 某款體驗的相關文章。查不到或 Sanity 出問題時回空陣列，呼叫端不顯示任何東西 */
export async function getArticlesForExperience(slug: string): Promise<ArticleSummary[]> {
  try {
    return (await sanityFetch<ArticleSummary[]>(ARTICLES_FOR_EXPERIENCE_QUERY, { slug })) ?? [];
  } catch {
    return [];
  }
}

/** 依語系挑欄位。英文缺漏時退回中文——寧可顯示中文，也不要空白 */
export function pick(zh: string, en: string | undefined, isEn: boolean): string {
  return isEn ? (en || zh) : zh;
}

export function pickList(zh: string[], en: string[] | undefined, isEn: boolean): string[] {
  return isEn && en && en.length > 0 ? en : zh;
}
