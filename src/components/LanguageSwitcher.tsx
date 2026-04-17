"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

interface LanguageSwitcherProps {
  size?: "compact" | "large";
}

export default function LanguageSwitcher({ size = "compact" }: LanguageSwitcherProps) {
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

  const isLarge = size === "large";

  const btnBase = isLarge
    ? "min-w-[44px] min-h-[44px] px-4 py-2 rounded-lg text-sm transition-colors"
    : "px-2 py-1 rounded-lg transition-colors";

  return (
    <div className={`flex items-center font-medium ${isLarge ? "gap-2 text-sm" : "gap-1 text-xs"}`}>
      <button
        onClick={() => switchLocale("zh")}
        disabled={isPending}
        className={`${btnBase} ${
          locale === "zh"
            ? "text-tea-green font-bold"
            : "text-tea-text-light hover:text-tea-green"
        }${isLarge && locale === "zh" ? " bg-tea-green-mist" : ""}`}
        aria-label="切換為中文"
      >
        中文
      </button>
      <span className="text-tea-text-light/40" aria-hidden="true">/</span>
      <button
        onClick={() => switchLocale("en")}
        disabled={isPending}
        className={`${btnBase} ${
          locale === "en"
            ? "text-tea-green font-bold"
            : "text-tea-text-light hover:text-tea-green"
        }${isLarge && locale === "en" ? " bg-tea-green-mist" : ""}`}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  );
}
