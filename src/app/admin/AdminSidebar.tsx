"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  external?: boolean;
};

type NavGroup = {
  title?: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    items: [
      {
        href: "/admin/dashboard",
        label: "儀表板",
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "茶山體驗",
    items: [
      {
        href: "/admin/experiences",
        label: "體驗管理",
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
          </svg>
        ),
      },
      {
        href: "/admin/reviews",
        label: "評價管理",
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        ),
      },
      {
        href: "/studio",
        label: "內容管理",
        external: true,
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "商品",
    items: [
      {
        href: "/admin/orders",
        label: "訂單管理",
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
          </svg>
        ),
      },
      {
        href: "/admin/products",
        label: "產品管理",
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M17 8C8 10 5.9 16.17 3.82 19.8L5.71 21l1-1.5A4.49 4.49 0 0 0 8 20c4 0 4-2 8-2s4 2 8 2v-2c-4 0-4-2-8-2c-.65 0-1.2.05-1.7.12C14.93 12.12 16 10 17 8z" />
          </svg>
        ),
      },
      {
        href: "/admin/bundles",
        label: "組合管理",
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM10 5h4v2h-4V5zm10 14H4V9h16v10z" />
          </svg>
        ),
      },
      {
        href: "/admin/product-reviews",
        label: "商品評價",
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6.6 11.5L12 12.3l-1.4 1.2.4-1.8-1.4-1.2 1.9-.2.7-1.7.7 1.7 1.9.2-1.4 1.2.4 1.8z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "行銷管理",
    items: [
      {
        href: "/admin/campaigns",
        label: "點數活動",
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.87c0 1.92-1.43 2.96-3.12 3.17z" />
          </svg>
        ),
      },
      {
        href: "/admin/coupons",
        label: "折價券",
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
          </svg>
        ),
      },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin");
  }

  function isActive(href: string) {
    if (href === "/admin/dashboard") return pathname === "/admin/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-14 sm:w-56 flex-shrink-0 bg-tea-text flex flex-col h-full">
      {/* Brand */}
      <div className="px-2 sm:px-6 py-6 border-b border-[#4D5E55] flex justify-center sm:justify-start">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-tea-green flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-tea-green-mist">
              <path d="M17 8C8 10 5.9 16.17 3.82 19.8L5.71 21l1-1.5A4.49 4.49 0 0 0 8 20c4 0 4-2 8-2s4 2 8 2v-2c-4 0-4-2-8-2c-.65 0-1.2.05-1.7.12C14.93 12.12 16 10 17 8z" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <div className="text-tea-green-mist font-bold text-sm tracking-wider font-serif">霧抉茶</div>
            <div className="text-tea-green text-[10px] tracking-widest uppercase">Admin</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-1.5 sm:px-3 py-4 overflow-y-auto space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.title && (
              <p className="hidden sm:block px-3 mb-1 text-tea-green text-[10px] tracking-widest uppercase">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) =>
                item.external ? (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.label}
                    className="flex items-center justify-center sm:justify-start gap-3 px-2 sm:px-3 py-2.5 rounded-xl text-sm text-tea-green-light hover:bg-[#4D5E55] hover:text-tea-green-mist transition-all"
                  >
                    <span className="text-tea-green flex-shrink-0">{item.icon}</span>
                    <span className="hidden sm:flex flex-1 items-center gap-1">
                      {item.label}
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current opacity-60 ml-auto">
                        <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                      </svg>
                    </span>
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`flex items-center justify-center sm:justify-start gap-3 px-2 sm:px-3 py-2.5 rounded-xl text-sm transition-all ${
                      isActive(item.href)
                        ? "bg-tea-green text-white font-medium"
                        : "text-tea-green-light hover:bg-[#4D5E55] hover:text-tea-green-mist"
                    }`}
                  >
                    <span className={`flex-shrink-0 ${isActive(item.href) ? "text-white" : "text-tea-green"}`}>
                      {item.icon}
                    </span>
                    <span className="hidden sm:block">{item.label}</span>
                  </Link>
                )
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-1.5 sm:px-3 pb-4 pt-2 border-t border-[#4D5E55]">
        <button
          onClick={handleLogout}
          title="登出"
          className="flex items-center justify-center sm:justify-start gap-3 w-full px-2 sm:px-3 py-2.5 rounded-xl text-sm text-tea-green-light hover:bg-[#4D5E55] hover:text-tea-green-mist transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-tea-green flex-shrink-0">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
          </svg>
          <span className="hidden sm:block">登出</span>
        </button>
      </div>
    </aside>
  );
}
