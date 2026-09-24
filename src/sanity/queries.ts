// GROQ 查詢語句

// 取得所有體驗內容
export const ALL_EXPERIENCES_QUERY = `
  *[_type == "experience"] {
    "slug": slug.current,
    name,
    nameEn,
    tagline,
    taglineEn,
    "coverImage": coverImage.asset->url,
    includes,
    includesEn,
    notes,
    notesEn,
    admissionTiers[]{ name, nameEn, price, description, descriptionEn },
    seoDescription,
    seoDescriptionEn
  }
`;

// 取得所有 FAQ（依 order 排序）
export const ALL_FAQS_QUERY = `
  *[_type == "faq"] | order(order asc) {
    _id,
    question,
    question_en,
    answer,
    answer_en,
    category,
    order
  }
`;

// 取得單一體驗內容
export const EXPERIENCE_BY_SLUG_QUERY = `
  *[_type == "experience" && slug.current == $slug][0] {
    "slug": slug.current,
    name,
    nameEn,
    tagline,
    taglineEn,
    description,
    descriptionEn,
    "coverImage": coverImage.asset->url,
    "gallery": gallery[].asset->url,
    includes,
    includesEn,
    notes,
    notesEn,
    admissionTiers[]{ name, nameEn, price, description, descriptionEn },
    seoDescription,
    seoDescriptionEn
  }
`;

// ── 茶知識文章 ─────────────────────────────────────────────────
// 只取列表／sitemap 需要的欄位，內文不撈（sections 可能很長）
export const ALL_ARTICLES_QUERY = `
  *[_type == "article" && defined(slug.current)] | order(publishedAt desc) {
    "slug": slug.current,
    title,
    titleEn,
    excerpt,
    excerptEn,
    "coverImage": coverImage.asset->url,
    coverImageAlt,
    coverImageAltEn,
    publishedAt,
    updatedAt
  }
`;

export const ARTICLE_BY_SLUG_QUERY = `
  *[_type == "article" && slug.current == $slug][0] {
    "slug": slug.current,
    title,
    titleEn,
    excerpt,
    excerptEn,
    "coverImage": coverImage.asset->url,
    coverImageAlt,
    coverImageAltEn,
    publishedAt,
    updatedAt,
    keywords,
    keywordsEn,
    sections[]{
      _key,
      heading,
      headingEn,
      paragraphs,
      paragraphsEn
    },
    "relatedExperiences": relatedExperiences[]->{
      "slug": slug.current,
      name,
      nameEn,
      "coverImage": coverImage.asset->url
    }
  }
`;

// 某款體驗的相關文章（文章的 relatedExperiences 指到它）。
// 反向查是刻意的：關聯只在文章那一邊維護一次，體驗這邊不必也記一份，
// 兩邊各記一份遲早會不同步。
export const ARTICLES_FOR_EXPERIENCE_QUERY = `
  *[_type == "article" && count(relatedExperiences[@->slug.current == $slug]) > 0]
    | order(publishedAt desc) {
      "slug": slug.current,
      title,
      titleEn,
      excerpt,
      excerptEn
    }
`;

// ── webhook 覆蓋範圍 ───────────────────────────────────────────
/**
 * 本站實際會查的 Sanity 文件型別。
 *
 * Sanity 那支 webhook 的 filter 必須涵蓋這裡的每一個型別，否則該型別發布時
 * 根本不會送出 webhook，前台只能等 revalidate 到期。2026-09-05 就是這樣：
 * hook 的 rule 是 `on: ["update"]` + `filter: _type == "experience"`，
 * 所以文章（article）發布從來沒觸發過任何一次投遞。
 *
 * 這個常數有兩道防線：
 *  - src/__tests__/sanity/webhook-coverage.test.ts 釘住它與上面查詢語句一致
 *  - npm run check:sanity-hook 拿它去比對 Sanity 上的正式設定
 */
export const SANITY_QUERIED_TYPES = ["article", "experience", "faq"] as const;
