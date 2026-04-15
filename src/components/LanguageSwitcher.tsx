"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(next: "zh" | "en") {
    if (next === locale) return;

    // 計算目標路徑：移除現有 locale 前綴（如 /en/...），再加新的
    let newPath: string;
    if (locale === "en") {
      // 目前是英文，移除 /en 前綴
      newPath = pathname.replace(/^\/en/, "") || "/";
    } else {
      // 目前是中文（無前綴），加上 /en
      newPath = `/en${pathname}`;
    }

    startTransition(() => {
      router.push(newPath);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      <button
        onClick={() => switchLocale("zh")}
        disabled={isPending}
        className={`px-2 py-1 rounded-lg transition-colors ${
          locale === "zh"
            ? "text-tea-green font-bold"
            : "text-tea-text-light hover:text-tea-green"
        }`}
        aria-label="切換為中文"
      >
        中
      </button>
      <span className="text-tea-text-light/40">/</span>
      <button
        onClick={() => switchLocale("en")}
        disabled={isPending}
        className={`px-2 py-1 rounded-lg transition-colors ${
          locale === "en"
            ? "text-tea-green font-bold"
            : "text-tea-text-light hover:text-tea-green"
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  );
}
