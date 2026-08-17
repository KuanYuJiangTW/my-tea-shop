import type { Metadata } from "next";

// 會員中心與其子頁（預約參與者等）都是登入後的個人資料頁，不該被索引。
// 原本靠 robots.txt 的 `Disallow: /account` 擋著，現已改為 noindex；
// 理由與 /auth 相同，見 app/robots.txt/route.ts 的說明。
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
