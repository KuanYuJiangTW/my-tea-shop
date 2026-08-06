"use client";

import { useState, useEffect } from "react";

type SetupState = "idle" | "scanning" | "disabling";

export default function SettingsPage() {
  const [has2FA, setHas2FA] = useState<boolean | null>(null);
  const [state, setState] = useState<SetupState>("idle");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // 檢查 2FA 狀態
  useEffect(() => {
    fetch("/api/admin/2fa/status")
      .then((r) => r.json())
      .then((d) => setHas2FA(d.enabled ?? false))
      .catch(() => setHas2FA(false));
  }, []);

  async function startSetup() {
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/2fa/setup");
    const data = await res.json();
    setQrDataUrl(data.qrDataUrl);
    setSecret(data.secret);
    setState("scanning");
    setCode("");
    setLoading(false);
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/2fa/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, code }),
    });
    if (res.ok) {
      setHas2FA(true);
      setState("idle");
      setSuccess("2FA 已成功啟用！");
      setCode("");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "驗證失敗");
    }
    setLoading(false);
  }

  async function confirmDisable(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      setHas2FA(false);
      setState("idle");
      setSuccess("2FA 已停用。");
      setCode("");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "驗證失敗");
    }
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-bold text-tea-text mb-6">安全設定</h1>

      <div className="bg-white rounded-2xl border border-tea-cream-dark p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-tea-text">雙重驗證（2FA）</h2>
            <p className="text-sm text-tea-text-light mt-0.5">
              {has2FA === null ? "載入中…" : has2FA ? "已啟用 TOTP 驗證" : "尚未啟用，建議開啟以提升安全性"}
            </p>
          </div>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              has2FA ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {has2FA ? "已啟用" : "未啟用"}
          </span>
        </div>

        {success && (
          <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">{success}</p>
        )}
        {error && (
          <p className="text-sm text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* ─── 初始狀態 ─── */}
        {state === "idle" && (
          <div>
            {!has2FA ? (
              <button
                onClick={startSetup}
                disabled={loading}
                className="px-4 py-2 bg-tea-green hover:bg-tea-green-dark text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
              >
                {loading ? "載入中…" : "啟用 2FA"}
              </button>
            ) : (
              <button
                onClick={() => { setState("disabling"); setCode(""); setError(""); setSuccess(""); }}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-xl transition"
              >
                停用 2FA
              </button>
            )}
          </div>
        )}

        {/* ─── 掃描 QR Code 並確認 ─── */}
        {state === "scanning" && (
          <form onSubmit={confirmSetup} className="space-y-4">
            <p className="text-sm text-tea-text-light">
              使用 Google Authenticator 或 Authy 掃描下方 QR Code，然後輸入 App 顯示的 6 位數驗證碼。
            </p>
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="2FA QR Code" className="w-48 h-48 mx-auto rounded-lg border border-tea-cream-dark" />
            )}
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
                className="w-full px-4 py-2.5 rounded-xl border border-tea-cream-dark bg-tea-cream text-tea-text text-sm placeholder-[#B8C4BC] focus:outline-none focus:ring-2 focus:ring-tea-green transition tracking-widest text-center text-lg"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="px-4 py-2 bg-tea-green hover:bg-tea-green-dark text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
              >
                {loading ? "確認中…" : "確認綁定"}
              </button>
              <button
                type="button"
                onClick={() => { setState("idle"); setError(""); }}
                className="px-4 py-2 text-tea-text-light text-sm rounded-xl border border-tea-cream-dark hover:bg-tea-cream transition"
              >
                取消
              </button>
            </div>
          </form>
        )}

        {/* ─── 停用確認 ─── */}
        {state === "disabling" && (
          <form onSubmit={confirmDisable} className="space-y-4">
            <p className="text-sm text-tea-text-light">
              輸入驗證器 App 的 6 位數驗證碼以確認停用 2FA。
            </p>
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
                className="w-full px-4 py-2.5 rounded-xl border border-tea-cream-dark bg-tea-cream text-tea-text text-sm placeholder-[#B8C4BC] focus:outline-none focus:ring-2 focus:ring-tea-green transition tracking-widest text-center text-lg"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
              >
                {loading ? "處理中…" : "確認停用"}
              </button>
              <button
                type="button"
                onClick={() => { setState("idle"); setError(""); }}
                className="px-4 py-2 text-tea-text-light text-sm rounded-xl border border-tea-cream-dark hover:bg-tea-cream transition"
              >
                取消
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
