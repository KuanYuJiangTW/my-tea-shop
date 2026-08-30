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

  // 攻略文也不掛。這一區的流量幾乎全是陌生搜尋（「萬鷺朝鳳 幾點」之類的
  // 資訊型查詢），來的人要的是「幾點來、停哪裡、有沒有洗手間」，第一眼卻先吃到
  // 一條「註冊送 NT$50 購物金」——訊號變成「這是賣茶的網站」而不是「這裡有你要的答案」，
  // 而且它佔掉手機最貴的 70px 首屏。想買茶的人自己會逛到商店頁，那裡公告條照掛。
  const isTeaGuide = pathname.startsWith("/tea-guide") || pathname.startsWith("/en/tea-guide");

  return (
    <>
      {!isCheckout && !isTeaGuide && <AnnouncementBar />}
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
