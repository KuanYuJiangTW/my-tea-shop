"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { totalItems } = useCart();
  const { user, loading } = useAuth();
  const router = useRouter();

  const navLinks = [
    { href: "/", label: "首頁" },
    { href: "/products", label: "產品" },
    { href: "/process", label: "製茶過程" },
    { href: "/about", label: "關於我們" },
    { href: "/contact", label: "聯絡我們" },
  ];

  // 點選外部關閉 user dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setIsUserMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  // 取得顯示名稱
  const displayName =
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "會員";

  return (
    <header className="bg-tea-cream border-b border-tea-green-pale sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <path
                d="M17 4C17 4 8 11 8 20C8 24.97 12.03 29 17 29C21.97 29 26 24.97 26 20C26 11 17 4 17 4Z"
                fill="#7D9B84"
                opacity="0.85"
              />
              <path
                d="M17 9C17 9 12 15 12 20C12 22.76 14.24 25 17 25C19.76 25 22 22.76 22 20C22 15 17 9 17 9Z"
                fill="#A3BFA8"
              />
              <line x1="17" y1="29" x2="17" y2="33" stroke="#5C7A67" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="14" y1="31" x2="17" y2="29" stroke="#5C7A67" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="20" y1="31" x2="17" y2="29" stroke="#5C7A67" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="font-serif text-xl font-bold text-tea-text tracking-wide">霧抉茶</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-tea-text-light hover:text-tea-green transition-colors text-sm font-medium tracking-wide"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right: User + Cart + Mobile toggle */}
          <div className="flex items-center gap-1">

            {/* User Menu (Desktop) */}
            {!loading && (
              <div className="hidden md:block relative" ref={userMenuRef}>
                {user ? (
                  <>
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-tea-green-mist transition-colors text-sm text-tea-text-light hover:text-tea-green"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                      </svg>
                      <span className="max-w-[80px] truncate font-medium">{displayName}</span>
                      <svg viewBox="0 0 24 24" className={`w-3 h-3 fill-current transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`}>
                        <path d="M7 10l5 5 5-5z"/>
                      </svg>
                    </button>

                    {isUserMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl shadow-lg border border-[#EDE8DC] py-1.5 z-50">
                        <Link
                          href="/account"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-tea-text hover:bg-tea-green-mist hover:text-tea-green transition-colors"
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-tea-text-light">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                          </svg>
                          會員中心
                        </Link>
                        <Link
                          href="/account?tab=orders"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-tea-text hover:bg-tea-green-mist hover:text-tea-green transition-colors"
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-tea-text-light">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
                          </svg>
                          我的訂單
                        </Link>
                        <div className="my-1 border-t border-[#F5F0E8]" />
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-50 transition-colors"
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                          </svg>
                          登出
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href="/auth/login"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-tea-green-mist transition-colors text-sm text-tea-text-light hover:text-tea-green"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                    登入
                  </Link>
                )}
              </div>
            )}

            {/* Cart */}
            <Link href="/cart" className="relative p-2 group">
              <svg
                width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8"
                className="text-tea-text group-hover:text-tea-green transition-colors"
              >
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-tea-green text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-tea-text"
              aria-label="選單"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                {isMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-tea-green-pale space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2.5 px-2 text-tea-text-light hover:text-tea-green hover:bg-tea-green-mist rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-tea-green-pale pt-2 mt-2">
              {user ? (
                <>
                  <Link
                    href="/account"
                    className="block py-2.5 px-2 text-tea-text-light hover:text-tea-green hover:bg-tea-green-mist rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    會員中心（{displayName}）
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                    className="block w-full text-left py-2.5 px-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors text-sm"
                  >
                    登出
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="block py-2.5 px-2 text-tea-text-light hover:text-tea-green hover:bg-tea-green-mist rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  登入 / 註冊
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
