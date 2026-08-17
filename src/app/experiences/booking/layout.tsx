import type { Metadata } from "next";

// 預約流程頁綁定單一場次（/experiences/booking/[sessionId]），場次過期就失效，
// 是交易流程而非內容。可被索引的是體驗介紹頁 /experiences/[slug]，不是這裡。
// 這條路徑同樣從來沒被 robots.txt 擋過——補上 noindex。
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
