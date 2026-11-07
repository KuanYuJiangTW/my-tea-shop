"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * 從預約頁被導回來（`?error=unavailable`）時顯示的一行說明。
 *
 * 兩種情況會導到這裡：體驗已下架（experience-visibility-toggle）、場次已取消。
 * 刻意做成 client 元件讀 searchParams——在 server 的 page.tsx 讀會讓整頁
 * 變成動態渲染，丟掉 `revalidate = 3600` 的快取。
 */
export default function UnavailableNotice() {
  const params = useSearchParams();
  const t = useTranslations("experiences");
  if (params.get("error") !== "unavailable") return null;

  return (
    <div
      role="status"
      className="mb-10 rounded-2xl border border-tea-green-pale bg-tea-cream px-6 py-4 text-body text-tea-text"
    >
      {t("unavailableNotice")}
    </div>
  );
}
