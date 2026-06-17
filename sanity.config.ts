import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemas } from "@/sanity/schemas";

export default defineConfig({
  name:      "default",
  title:     "霧抉茶 CMS",
  basePath:  "/studio",   // Studio 掛載於 /studio 路由，需與 src/app/studio/[[...tool]] 一致
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset:   process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  plugins: [
    structureTool(),
    visionTool(),   // GROQ 查詢測試工具
  ],
  schema: { types: schemas },
});
