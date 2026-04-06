import { defineField, defineType } from "sanity";

export const faqSchema = defineType({
  name:  "faq",
  title: "常見問題（FAQ）",
  type:  "document",
  fields: [
    defineField({
      name:       "question",
      title:      "問題",
      type:       "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name:       "answer",
      title:      "回答",
      type:       "array",
      of:         [{ type: "block" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name:    "category",
      title:   "分類",
      type:    "string",
      options: {
        list: [
          { title: "預約相關", value: "booking" },
          { title: "付款退款", value: "payment" },
          { title: "體驗內容", value: "experience" },
          { title: "交通住宿", value: "logistics" },
          { title: "其他",     value: "other" },
        ],
      },
    }),
    defineField({
      name:  "order",
      title: "排序（數字越小越前面）",
      type:  "number",
    }),
  ],
  orderings: [
    {
      title: "排序",
      name:  "orderAsc",
      by:    [{ field: "order", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "question", subtitle: "category" },
  },
});
