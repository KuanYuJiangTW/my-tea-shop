import { getLocale } from "next-intl/server";

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

// JSON-LD 安全序列化：轉義 < 避免 </script> 突破標籤（見 docs/security-assessment-2026-07.md）
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
