import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-tea-text text-tea-cream-light mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg width="28" height="28" viewBox="0 0 34 34" fill="none">
                <path
                  d="M17 4C17 4 8 11 8 20C8 24.97 12.03 29 17 29C21.97 29 26 24.97 26 20C26 11 17 4 17 4Z"
                  fill="#A3BFA8"
                  opacity="0.9"
                />
                <path
                  d="M17 9C17 9 12 15 12 20C12 22.76 14.24 25 17 25C19.76 25 22 22.76 22 20C22 15 17 9 17 9Z"
                  fill="#C8DDD0"
                />
                <line x1="17" y1="29" x2="17" y2="33" stroke="#A3BFA8" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <h3 className="font-serif text-xl font-bold text-tea-green-light">霧抉茶</h3>
            </div>
            <p className="text-sm text-tea-green-pale leading-relaxed">
              源自嘉義阿里山梅山山區，<br />
              一家三口40年的堅持，自產自銷好茶。
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-medium mb-5 text-tea-green-light tracking-wide">快速連結</h4>
            <ul className="space-y-3">
              {[
                { href: "/products", label: "茶葉產品" },
                { href: "/process", label: "製茶過程" },
                { href: "/about", label: "關於我們" },
                { href: "/cart", label: "購物車" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-tea-green-pale hover:text-tea-green-light transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-medium mb-5 text-tea-green-light tracking-wide">聯絡我們</h4>
            <ul className="space-y-3 text-sm text-tea-green-pale">
              <li className="flex items-start gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 flex-shrink-0 text-tea-green">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                嘉義縣梅山鄉太興村8鄰溪頭19號之2
              </li>
              <li className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="flex-shrink-0 text-tea-green">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.37 9.5 19.79 19.79 0 01.38 4.46 2 2 0 012.37 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.41 9.84a16 16 0 006.75 6.75l1.2-1.21a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                </svg>
                0972-619-391
              </li>
              <li className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="flex-shrink-0 text-tea-green">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                qdbzdt2846@gmail.com
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-8 text-center text-xs text-tea-green-pale">
          © 2024 霧抉茶 Wu Jue Tea. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
