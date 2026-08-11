"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnnouncementBar from "@/components/AnnouncementBar";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  // 結帳流程不掛公告條。人已經決定要買了，這時再跳「註冊送 NT$50」只有兩種結果：
  // 中斷去註冊（棄單），或發現自己少拿了折扣而不爽。付款方式與運費在結帳頁本來
  // 就有完整說明，不需要公告條補。`/en` 前綴要一起算進來。
  const isCheckout = pathname === "/checkout" || pathname === "/en/checkout";

  return (
    <>
      {!isCheckout && <AnnouncementBar />}
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
