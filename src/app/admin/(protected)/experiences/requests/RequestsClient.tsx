"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Mail, Phone, Users } from "lucide-react";

interface Row {
  id: string; request_no: string; status: string;
  experience_type_id: number; preferred_date: string; preferred_start_time: string;
  alt_date: string | null; alt_start_time: string | null;
  headcount: number; is_private: boolean;
  contact_name: string; contact_phone: string; contact_email: string;
  contact_line: string | null; contact_preference: string | null; contact_time: string | null;
  note: string | null; admin_note: string | null; decline_reason: string | null;
  token_expires_at: string | null; session_id: string | null;
  created_at: string; slots: number; total: number;
  experience_types: { name: string; slug: string } | null;
}
interface Group {
  experience: string; date: string; time: string;
  count: number; people: number; revenue: number; ids: string[];
}
type Result = { items: Row[]; groups: Group[] } | { error: string };

const TABS: { key: string; label: string }[] = [
  { key: "pending",             label: "待審" },
  { key: "approved",            label: "已核准" },
  { key: "alternative_offered", label: "已提替代方案" },
  { key: "converted",           label: "已成交" },
  { key: "declined",            label: "已婉拒" },
  { key: "all",                 label: "全部" },
];

const STATUS_LABEL: Record<string, string> = {
  pending: "待審", approved: "已核准", alternative_offered: "已提替代方案",
  declined: "已婉拒", expired: "已逾期", withdrawn: "客人撤回", converted: "已成交",
};

async function fetchRequests(status: string): Promise<Result> {
  const res = await fetch(`/api/admin/experience-requests?status=${status}`);
  return res.json();
}

