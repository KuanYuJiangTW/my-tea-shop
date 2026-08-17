import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getExperienceTypes, getExperienceContents } from "@/lib/experiences";
import ProcessContent from "./ProcessContent";
import { langAlternates, openGraphFor, jsonLdString } from "@/lib/seo";
import { getProductFor, resolveSteps, teaProcesses } from "@/data/tea-process";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("process.meta");
  const alternates = await langAlternates("/process");
  return {
    title: t("title"),
    description: t("description"),
    keywords: t.raw("keywords") as string[],
    alternates,
    openGraph: await openGraphFor("/process", {
      title: t("ogTitle"),
      description: t("ogDescription"),
    }),
  };
}

export default async function ProcessPage() {
  const [experiences, contents, t, locale] = await Promise.all([
    getExperienceTypes(),
    getExperienceContents(),
    getTranslations("process"),
    getLocale(),
  ]);

  const activeExperiences = experiences.filter((e) => e.isActive);

  /**
   * 每款茶一份 HowTo。skipped 的工序不進 step 陣列——它在頁面上是「對比用」的
   * 說明，不是這款茶真的會做的一步，混進結構化資料等於對搜尋引擎講錯製程。
   */
  const howToJsonLd = teaProcesses.map((tea) => {
    // HowTo 名稱取商品目錄的正式品名（規格要求與 products.ts 的 name／nameEn 一致），
    // 頁面上的短名（teas.*.name）只用於導覽列與對照表，不進結構化資料。
    const product = getProductFor(tea.key);
    const teaName =
      (locale === "en" ? product?.nameEn || product?.name : product?.name) ??
      t(`teas.${tea.key}.name`);
    const steps = resolveSteps(tea.key).filter((s) => s.state !== "skipped");

    return {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: t("howTo.name", { tea: teaName }),
      description: t(`craftNote.${tea.key}`),
      totalTime: "P2D",
      step: steps.map((s, i) => {
        const own = `teaSteps.${tea.key}.${s.step}`;
        return {
          "@type": "HowToStep",
          position: i + 1,
          name: t(`steps.${s.step}.name`),
          text: t.has(`${own}.desc`) ? t(`${own}.desc`) : t(`steps.${s.step}.desc`),
          url: `/process#${tea.key}`,
        };
      }),
    };
  });

  return (
    <>
      {howToJsonLd.map((jsonLd, i) => (
        <script
          key={teaProcesses[i].key}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
        />
      ))}
      <ProcessContent experiences={activeExperiences} contents={contents} />
    </>
  );
}
