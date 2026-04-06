import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemas } from "@/sanity/schemas";

export default defineConfig({
  name:      "default",
  title:     "霧抉茶 CMS",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset:   process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  plugins: [
    structureTool(),
    visionTool(),   // GROQ 查詢測試工具
  ],
  schema: { types: schemas },
});
