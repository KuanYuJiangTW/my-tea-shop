// GROQ 查詢語句

// 取得所有體驗內容
export const ALL_EXPERIENCES_QUERY = `
  *[_type == "experience"] {
    "slug": slug.current,
    name,
    nameEn,
    tagline,
    "coverImage": coverImage.asset->url,
    includes,
    notes,
    seoDescription
  }
`;

// 取得所有 FAQ（依 order 排序）
export const ALL_FAQS_QUERY = `
  *[_type == "faq"] | order(order asc) {
    _id,
    question,
    answer,
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
    description,
    "coverImage": coverImage.asset->url,
    "gallery": gallery[].asset->url,
    includes,
    notes,
    seoDescription
  }
`;
