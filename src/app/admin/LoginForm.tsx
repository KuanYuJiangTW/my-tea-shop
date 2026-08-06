"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.require2fa) {
        router.push("/admin/verify-2fa");
      } else {
        router.push("/admin/dashboard");
      }
    } else {
      setError("密碼錯誤，請再試一次。");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-tea-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-tea-text mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-tea-green-pale">
              <path d="M17 8C8 10 5.9 16.17 3.82 19.8L5.71 21l1-1.5A4.49 4.49 0 0 0 8 20c4 0 4-2 8-2s4 2 8 2v-2c-4 0-4-2-8-2c-.65 0-1.2.05-1.7.12C14.93 12.12 16 10 17 8z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-tea-text tracking-wider font-serif">霧抉茶</h1>
          <p className="text-sm text-tea-text-light mt-1 tracking-widest">後台管理系統</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-tea-cream-dark p-8">
          <h2 className="text-base font-semibold text-tea-text mb-6">請輸入管理密碼</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-tea-text-light mb-1.5 tracking-wide uppercase">
                密碼
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-tea-cream-dark bg-tea-cream text-tea-text text-sm placeholder-[#B8C4BC] focus:outline-none focus:ring-2 focus:ring-tea-green focus:border-transparent transition"
              />
            </div>

            {error && (
              <p className="text-sm text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-tea-green hover:bg-tea-green-dark text-white text-sm font-medium rounded-xl transition disabled:opacity-60 tracking-wide"
            >
              {loading ? "驗證中…" : "登入後台"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-tea-text-faint mt-6">霧抉茶管理後台 · 僅供授權人員使用</p>
      </div>
    </div>
  );
}