export default function RequestsClient() {
  const [rows, setRows]     = useState<Row[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tab, setTab]       = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [notes, setNotes]   = useState<Record<string, string>>({});

  function apply(data: Result) {
    if ("error" in data) { setMsg({ type: "err", text: data.error }); setRows([]); setGroups([]); }
    else {
      setRows(data.items);
      setGroups(data.groups);
      setNotes(Object.fromEntries(data.items.map(r => [r.id, r.admin_note ?? ""])));
    }
    setLoading(false);
  }

  /** 首次載入與換分頁。不能直接呼叫會同步 setLoading 的函式（react-hooks/set-state-in-effect） */
  useEffect(() => {
    let cancelled = false;
    fetchRequests(tab).then(d => { if (!cancelled) apply(d); });
    return () => { cancelled = true; };
  }, [tab]);

  function reload() { setLoading(true); fetchRequests(tab).then(apply); }

  async function act(id: string, path: string, body?: unknown, method = "POST") {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/admin/experience-requests/${id}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      // 衝突時把既有場次的資訊講出來，讓業主知道下一步該做什麼
      const extra = data.session ? `（既有場次還有 ${data.session.availableSpots} 個名額）` : "";
      setMsg({ type: "err", text: (data.error ?? "操作失敗") + extra });
      return false;
    }
    return true;
  }

  async function approve(id: string) {
    if (await act(id, "/approve")) setMsg({ type: "ok", text: "已核准，核准信與專屬連結已寄出" });
    reload();
  }

  /** 整組核准：只建一個場次，每筆各自拿到 token 與核准信 */
  async function approveGroup(g: Group) {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/admin/experience-requests/approve-group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: g.ids }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setMsg({ type: "err", text: data.error ?? "整組核准失敗" });
    else setMsg({
      type: "ok",
      text: `已為 ${g.date} ${g.time} 開一場，${data.approved} 筆申請都收到專屬連結了` +
            (data.failed?.length ? `（${data.failed.length} 筆沒處理成功）` : ""),
    });
    reload();
  }

  async function decline(id: string) {
    const reason = window.prompt("婉拒原因（會寫進信裡，可留空）") ?? "";
    if (await act(id, "/decline", { reason })) setMsg({ type: "ok", text: "已婉拒，信中附上了最近的可預約場次" });
    reload();
  }

  async function offerAlternatives(id: string) {
    const raw = window.prompt("候選日期時段，一行一組，格式 2026-09-28 14:00（最多三組）") ?? "";
    const alternatives = raw.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
      const [date, time] = l.split(/\s+/);
      return { date, time };
    });
    if (alternatives.length === 0) return;
    if (await act(id, "/alternatives", { alternatives })) setMsg({ type: "ok", text: "已寄出替代方案，客人可以一鍵選" });
    reload();
  }

  async function revoke(id: string) {
    if (!window.confirm("撤銷核准會回收場次並讓連結失效，確定嗎？")) return;
    if (await act(id, "/revoke")) setMsg({ type: "ok", text: "已撤銷核准" });
    reload();
  }

  async function saveNote(id: string) {
    if (await act(id, "/note", { note: notes[id] }, "PATCH")) setMsg({ type: "ok", text: "備註已儲存" });
  }

  if (loading) return <p className="text-tea-text-light">載入中…</p>;

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
          msg.type === "ok" ? "bg-tea-green-mist text-tea-green-dark" : "bg-red-50 text-red-700"
        }`}>
          {msg.type === "ok" ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                             : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setLoading(true); setTab(t.key); }}
            className={`text-sm px-3 py-1.5 rounded-lg border ${
              tab === t.key ? "bg-tea-green text-white border-tea-green" : "border-tea-green-pale hover:bg-tea-cream"
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* 聚合：散著看是三筆待審，聚起來是一場滿團 */}
      {groups.length > 0 && (
        <div className="bg-tea-green-mist rounded-xl border border-tea-green-pale p-4">
          <h2 className="text-sm font-medium text-tea-text mb-2">同一時段擠在一起的申請</h2>
          <ul className="space-y-2">
            {groups.map((g, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-sm text-tea-text-light">
                <span className="text-tea-text font-medium">{g.experience}</span>
                <span>{g.date} {g.time}</span>
                <span>{g.count} 筆・合計 {g.people} 人・約 NT$ {g.revenue.toLocaleString()}</span>
                <button
                  onClick={() => approveGroup(g)}
                  disabled={busy}
                  className="text-xs px-3 py-1 rounded-lg bg-tea-green text-white disabled:opacity-40"
                >為這個時段開課</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rows.length === 0 && <p className="text-sm text-tea-text-light">這個分頁沒有資料。</p>}

      {rows.map(r => (
        <div key={r.id} className="bg-white rounded-xl border border-tea-green-pale/60 p-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs text-tea-text-light tabular-nums">{r.request_no}</span>
            <span className="font-medium text-tea-text">{r.experience_types?.name}</span>
            <span className="text-sm text-tea-text">{r.preferred_date} {String(r.preferred_start_time).slice(0, 5)}</span>
            <span className="inline-flex items-center gap-1 text-xs text-tea-text-light">
              <Users className="w-3.5 h-3.5" />{r.headcount} 人・收 {r.slots} 個名額・NT$ {r.total.toLocaleString()}
            </span>
            {r.is_private && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">想包場</span>}
            <span className="text-xs bg-tea-cream px-2 py-0.5 rounded-full">{STATUS_LABEL[r.status] ?? r.status}</span>
            {r.token_expires_at && r.status === "approved" && (
              <span className="text-xs text-tea-text-light">連結至 {r.token_expires_at.slice(0, 16).replace("T", " ")}</span>
            )}
          </div>

          {r.alt_date && (
            <p className="text-sm text-tea-text-light mb-1">
              客人給的備選：{r.alt_date} {String(r.alt_start_time ?? "").slice(0, 5)}
            </p>
          )}
          {r.note && <p className="text-sm text-tea-text-light mb-2">客人備註：{r.note}</p>}

          <div className="flex flex-wrap gap-3 text-sm mb-3">
            <span className="text-tea-text">{r.contact_name}</span>
            <a href={`tel:${r.contact_phone}`} className="inline-flex items-center gap-1.5 text-tea-green hover:underline">
              <Phone className="w-4 h-4" />{r.contact_phone}
            </a>
            <a
              href={`mailto:${r.contact_email}?subject=${encodeURIComponent(`【霧抉茶】關於你的開課申請 ${r.request_no}`)}&body=${encodeURIComponent(
                `${r.contact_name} 你好：\n\n關於你申請的「${r.experience_types?.name ?? ""}」${r.preferred_date} ${String(r.preferred_start_time).slice(0, 5)}（${r.headcount} 人），\n\n`,
              )}`}
              className="inline-flex items-center gap-1.5 text-tea-green hover:underline"
            ><Mail className="w-4 h-4" />{r.contact_email}</a>
            {r.contact_line && <span className="text-tea-text-light">LINE：{r.contact_line}</span>}
            {r.contact_time && <span className="text-tea-text-light">方便時段：{r.contact_time}</span>}
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {r.status === "pending" && (
              <>
                <button onClick={() => approve(r.id)} disabled={busy}
                  className="text-xs px-3 py-1.5 rounded-lg bg-tea-green text-white disabled:opacity-40">核准並開課</button>
                <button onClick={() => offerAlternatives(r.id)} disabled={busy}
                  className="text-xs px-3 py-1.5 rounded-lg border border-tea-green-pale hover:bg-tea-cream">提替代方案</button>
                <button onClick={() => decline(r.id)} disabled={busy}
                  className="text-xs px-3 py-1.5 rounded-lg border border-tea-green-pale hover:bg-tea-cream">婉拒</button>
              </>
            )}
            {r.status === "alternative_offered" && (
              <button onClick={() => decline(r.id)} disabled={busy}
                className="text-xs px-3 py-1.5 rounded-lg border border-tea-green-pale hover:bg-tea-cream">婉拒</button>
            )}
            {r.status === "approved" && (
              <button onClick={() => revoke(r.id)} disabled={busy}
                className="text-xs px-3 py-1.5 rounded-lg border border-tea-green-pale hover:bg-tea-cream">撤銷核准</button>
            )}
          </div>

          {/* 內部備註：電話聊完的結論寫這裡，客人看不到 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={notes[r.id] ?? ""}
              onChange={e => setNotes({ ...notes, [r.id]: e.target.value })}
              placeholder="內部備註（客人看不到）"
              className="flex-1 border border-tea-green-pale rounded-lg px-3 py-1.5 text-sm"
            />
            <button onClick={() => saveNote(r.id)} disabled={busy}
              className="text-xs px-3 py-1.5 rounded-lg border border-tea-green-pale hover:bg-tea-cream">存備註</button>
          </div>
        </div>
      ))}
    </div>
  );
}
