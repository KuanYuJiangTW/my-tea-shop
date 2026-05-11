import type { MetadataRoute } from "next";
import { getExperienceTypes } from "@/lib/experiences";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://my-tea-shop.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const experiences = await getExperienceTypes();
  const experienceUrls: MetadataRoute.Sitemap = experiences.map(exp => ({
    url:             `${baseUrl}/experiences/${exp.slug}`,
    lastModified:    now,
    changeFrequency: "monthly",
    priority:        0.8,
  }));

  return [
    {
      url:             baseUrl,
      lastModified:    now,
      changeFrequency: "weekly",
      priority:        1,
    },
    {
      url:             `${baseUrl}/products`,
      lastModified:    now,
      changeFrequency: "weekly",
      priority:        0.9,
    },
    {
      url:             `${baseUrl}/experiences`,
      lastModified:    now,
      changeFrequency: "weekly",
      priority:        0.85,
    },
    ...experienceUrls,
    {
      url:             `${baseUrl}/process`,
      lastModified:    now,
      changeFrequency: "monthly",
      priority:        0.7,
    },
    {
      url:             `${baseUrl}/about`,
      lastModified:    now,
      changeFrequency: "monthly",
      priority:        0.7,
    },
    {
      url:             `${baseUrl}/faq`,
      lastModified:    now,
      changeFrequency: "monthly",
      priority:        0.6,
    },
    {
      url:             `${baseUrl}/contact`,
      lastModified:    now,
      changeFrequency: "monthly",
      priority:        0.6,
    },
    {
      url:             `${baseUrl}/privacy`,
      lastModified:    now,
      changeFrequency: "yearly",
      priority:        0.3,
    },
    {
      url:             `${baseUrl}/return-policy`,
      lastModified:    now,
      changeFrequency: "yearly",
      priority:        0.3,
    },
  ];
}
