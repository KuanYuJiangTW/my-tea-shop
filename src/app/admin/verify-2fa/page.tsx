"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Verify2FAPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/auth/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (res.ok) {
      router.push("/admin/dashboard");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "驗證失敗，請再試一次。");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-tea-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-tea-text mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-tea-green-pale">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-tea-text tracking-wider font-serif">霧抉茶</h1>
          <p className="text-sm text-tea-text-light mt-1 tracking-widest">雙重驗證</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-tea-cream-dark p-8">
          <h2 className="text-base font-semibold text-tea-text mb-2">輸入驗證碼</h2>
          <p className="text-sm text-tea-text-light mb-6">請開啟驗證器 App，輸入 6 位數驗證碼。</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-tea-text-light mb-1.5 tracking-wide uppercase">
                驗證碼
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                required
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-tea-cream-dark bg-tea-cream text-tea-text text-sm placeholder-[#B8C4BC] focus:outline-none focus:ring-2 focus:ring-tea-green focus:border-transparent transition tracking-widest text-center text-lg"
              />
            </div>

            {error && (
              <p className="text-sm text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-2.5 bg-tea-green hover:bg-tea-green-dark text-white text-sm font-medium rounded-xl transition disabled:opacity-60 tracking-wide"
            >
              {loading ? "驗證中…" : "確認"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-tea-text-faint mt-6">霧抉茶管理後台 · 僅供授權人員使用</p>
      </div>
    </div>
  );
}
