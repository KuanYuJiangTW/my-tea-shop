"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, CalendarClock, CheckCircle, Pin, Plus, Trash2 } from "lucide-react";

interface WindowRow { id: string; start_date: string; end_date: string; note: string | null }
interface TypeRow {
  id: number;
  slug: string;
  name: string;
  name_en: string;
  price: number;
  is_active: boolean;
  sort_order: number | null;
  pinned_until: string | null;
  experience_availability_windows: WindowRow[];
}

/** 取資料、不碰 state（避免 effect 內同步 setState，沿用 SessionsClient 的作法） */
async function fetchOrdering(): Promise<{ today: string; types: TypeRow[] } | { error: string }> {
  const res = await fetch("/api/admin/experience-ordering");
  return res.json();
}

/** 排序鍵與前台一致：釘選中 → 季節中 → sort_order → id */
function rank(t: TypeRow, today: string) {
  const pinned = t.pinned_until && t.pinned_until >= today ? 0 : 1;
  const season = t.experience_availability_windows.some(
    w => w.start_date <= today && today <= w.end_date,
  ) ? 0 : 1;
  return [pinned, season, t.sort_order ?? 100, t.id];
}

function inSeason(t: TypeRow, today: string) {
  return t.experience_availability_windows.find(w => w.start_date <= today && today <= w.end_date) ?? null;
}

