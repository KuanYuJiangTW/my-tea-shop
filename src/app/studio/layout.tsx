import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "霧抉茶 CMS",
  robots: { index: false },  // 不讓搜尋引擎索引
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
