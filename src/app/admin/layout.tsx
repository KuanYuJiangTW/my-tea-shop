import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "後台管理 | 霧抉茶",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
