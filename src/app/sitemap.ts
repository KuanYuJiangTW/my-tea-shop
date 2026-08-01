import type { MetadataRoute } from "next";
import { getExperienceTypes } from "@/lib/experiences";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

const STATIC_PAGES: Array<{ path: string; changeFrequency: ChangeFrequency; priority: number }> = [
  { path: "",               changeFrequency: "weekly",  priority: 1 },
  { path: "/products",      changeFrequency: "weekly",  priority: 0.9 },
  { path: "/experiences",   changeFrequency: "weekly",  priority: 0.85 },
  { path: "/alishan-tea",   changeFrequency: "monthly", priority: 0.75 },
  { path: "/process",       changeFrequency: "monthly", priority: 0.7 },
  { path: "/about",         changeFrequency: "monthly", priority: 0.7 },
  { path: "/faq",           changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact",       changeFrequency: "monthly", priority: 0.6 },
  { path: "/web-design",    changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy",       changeFrequency: "yearly",  priority: 0.3 },
  { path: "/return-policy", changeFrequency: "yearly",  priority: 0.3 },
];

// 每個路徑同時輸出 zh-TW（無前綴）與 en（/en 前綴）兩個 URL，並互相標註 hreflang
function localizedEntries(
  path: string,
  lastModified: Date,
  changeFrequency: ChangeFrequency,
  priority: number,
): MetadataRoute.Sitemap {
  const zhUrl = `${baseUrl}${path}` || baseUrl;
  const enUrl = `${baseUrl}/en${path}`;
  const languages = { "zh-TW": zhUrl, en: enUrl };

  return [
    { url: zhUrl, lastModified, changeFrequency, priority, alternates: { languages } },
    { url: enUrl, lastModified, changeFrequency, priority, alternates: { languages } },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const experiences = await getExperienceTypes();

  return [
    ...STATIC_PAGES.flatMap(p =>
      localizedEntries(p.path, now, p.changeFrequency, p.priority),
    ),
    ...experiences.flatMap(exp =>
      localizedEntries(`/experiences/${exp.slug}`, now, "monthly", 0.8),
    ),
  ];
}
