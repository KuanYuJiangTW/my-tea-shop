import type { Metadata } from "next";

// 登入／註冊頁沒有搜尋價值，且原本是靠 robots.txt 的 `Disallow: /auth/` 擋著——
// 但那份清單沒有 /en 版本，所以 /en/auth/login 一直是可抓取且 index,follow 的。
// robots.txt 現在只封鎖 /api/（見 app/robots.txt/route.ts 的說明），
// 排除索引改由這裡負責，兩種語言前綴都會輸出這個 meta。
//
// 註冊頁是 client component，不能自己 export metadata，因此放在 layout 這層。
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
