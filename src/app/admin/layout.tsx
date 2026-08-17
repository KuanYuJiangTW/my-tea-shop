import type { Metadata } from "next";

export const metadata: Metadata = {
  // 品牌名由 root layout 的 title.template 接上，這裡不重複（原本是「後台管理 | 霧抉茶 | 霧抉茶」）
  title: "後台管理",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
