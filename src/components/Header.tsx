"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { totalItems } = useCart();

  const navLinks = [
    { href: "/", label: "首頁" },
    { href: "/products", label: "產品" },
    { href: "/process", label: "製茶過程" },
    { href: "/about", label: "關於我們" },
    { href: "/contact", label: "聯絡我們" },
  ];

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
              <line
                x1="17"
                y1="29"
                x2="17"
                y2="33"
                stroke="#5C7A67"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1="14"
                y1="31"
                x2="17"
                y2="29"
                stroke="#5C7A67"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="20"
                y1="31"
                x2="17"
                y2="29"
                stroke="#5C7A67"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="font-serif text-xl font-bold text-tea-text tracking-wide">
              霧抉茶
            </span>
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

          {/* Cart + Mobile toggle */}
          <div className="flex items-center gap-2">
            <Link href="/cart" className="relative p-2 group">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
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

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-tea-text"
              aria-label="選單"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
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
          </div>
        )}
      </div>
    </header>
  );
}
