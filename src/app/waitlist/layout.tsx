import type { Metadata } from "next";

// 候補遞補確認頁綁定單一候補記錄（/waitlist/[id]/confirm），是一次性的私人連結。
// 這條路徑從來沒被 robots.txt 擋過，等於一直是可索引的——補上 noindex。
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
