"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, CalendarClock, CheckCircle, Pin, Plus, Trash2 } from "lucide-react";

import {
  type Sortable,
  sortByManualOrder,
  sortExperiences,
} from "@/lib/experience-ordering";

// note 用 `string | undefined` 而非 `| null`，才與 AvailabilityWindow 相容
// （Row 要能直接餵給 sortExperiences／sortByManualOrder）
interface Win { id: string; startDate: string; endDate: string; note?: string }
interface Row extends Sortable {
  id: number;
  slug: string;
  name: string;
  price: number;
  sortOrder: number | null;
  pinnedUntil: string | null;
  windows: Win[];
  acceptsRequests: boolean;
  requestMinSlots: number | null;
  requestLeadDays: number | null;
  requestStartTimes: string[];
}

interface ApiWindow { id: string; start_date: string; end_date: string; note: string | null }
interface ApiRow {
  id: number; slug: string; name: string; price: number;
  sort_order: number | null; pinned_until: string | null;
  accepts_requests?: boolean;
  request_min_slots?: number | null;
  request_lead_days?: number | null;
  request_start_times?: string[];
  experience_availability_windows: ApiWindow[];
}
type ApiResult = { today: string; types: ApiRow[] } | { error: string };

/** 取資料、不碰 state（避免 effect 內同步 setState，沿用 SessionsClient 的作法） */
async function fetchOrdering(): Promise<ApiResult> {
  const res = await fetch("/api/admin/experience-ordering");
  return res.json();
}

function toRow(t: ApiRow): Row {
  return {
    id: t.id, slug: t.slug, name: t.name, price: t.price,
    sortOrder: t.sort_order, pinnedUntil: t.pinned_until,
    acceptsRequests: t.accepts_requests ?? false,
    requestMinSlots: t.request_min_slots ?? null,
    requestLeadDays: t.request_lead_days ?? null,
    requestStartTimes: t.request_start_times ?? [],
    windows: t.experience_availability_windows.map(w => ({
      id: w.id, startDate: w.start_date, endDate: w.end_date, note: w.note ?? undefined,
    })),
  };
}

function inSeason(r: Row, today: string) {
  return r.windows.find(w => w.startDate <= today && today <= w.endDate) ?? null;
}