/** 最後一段區間的結束日距今不到 30 天 → 該續填明年了 */
function needsRenewal(t: TypeRow, today: string) {
  const ws = t.experience_availability_windows;
  if (ws.length === 0) return false;
  const last = ws.map(w => w.end_date).sort().at(-1)!;
  if (last < today) return true;
  const days = Math.round(
    (Date.parse(`${last}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
  return days < 30;
}

export default function OrderingClient() {
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [today, setToday] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // 新增季節區間的表單（哪一款正在展開）
  const [openForm, setOpenForm] = useState<number | null>(null);
  const [form, setForm] = useState({ startDate: "", endDate: "", note: "" });

  /** 只寫 state，不發請求——effect 與事件處理器共用同一段落地邏輯 */
  function apply(data: Awaited<ReturnType<typeof fetchOrdering>>) {
    if ("error" in data) {
      setMsg({ type: "err", text: data.error });
      setTypes([]);
    } else {
      setToday(data.today);
      setTypes([...data.types].sort((a, b) => {
        const ra = rank(a, data.today);
        const rb = rank(b, data.today);
        for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
        return 0;
      }));
    }
    setLoading(false);
  }

  /** 事件處理器用（新增／刪除／重排之後）。這裡的 setLoading 是允許的 */
  function refresh() {
    setLoading(true);
    fetchOrdering().then(apply);
  }

  /**
   * 首次載入。**不能直接 `useEffect(refresh, [])`**——refresh 開頭同步
   * setLoading(true)，那是 effect body 內的同步 setState
   * （`react-hooks/set-state-in-effect`，SessionsClient 也踩過同一條）。
   * loading 的初始值本來就是 true，這裡只要在回應到達時落地即可。
   */
  useEffect(() => {
    let cancelled = false;
    fetchOrdering().then(data => { if (!cancelled) apply(data); });
    return () => { cancelled = true; };
  }, []);

  async function send(method: string, body?: unknown, query = "") {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/experience-ordering${query}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg({ type: "err", text: data.error ?? "操作失敗" });
      return false;
    }
    return true;
  }

  /** 上移／下移：整份順序重送，後端重新編號（見 API route 的註解） */
  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= types.length) return;
    const next = [...types];
    [next[index], next[target]] = [next[target], next[index]];
    setTypes(next);   // 先動畫面，成功與否都會 refresh 回真實狀態
    const ok = await send("PATCH", { order: next.map(t => t.id) });
    if (ok) setMsg({ type: "ok", text: "順序已更新" });
    refresh();
  }

  async function pin(id: number, until: string | null) {
    const ok = await send("PATCH", { id, pinnedUntil: until });
    if (ok) setMsg({ type: "ok", text: until ? `已釘選到 ${until}` : "已取消釘選" });
    refresh();
  }

  async function addWindow(typeId: number) {
    const ok = await send("POST", {
      experienceTypeId: typeId,
      startDate: form.startDate,
      endDate: form.endDate,
      note: form.note,
    });
    if (ok) {
      setMsg({ type: "ok", text: "季節區間已新增" });
      setOpenForm(null);
      setForm({ startDate: "", endDate: "", note: "" });
    }
    refresh();
  }

  async function removeWindow(windowId: string) {
    const ok = await send("DELETE", undefined, `?windowId=${windowId}`);
    if (ok) setMsg({ type: "ok", text: "季節區間已刪除" });
    refresh();
  }

  if (loading) return <p className="text-tea-text-light">載入中…</p>;

  const pinnedExists = types.some(t => t.pinned_until && t.pinned_until >= today);
  const seasonExists = types.some(t => inSeason(t, today));

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
          msg.type === "ok" ? "bg-tea-green-mist text-tea-green-dark" : "bg-red-50 text-red-700"
        }`}>
          {msg.type === "ok"
            ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {pinnedExists && seasonExists && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 text-amber-800 px-4 py-3 text-sm">
          <Pin className="w-4 h-4 mt-0.5 shrink-0" />
          <span>目前有釘選中的體驗，它會排在季節中的體驗之前。</span>
        </div>
      )}

      <p className="text-xs text-tea-text-light">
        今天（台灣時間）{today}　·　順序：釘選中 → 季節中 → 手動順序 → 建立順序
      </p>

      {types.map((t, i) => {
        const season = inSeason(t, today);
        const pinned = !!t.pinned_until && t.pinned_until >= today;
        return (
          <div key={t.id} className="bg-white rounded-xl border border-tea-green-pale/60 p-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1 pt-0.5">
                <button
                  onClick={() => move(i, -1)}
                  disabled={busy || i === 0}
                  aria-label={`${t.name} 上移`}
                  className="p-1 rounded hover:bg-tea-cream disabled:opacity-30 disabled:cursor-not-allowed"
                ><ArrowUp className="w-4 h-4" /></button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={busy || i === types.length - 1}
                  aria-label={`${t.name} 下移`}
                  className="p-1 rounded hover:bg-tea-cream disabled:opacity-30 disabled:cursor-not-allowed"
                ><ArrowDown className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-tea-text-light tabular-nums">#{i + 1}</span>
                  <span className="font-medium text-tea-text">{t.name}</span>
                  <span className="text-xs text-tea-text-light">NT$ {t.price}</span>
                  {pinned && (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      <Pin className="w-3 h-3" />釘選到 {t.pinned_until}
                    </span>
                  )}
                  {season && (
                    <span className="inline-flex items-center gap-1 text-xs bg-tea-green text-white px-2 py-0.5 rounded-full">
                      <CalendarClock className="w-3 h-3" />季節中，到 {season.end_date}
                    </span>
                  )}
                  {needsRenewal(t, today) && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      季節快用完了，記得續填明年
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-1.5">
                  {t.experience_availability_windows.length === 0 && (
                    <p className="text-xs text-tea-text-light">未設定季節區間——這一款不受季節限制</p>
                  )}
                  {[...t.experience_availability_windows]
                    .sort((a, b) => a.start_date.localeCompare(b.start_date))
                    .map(w => (
                      <div key={w.id} className="flex items-center gap-2 text-sm text-tea-text-light">
                        <span className="tabular-nums">{w.start_date} → {w.end_date}</span>
                        {w.note && <span className="text-xs">（{w.note}）</span>}
                        <button
                          onClick={() => removeWindow(w.id)}
                          disabled={busy}
                          aria-label={`刪除 ${t.name} 的 ${w.start_date} 至 ${w.end_date} 區間`}
                          className="p-1 rounded hover:bg-red-50 text-red-500 disabled:opacity-30"
                        ><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <button
                    onClick={() => setOpenForm(openForm === t.id ? null : t.id)}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-tea-green-pale hover:bg-tea-cream"
                  ><Plus className="w-3.5 h-3.5" />新增季節區間</button>

                  {pinned ? (
                    <button
                      onClick={() => pin(t.id, null)}
                      disabled={busy}
                      className="text-xs px-3 py-1.5 rounded-lg border border-tea-green-pale hover:bg-tea-cream"
                    >取消釘選</button>
                  ) : (
                    <label className="inline-flex items-center gap-2 text-xs text-tea-text-light">
                      釘選到
                      <input
                        type="date"
                        min={today}
                        aria-label={`${t.name} 的釘選到期日`}
                        onChange={e => e.target.value && pin(t.id, e.target.value)}
                        className="border border-tea-green-pale rounded-lg px-2 py-1"
                      />
                    </label>
                  )}
                </div>

                {openForm === t.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 bg-tea-cream-light rounded-lg p-3">
                    <label className="text-xs text-tea-text-light">
                      開始
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={e => setForm({ ...form, startDate: e.target.value })}
                        className="block border border-tea-green-pale rounded-lg px-2 py-1 mt-1"
                      />
                    </label>
                    <label className="text-xs text-tea-text-light">
                      結束
                      <input
                        type="date"
                        value={form.endDate}
                        min={form.startDate}
                        onChange={e => setForm({ ...form, endDate: e.target.value })}
                        className="block border border-tea-green-pale rounded-lg px-2 py-1 mt-1"
                      />
                    </label>
                    <label className="text-xs text-tea-text-light flex-1 min-w-[10rem]">
                      說明（選填）
                      <input
                        type="text"
                        value={form.note}
                        maxLength={200}
                        placeholder="例如：萬鷺朝鳳鳥況期"
                        onChange={e => setForm({ ...form, note: e.target.value })}
                        className="block w-full border border-tea-green-pale rounded-lg px-2 py-1 mt-1"
                      />
                    </label>
                    <button
                      onClick={() => addWindow(t.id)}
                      disabled={busy || !form.startDate || !form.endDate}
                      className="text-xs px-4 py-2 rounded-lg bg-tea-green text-white disabled:opacity-40"
                    >新增</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
