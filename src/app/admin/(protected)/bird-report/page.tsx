"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 今日鳥況——後台。
 *
 * 設計目標只有一個：**在手機上十秒內完成**。業主每天要用，更新成本超過十秒
 * 就不會有人做，功能等於不存在（見 design.md 的風險段）。
 *
 * 所以整頁只有三樣東西：現在對外顯示什麼、一個輸入框、一顆送出鍵。
 * 沒有等級下拉、沒有日期選擇器、沒有編輯與刪除——送錯了補送一則就蓋過去。
 */

type Status = "showing" | "expired" | "offSeason" | "none";

interface Report { note: string; reportedAt: string }

const STATUS_TEXT: Record<Status, { label: string; tone: string }> = {
  showing:   { label: "正在對外顯示",             tone: "bg-tea-green-pale/40 text-tea-green-ink" },
  expired:   { label: "已超過 48 小時，目前沒有顯示", tone: "bg-amber-50 text-amber-700" },
  offSeason: { label: "季節外，目前沒有顯示",        tone: "bg-tea-cream text-tea-text-muted" },
  none:      { label: "還沒有任何回報",             tone: "bg-tea-cream text-tea-text-muted" },
};

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("zh-TW", {
    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Taipei",
  }).format(new Date(iso));

/** 只負責取回資料，不碰任何狀態——狀態交給 apply()，effect 才不會出現同步 setState */
async function fetchLatest() {
  const r = await fetch("/api/admin/bird-report");
  return { ok: r.ok, d: await r.json() };
}

export default function BirdReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // 「取資料」與「套用狀態」拆開，effect 裡只出現 promise chain。
  // 在 effect 內同步呼叫含 setState 的函式會觸發串聯重繪，專案 lint 直接擋
  // ——沿用本 repo 既有寫法（見 admin/(protected)/settings/page.tsx）
  const apply = useCallback((ok: boolean, d: { report?: Report; status?: Status; error?: string }) => {
    if (!ok) { setError(d.error ?? "讀取失敗"); return; }
    setReport(d.report ?? null);
    setStatus(d.status ?? "none");
    setError("");
  }, []);

  const load = useCallback(
    () => fetchLatest().then(({ ok, d }) => apply(ok, d)).catch(() => setError("讀取失敗，請重新整理")),
    [apply],
  );

  useEffect(() => {
    fetchLatest()
      .then(({ ok, d }) => apply(ok, d))
      .catch(() => setError("讀取失敗，請重新整理"));
  }, [apply]);

  async function submit() {
    if (!note.trim() || saving) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const r = await fetch("/api/admin/bird-report", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ note }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "送出失敗"); return; }
      setNote(""); setSaved(true);
      await load();
    } catch {
      setError("送出失敗，請再試一次");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-2xl font-bold text-tea-text mb-1">今日鳥況</h1>
      <p className="text-body text-tea-text-muted mb-6">
        寫一行今天或昨天的實際狀況。<strong className="text-tea-text">超過 48 小時會自動不顯示</strong>，
        沒把握就不用寫，不需要回來關掉。
      </p>

      {/* 業主打開頁面的第一個問題永遠是「現在網站上寫的是什麼」 */}
      <section className="rounded-2xl border border-tea-green-pale bg-white p-5 mb-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-label font-medium text-tea-text">目前對外顯示</h2>
          {status && (
            <span className={`text-caption px-2.5 py-1 rounded-pill ${STATUS_TEXT[status].tone}`}>
              {STATUS_TEXT[status].label}
            </span>
          )}
        </div>
        {report ? (
          <>
            <p className="text-body text-tea-text">{report.note}</p>
            <p className="text-caption text-tea-text-muted mt-1.5">回報於 {fmt(report.reportedAt)}</p>
          </>
        ) : (
          <p className="text-body text-tea-text-muted">—</p>
        )}
      </section>

      <label htmlFor="note" className="block text-label font-medium text-tea-text mb-2">
        新的一則
      </label>
      <textarea
        id="note"
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="例：今天下午 4 點，溪谷方向一大群，大概半小時"
        className="w-full rounded-2xl border border-tea-green-pale bg-white px-4 py-3 text-body text-tea-text placeholder:text-tea-text-muted/70 focus:outline-none focus:ring-2 focus:ring-tea-green-ink/30"
      />

      {/* 寫法提示。事實不扣分，評價會——而且事實對客人更有用 */}
      <p className="text-caption text-tea-text-muted mt-2">
        寫事實不要寫評價：「下午下雨，四點後只看到零星幾隻」比「鳥況很差」有用。
        照實寫壞天氣不會扣分，只報好消息才會讓人不再相信。
      </p>

      <div className="flex items-center gap-3 mt-4">
        <button
          type="button"
          onClick={submit}
          disabled={!note.trim() || saving}
          className="px-6 py-3 rounded-pill bg-tea-green-ink text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-tea-green-dark transition-colors duration-base ease-standard"
        >
          {saving ? "送出中…" : "送出"}
        </button>
        {saved && <span className="text-caption text-tea-green-ink">已更新</span>}
        {error && <span className="text-caption text-red-600">{error}</span>}
      </div>
    </div>
  );
}
