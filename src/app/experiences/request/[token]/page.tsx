import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import RequestStatusClient from "./RequestStatusClient";

/**
 * 申請人的自助查詢頁。
 *
 * **noindex 且不進 sitemap**：這一頁的網址就是憑證，被搜尋引擎收錄等於把
 * 別人的申請攤在搜尋結果裡。資料一律由 client 憑 token 打 API 取得，
 * 伺服器端不預先渲染任何個資。
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

export default async function RequestStatusPage({ params }: Props) {
  const { token } = await params;
  const locale = await getLocale();

  return (
    <div className="min-h-screen bg-tea-cream-light">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <RequestStatusClient token={token} locale={locale} />
      </div>
    </div>
  );
}
