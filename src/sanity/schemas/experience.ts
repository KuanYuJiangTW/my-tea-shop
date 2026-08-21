import { defineArrayMember, defineField, defineType } from "sanity";

export const experienceSchema = defineType({
  name:  "experience",
  title: "體驗項目",
  type:  "document",
  fields: [
    defineField({
      name:        "slug",
      title:       "Slug（對應資料庫）",
      type:        "slug",
      description: "必須與資料庫的 slug 完全一致，例如：tea-ceremony",
      validation:  (r) => r.required(),
      options:     { source: "name" },
    }),
    defineField({
      name:       "name",
      title:      "體驗名稱（中文）",
      type:       "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name:  "nameEn",
      title: "體驗名稱（英文）",
      type:  "string",
    }),
    defineField({
      name:  "tagline",
      title: "一句話介紹（中文）",
      type:  "string",
      description: "顯示在列表頁卡片上的簡短說明",
    }),
    defineField({
      name:  "taglineEn",
      title: "Tagline (EN)",
      type:  "string",
    }),
    defineField({
      name:   "description",
      title:  "詳細介紹（中文）",
      type:   "array",
      of:     [{ type: "block" }],
      description: "顯示在體驗詳情頁的完整說明（支援粗體、段落）",
    }),
    defineField({
      name:   "descriptionEn",
      title:  "Description (EN)",
      type:   "array",
      of:     [{ type: "block" }],
    }),
    defineField({
      name:    "coverImage",
      title:   "封面圖片",
      type:    "image",
      options: { hotspot: true },
    }),
    defineField({
      name:  "gallery",
      title: "相簿",
      type:  "array",
      of:    [{ type: "image", options: { hotspot: true } }],
    }),
    defineField({
      name:  "includes",
      title: "體驗包含項目（中文）",
      type:  "array",
      of:    [{ type: "string" }],
      description: "例如：「專業茶藝師全程帶領」",
    }),
    defineField({
      name:  "includesEn",
      title: "What's Included (EN)",
      type:  "array",
      of:    [{ type: "string" }],
    }),
    defineField({
      name:  "notes",
      title: "注意事項（中文）",
      type:  "array",
      of:    [{ type: "string" }],
    }),
    defineField({
      name:  "notesEn",
      title: "Important Notes (EN)",
      type:  "array",
      of:    [{ type: "string" }],
    }),
    defineField({
      name:        "admissionTiers",
      title:       "入園／參加方式與價格",
      type:        "array",
      description:
        "同一個地點可能有好幾種參加方式（只是來看／入園坐著看／參加導覽）。" +
        "填了才會在頁面上出現價格比較區；不填就完全不顯示。價格改了這裡就好，不用改程式。",
      of: [
        defineArrayMember({
          type:  "object",
          name:  "tier",
          title: "一種方式",
          fields: [
            defineField({ name: "name",   title: "名稱（中文）", type: "string", validation: (r) => r.required() }),
            defineField({ name: "nameEn", title: "名稱（英文）", type: "string" }),
            defineField({
              name:        "price",
              title:       "每人價格（元）",
              type:        "number",
              description: "填 0 會顯示成「免費」",
              validation:  (r) => r.required().min(0),
            }),
            defineField({ name: "description",   title: "包含什麼（中文）", type: "text", rows: 2 }),
            defineField({ name: "descriptionEn", title: "包含什麼（英文）", type: "text", rows: 2 }),
          ],
          preview: { select: { title: "name", subtitle: "price" } },
        }),
      ],
    }),
    defineField({
      name:  "seoDescription",
      title: "SEO 說明文字",
      type:  "text",
      rows:  3,
    }),
    defineField({
      name:  "seoDescriptionEn",
      title: "SEO Description (EN)",
      type:  "text",
      rows:  3,
      description: "留空時英文頁會退回使用 Tagline (EN)，不會顯示中文的 SEO 說明文字",
    }),
  ],
  preview: {
    select: { title: "name", media: "coverImage" },
  },
});
