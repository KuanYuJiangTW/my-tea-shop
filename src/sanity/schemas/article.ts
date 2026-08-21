import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * 茶知識文章。
 *
 * 內文刻意用「段落區塊」而不是 PortableText：`/alishan-tea` 已經驗證問答式
 * 主題頁（小標＋數段內文）對搜尋與 AI 引用有效，而這個結構不需要多引一個
 * `@portabletext/react` 相依（目前它只是 transitive，直接用會在 lockfile
 * 變動時消失——本 repo 有過同樣的坑，見 lessons.md 的 Playwright 條目）。
 *
 * 之後若真的需要粗體、超連結那類行內格式，再遷移到 PortableText 不難：
 * 每個 section 的 paragraphs 就是一個 block 陣列。
 */
export const articleSchema = defineType({
  name:  "article",
  title: "茶知識文章",
  type:  "document",
  fields: [
    defineField({
      name:        "slug",
      title:       "網址代稱（slug）",
      type:        "slug",
      description: "會變成 /tea-guide/你填的內容，只能用英文小寫與連字號",
      validation:  (r) => r.required(),
      options:     { source: "title", maxLength: 96 },
    }),
    defineField({
      name:       "title",
      title:      "標題（中文）",
      type:       "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name:  "titleEn",
      title: "標題（英文）",
      type:  "string",
    }),
    defineField({
      name:        "excerpt",
      title:       "摘要（中文）",
      type:        "text",
      rows:        3,
      description: "會當作搜尋結果的描述，建議 80–120 字，前面就要講重點",
      validation:  (r) => r.required(),
    }),
    defineField({
      name:        "excerptEn",
      title:       "摘要（英文）",
      type:        "text",
      rows:        3,
      description: "留空時英文頁會退回中文摘要——建議填",
    }),
    defineField({
      name:  "coverImage",
      title: "封面圖",
      type:  "image",
      options: { hotspot: true },
    }),
    defineField({
      name:        "coverImageAlt",
      title:       "封面圖替代文字（中文）",
      type:        "string",
      description: "描述圖片內容，給讀螢幕的人與搜尋引擎看",
    }),
    defineField({
      name:  "coverImageAltEn",
      title: "封面圖替代文字（英文）",
      type:  "string",
    }),
    defineField({
      name:        "publishedAt",
      title:       "發布日期",
      type:        "datetime",
      description: "會寫進 Article 結構化資料，影響搜尋結果顯示的日期",
      validation:  (r) => r.required(),
    }),
    defineField({
      name:        "updatedAt",
      title:       "最後更新日期",
      type:        "datetime",
      description: "季節性文章每年更新後記得改這裡，搜尋引擎會知道內容是新的",
    }),
    defineField({
      name:        "keywords",
      title:       "關鍵字（中文）",
      type:        "array",
      of:          [defineArrayMember({ type: "string" })],
      description: "5–10 個就夠，寫真的有人會搜的詞，不要堆砌",
      options:     { layout: "tags" },
    }),
    defineField({
      name:    "keywordsEn",
      title:   "關鍵字（英文）",
      type:    "array",
      of:      [defineArrayMember({ type: "string" })],
      options: { layout: "tags" },
    }),
    defineField({
      name:        "sections",
      title:       "內文段落",
      type:        "array",
      description: "一個段落＝一個小標＋數段內文。小標請寫成讀者會問的問題",
      validation:  (r) => r.required().min(1),
      of: [
        defineArrayMember({
          type:  "object",
          name:  "section",
          title: "段落",
          fields: [
            defineField({ name: "heading",   title: "小標（中文）", type: "string", validation: (r) => r.required() }),
            defineField({ name: "headingEn", title: "小標（英文）", type: "string" }),
            defineField({
              name:  "paragraphs",
              title: "內文（中文，一段一列）",
              type:  "array",
              of:    [defineArrayMember({ type: "text", rows: 4 })],
              validation: (r) => r.required().min(1),
            }),
            defineField({
              name:  "paragraphsEn",
              title: "內文（英文，一段一列）",
              type:  "array",
              of:    [defineArrayMember({ type: "text", rows: 4 })],
            }),
          ],
          preview: { select: { title: "heading" } },
        }),
      ],
    }),
    defineField({
      name:        "relatedExperiences",
      title:       "文末推薦的體驗",
      type:        "array",
      description: "文章看完之後要導去哪裡預約。挑 1–2 個就好",
      of:          [defineArrayMember({ type: "reference", to: [{ type: "experience" }] })],
    }),
  ],
  orderings: [
    { title: "發布日期（新到舊）", name: "publishedAtDesc", by: [{ field: "publishedAt", direction: "desc" }] },
  ],
  preview: {
    select: { title: "title", subtitle: "slug.current", media: "coverImage" },
  },
});
