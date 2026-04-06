import { defineField, defineType } from "sanity";

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
      title: "一句話介紹",
      type:  "string",
      description: "顯示在列表頁卡片上的簡短說明",
    }),
    defineField({
      name:   "description",
      title:  "詳細介紹",
      type:   "array",
      of:     [{ type: "block" }],
      description: "顯示在體驗詳情頁的完整說明（支援粗體、段落）",
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
      title: "體驗包含項目",
      type:  "array",
      of:    [{ type: "string" }],
      description: "例如：「專業茶藝師全程帶領」",
    }),
    defineField({
      name:  "notes",
      title: "注意事項",
      type:  "array",
      of:    [{ type: "string" }],
    }),
    defineField({
      name:  "seoDescription",
      title: "SEO 說明文字",
      type:  "text",
      rows:  3,
    }),
  ],
  preview: {
    select: { title: "name", media: "coverImage" },
  },
});