/** 最後一段區間的結束日距今不到 30 天 → 該續填明年了 */
function needsRenewal(r: Row, today: string) {
  if (r.windows.length === 0) return false;
  const last = r.windows.map(w => w.endDate).sort().at(-1)!;
  if (last < today) return true;
  const days = Math.round(
    (Date.parse(`${last}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
  return days < 30;
}

export default function OrderingClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [today, setToday] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [openForm, setOpenForm] = useState<number | null>(null);
  const [form, setForm] = useState({ startDate: "", endDate: "", note: "" });

  /** 只寫 state，不發請求——effect 與事件處理器共用同一段落地邏輯 */
  function apply(data: ApiResult) {
    if ("error" in data) {
      setMsg({ type: "err", text: data.error });
      setRows([]);
    } else {
      setToday(data.today);
      // **依手動順序顯示，不是依前台的實際順序。**
      // 箭頭調的是手動順序；季節與釘選只是標籤。理由見 sortByManualOrder 的註解
      setRows(sortByManualOrder(data.types.map(toRow)) as Row[]);
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

  /**
   * 上移／下移：整份**手動順序**重送，後端重新編號。
   * 因為 rows 已經是手動順序（不含季節置頂的結果），重新編號不會把季節
   * 固化成手動順序——那正是 2026-08-21 踩到的坑。
   */
  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);   // 先動畫面，成功與否都會 refresh 回真實狀態
    const ok = await send("PATCH", { order: next.map(r => r.id) });
    if (ok) setMsg({ type: "ok", text: "手動順序已更新" });
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

  const effective = sortExperiences(rows, today) as Row[];

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

      {/* 前台實際順序：跟下面的手動順序刻意分開顯示，
          否則會誤以為箭頭調的就是客人看到的順序 */}
      <div className="bg-white rounded-xl border border-tea-green-pale/60 p-4">
        <h2 className="text-sm font-medium text-tea-text mb-2">客人實際看到的順序</h2>
        <ol className="text-sm text-tea-text-light space-y-1">
          {effective.map((r, i) => {
            const s = inSeason(r, today);
            const p = !!r.pinnedUntil && r.pinnedUntil >= today;
            return (
              <li key={r.id} className="flex items-center gap-2">
                <span className="tabular-nums text-xs w-5">{i + 1}.</span>
                <span className="text-tea-text">{r.name}</span>
                {p && <span className="text-xs text-amber-700">釘選中</span>}
                {s && <span className="text-xs text-tea-green">季節中</span>}
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-tea-text-light mt-3">
          今天（台灣時間）{today}　·　順序：釘選中 → 季節中 → 下方的手動順序 → 建立順序
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium text-tea-text mb-1">手動順序</h2>
        <p className="text-xs text-tea-text-light mb-3">
          箭頭調的是這一份順序。季節中與釘選中的體驗在前台會排到它之上，
          所以這裡的第一名不一定是客人看到的第一張。
        </p>
      </div>

      {rows.map((r, i) => {
        const season = inSeason(r, today);
        const pinned = !!r.pinnedUntil && r.pinnedUntil >= today;
        return (
          <div key={r.id} className="bg-white rounded-xl border border-tea-green-pale/60 p-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1 pt-0.5">
                <button
                  onClick={() => move(i, -1)}
                  disabled={busy || i === 0}
                  aria-label={`${r.name} 上移`}
                  className="p-1 rounded hover:bg-tea-cream disabled:opacity-30 disabled:cursor-not-allowed"
                ><ArrowUp className="w-4 h-4" /></button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={busy || i === rows.length - 1}
                  aria-label={`${r.name} 下移`}
                  className="p-1 rounded hover:bg-tea-cream disabled:opacity-30 disabled:cursor-not-allowed"
                ><ArrowDown className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-tea-text-light tabular-nums">#{i + 1}</span>
                  <span className="font-medium text-tea-text">{r.name}</span>
                  <span className="text-xs text-tea-text-light">NT$ {r.price}</span>
                  {pinned && (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      <Pin className="w-3 h-3" />釘選到 {r.pinnedUntil}
                    </span>
                  )}
                  {season && (
                    <span className="inline-flex items-center gap-1 text-xs bg-tea-green text-white px-2 py-0.5 rounded-full">
                      <CalendarClock className="w-3 h-3" />季節中，到 {season.endDate}
                    </span>
                  )}
                  {needsRenewal(r, today) && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      季節快用完了，記得續填明年
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-1.5">
                  {r.windows.length === 0 && (
                    <p className="text-xs text-tea-text-light">未設定季節區間——這一款不受季節限制</p>
                  )}
                  {[...r.windows]
                    .sort((a, b) => a.startDate.localeCompare(b.startDate))
                    .map(w => (
                      <div key={w.id} className="flex items-center gap-2 text-sm text-tea-text-light">
                        <span className="tabular-nums">{w.startDate} → {w.endDate}</span>
                        {w.note && <span className="text-xs">（{w.note}）</span>}
                        <button
                          onClick={() => removeWindow(w.id)}
                          disabled={busy}
                          aria-label={`刪除 ${r.name} 的 ${w.startDate} 至 ${w.endDate} 區間`}
                          className="p-1 rounded hover:bg-red-50 text-red-500 disabled:opacity-30"
                        ><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                </div>

                {/* 開課請求的可申請性參數。accepts_requests 是總開關——
                    關著的時候前台連入口都不會出現，逐款開啟就是上線節奏 */}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-tea-text-light border-t border-tea-green-pale/50 pt-3">
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={r.acceptsRequests}
                      disabled={busy}
                      onChange={async e => {
                        const ok = await send("PATCH", { requestParams: { id: r.id, acceptsRequests: e.target.checked } });
                        if (ok) setMsg({ type: "ok", text: e.target.checked ? "已開放客製開課申請" : "已關閉客製開課申請" });
                        refresh();
                      }}
                    />
                    開放客製開課申請
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    開團最低名額
                    <input
                      type="number" min={1} max={50} defaultValue={r.requestMinSlots ?? 4}
                      aria-label={`${r.name} 的開團最低名額`}
                      onBlur={async e => {
                        const v = Number(e.target.value);
                        if (!Number.isInteger(v) || v === r.requestMinSlots) return;
                        if (await send("PATCH", { requestParams: { id: r.id, requestMinSlots: v } })) {
                          setMsg({ type: "ok", text: `${r.name} 的開團最低名額改為 ${v}` });
                        }
                        refresh();
                      }}
                      className="w-16 border border-tea-green-pale rounded px-2 py-1"
                    />
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    最短前置天數
                    <input
                      type="number" min={0} max={90} defaultValue={r.requestLeadDays ?? 7}
                      aria-label={`${r.name} 的最短前置天數`}
                      onBlur={async e => {
                        const v = Number(e.target.value);
                        if (!Number.isInteger(v) || v === r.requestLeadDays) return;
                        if (await send("PATCH", { requestParams: { id: r.id, requestLeadDays: v } })) {
                          setMsg({ type: "ok", text: `${r.name} 的前置天數改為 ${v} 天` });
                        }
                        refresh();
                      }}
                      className="w-16 border border-tea-green-pale rounded px-2 py-1"
                    />
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    可申請時段
                    <input
                      type="text" defaultValue={r.requestStartTimes.join(",")}
                      placeholder="10:00,14:00"
                      aria-label={`${r.name} 的可申請時段`}
                      onBlur={async e => {
                        const times = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                        if (times.join(",") === r.requestStartTimes.join(",")) return;
                        if (await send("PATCH", { requestParams: { id: r.id, requestStartTimes: times } })) {
                          setMsg({ type: "ok", text: `${r.name} 的可申請時段改為 ${times.join("、")}` });
                        }
                        refresh();
                      }}
                      className="w-28 border border-tea-green-pale rounded px-2 py-1"
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <button
                    onClick={() => setOpenForm(openForm === r.id ? null : r.id)}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-tea-green-pale hover:bg-tea-cream"
                  ><Plus className="w-3.5 h-3.5" />新增季節區間</button>

                  {pinned ? (
                    <button
                      onClick={() => pin(r.id, null)}
                      disabled={busy}
                      className="text-xs px-3 py-1.5 rounded-lg border border-tea-green-pale hover:bg-tea-cream"
                    >取消釘選</button>
                  ) : (
                    <label className="inline-flex items-center gap-2 text-xs text-tea-text-light">
                      釘選到
                      <input
                        type="date"
                        min={today}
                        aria-label={`${r.name} 的釘選到期日`}
                        onChange={e => e.target.value && pin(r.id, e.target.value)}
                        className="border border-tea-green-pale rounded-lg px-2 py-1"
                      />
                    </label>
                  )}
                </div>

                {openForm === r.id && (
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
                      onClick={() => addWindow(r.id)}
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
