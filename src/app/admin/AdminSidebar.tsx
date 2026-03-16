"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  {
    href: "/admin/dashboard",
    label: "儀表板",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
      </svg>
    ),
  },
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
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin");
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-[#3D4A42] flex flex-col h-full">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-[#4D5E55]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#7D9B84] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#EBF3EE]">
              <path d="M17 8C8 10 5.9 16.17 3.82 19.8L5.71 21l1-1.5A4.49 4.49 0 0 0 8 20c4 0 4-2 8-2s4 2 8 2v-2c-4 0-4-2-8-2c-.65 0-1.2.05-1.7.12C14.93 12.12 16 10 17 8z" />
            </svg>
          </div>
          <div>
            <div className="text-[#EBF3EE] font-bold text-sm tracking-wider font-serif">霧抉茶</div>
            <div className="text-[#7D9B84] text-[10px] tracking-widest uppercase">Admin</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin/dashboard"
              ? pathname === "/admin/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? "bg-[#7D9B84] text-white font-medium"
                  : "text-[#A3BFA8] hover:bg-[#4D5E55] hover:text-[#EBF3EE]"
              }`}
            >
              <span className={isActive ? "text-white" : "text-[#7D9B84]"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-2 border-t border-[#4D5E55]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-[#A3BFA8] hover:bg-[#4D5E55] hover:text-[#EBF3EE] transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-[#7D9B84]">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
          </svg>
          登出
        </button>
      </div>
    </aside>
  );
}
