import { getLocale, getTranslations } from "next-intl/server";

const EN_PREFIX = "/en";

// 把「不含語言前綴的路徑」轉成指定語言的實際路徑。
// zh-TW 是預設語言、無前綴；en 走 /en 前綴（首頁是 /en 而非 /en/）。
export function pathForLocale(path: string, locale: string): string {
  if (locale !== "en") return path;
  return path === "/" ? EN_PREFIX : `${EN_PREFIX}${path}`;
}

// 供各頁 metadata 產生 canonical + hreflang alternates。
//
// **canonical 必須跟著當前語言走**（2026-08-17 修）：`/en/*` 是由 src/proxy.ts
// 內部 rewrite 到無前綴路徑的，兩個語言共用同一份 metadata。原本寫死
// `canonical: path` 等於讓每個英文頁宣告「我的正式版本是中文頁」，
// 而 sitemap 又同時要求收錄那 16 個 /en 網址——訊號互相打架，Google Search
// Console 把英文頁全歸到「替代頁面（有適當的標準標記）」而排除在索引外。
// hreflang 叢集的正確做法是每個語言版本各自 self-canonical。
//
// x-default 指向 zh-TW：語言未命中時的 fallback 版本。
export async function langAlternates(path: string) {
  const locale = await getLocale();
  const zhPath = path;
  const enPath = pathForLocale(path, "en");

  return {
    canonical: pathForLocale(path, locale),
    languages: {
      "zh-TW": zhPath,
      "en": enPath,
      "x-default": zhPath,
    },
  };
}

interface OgImage {
  url:    string;
  width:  number;
  height: number;
  alt:    string;
}

// **每個要宣告 openGraph 的頁面都必須用這個組**，不要自己寫 openGraph 物件。
//
// Next 的 metadata 是**淺層合併**：子頁一旦宣告 `openGraph`，root layout 那一整個
// openGraph 物件就被取代，`type`／`locale`／`site_name` 會一起消失。
// 2026-08-17 實測 production build，全站 `og:locale` 與 `og:site_name` 都不存在——
// 有設 og 的 9 個頁面早就掉了，沒設的（首頁、FAQ）才靠繼承留著。
//
// 預設圖是品牌 OG 圖（app/opengraph-image.tsx）。**這裡一定要明確帶 images**：
// 否則會退回 file convention，而那支檔案的 `export const alt` 是模組層常數、
// 寫死中文，英文頁的 og:image:alt 就會是中文。
// `title` 原樣使用；`titleWithBrand` 會接上當前語言的品牌名。
// og:title 不吃 root layout 的 title.template，所以短標題（「FAQ」、「Privacy Policy」）
// 直接當 og:title 會讓分享卡片看不出是誰的網站——這種頁面用 titleWithBrand。
export async function openGraphFor(
  path: string,
  extra?: { title?: string; titleWithBrand?: string; description?: string; images?: OgImage[] },
) {
  const t = await getTranslations("siteMeta");
  const locale = await getLocale();
  const { titleWithBrand, ...rest } = extra ?? {};

  const title = rest.title ?? (titleWithBrand ? `${titleWithBrand} | ${t("brand")}` : undefined);

  return {
    type: "website" as const,
    locale: t("ogLocale"),
    siteName: t("ogSiteName"),
    // 與 canonical 同一個推導方式，兩者不會分岔
    url: pathForLocale(path, locale),
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: t("ogImageAlt") }],
    ...rest,
    ...(title ? { title } : {}),
  };
}

// JSON-LD 安全序列化：轉義 < 避免 </script> 突破標籤（見 docs/security-assessment-2026-07.md）
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
