import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // 優先用 requestLocale（有 [locale] 資料夾時由 Next.js 自動傳入）
  let locale = await requestLocale;

  // 無 [locale] 資料夾時，改讀自訂 middleware 設的 X-NEXT-INTL-LOCALE header
  if (!locale || !routing.locales.includes(locale as "zh" | "en")) {
    const headerLocale = (await headers()).get("X-NEXT-INTL-LOCALE");
    locale = (headerLocale && routing.locales.includes(headerLocale as "zh" | "en"))
      ? headerLocale
      : routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
