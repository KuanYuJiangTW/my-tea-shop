import { defineField, defineType } from "sanity";

export const productSchema = defineType({
  name:  "product",
  title: "商品",
  type:  "document",
  fields: [
    defineField({
      name:        "slug",
      title:       "Slug（對應資料庫）",
      type:        "slug",
      description: "必須與 Supabase products 資料表的 slug 欄位完全一致，例如：dong-fang-mei-ren",
      validation:  (r) => r.required(),
      options:     { source: "name" },
    }),
    defineField({
      name:       "name",
      title:      "商品名稱（中文）",
      type:       "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name:  "nameEn",
      title: "商品名稱（英文）",
      type:  "string",
    }),
    defineField({
      name:        "description",
      title:       "商品介紹",
      type:        "array",
      of:          [{ type: "block" }],
      description: "顯示在產品詳情頁的完整說明（支援粗體、段落）",
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
      name:  "category",
      title: "分類",
      type:  "string",
      description: "例如：烏龍茶、紅茶、綠茶",
    }),
    defineField({
      name:  "origin",
      title: "產地",
      type:  "string",
      description: "例如：阿里山、梨山",
    }),
    defineField({
      name:  "altitude",
      title: "海拔",
      type:  "string",
      description: "例如：1,200m 以上",
    }),
    defineField({
      name:  "color",
      title: "茶湯顏色",
      type:  "string",
      description: "例如：金黃、琥珀",
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "category", media: "coverImage" },
  },
});
