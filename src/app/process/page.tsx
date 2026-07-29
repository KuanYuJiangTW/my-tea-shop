import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getExperienceTypes, getExperienceContents } from "@/lib/experiences";
import ProcessContent from "./ProcessContent";
import { langAlternates, jsonLdString } from "@/lib/seo";
import { getProductFor, resolveSteps, teaProcesses } from "@/data/tea-process";

export const metadata: Metadata = {
  title: "製茶過程",
  description:
    "高山烏龍、金萱、四季春、蜜香紅茶、紅烏龍五款茶的完整製程對照。五款茶共用同一套前後段工序，差別只在中間的分歧段——炒菁擺在最前是烏龍、沒有炒菁是紅茶、擺在最後是紅烏龍。",
  keywords: [
    "製茶過程",
    "台灣製茶工藝",
    "高山茶製作",
    "紅茶製程",
    "球形紅茶",
    "蜜香紅茶製作",
    "紅烏龍",
    "四季春",
    "金萱",
    "炒菁",
    "布球團揉",
    "焙火烘焙",
    "嘉義茶葉",
  ],
  alternates: langAlternates("/process"),
  openGraph: {
    title: "製茶過程 | 霧抉茶職人工藝",
    description:
      "五款茶走同一條路，只在中間分岔。看懂炒菁擺在哪裡，就看懂了台灣茶的分類。",
    url: "/process",
  },
};

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
