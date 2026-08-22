"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Mail, MessageCircle, Users } from "lucide-react";

interface Row {
  id: string;
  experience_type_id: number;
  contact_email: string | null;
  contact_line: string | null;
  preferred_date: string | null;
  headcount: number | null;
  note: string | null;
  source: string;
  handled_at: string | null;
  created_at: string;
  experience_types: { name: string; slug: string } | null;
}
interface Group { experience: string; date: string | null; count: number; people: number }
type Result = { items: Row[]; groups: Group[] } | { error: string };

async function fetchInterest(all: boolean): Promise<Result> {
  const res = await fetch(`/api/admin/experience-interest${all ? "?all=1" : ""}`);
  return res.json();
}

export default function InterestClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [all, setAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function apply(data: Result) {
    if ("error" in data) { setMsg({ type: "err", text: data.error }); setRows([]); setGroups([]); }
    else { setRows(data.items); setGroups(data.groups); }
    setLoading(false);
  }

  /** 首次載入不能直接呼叫會同步 setLoading 的函式（react-hooks/set-state-in-effect） */
  useEffect(() => {
    let cancelled = false;
    fetchInterest(all).then(d => { if (!cancelled) apply(d); });
    return () => { cancelled = true; };
  }, [all]);

  async function toggle(id: string, handled: boolean) {
    setMsg(null);
    const res = await fetch("/api/admin/experience-interest", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, handled }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setMsg({ type: "err", text: d.error ?? "操作失敗" });
      return;
    }
    setMsg({ type: "ok", text: handled ? "已標記處理過" : "已標記為未處理" });
    setLoading(true);
    fetchInterest(all).then(apply);
  }

  if (loading) return <p className="text-tea-text-light">載入中…</p>;

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

      {/* 成團機會：散著看看不出來，同一天同一款擠在一起才是該開課的訊號 */}
      {groups.length > 0 && (
        <div className="bg-tea-green-mist rounded-xl border border-tea-green-pale p-4">
          <h2 className="text-sm font-medium text-tea-text mb-2">可能可以開一場</h2>
          <ul className="text-sm text-tea-text-light space-y-1">
            {groups.map((g, i) => (
              <li key={i}>
                <span className="text-tea-text font-medium">{g.experience}</span>
                {g.date ? `・${g.date}` : "・未指定日期"}
                　{g.count} 筆
                {g.people > 0 && `・合計 ${g.people} 人`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className="inline-flex items-center gap-2 text-sm text-tea-text-light">
        <input type="checkbox" checked={all} onChange={e => { setLoading(true); setAll(e.target.checked); }} />
        連已處理的一起顯示
      </label>

      {rows.length === 0 && (
        <p className="text-tea-text-light text-sm">
          {all ? "還沒有任何登記。" : "沒有未處理的登記。"}
        </p>
      )}

      {rows.map(r => (
        <div key={r.id} className="bg-white rounded-xl border border-tea-green-pale/60 p-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-medium text-tea-text">{r.experience_types?.name ?? `#${r.experience_type_id}`}</span>
            {r.preferred_date && (
              <span className="text-xs bg-tea-cream px-2 py-0.5 rounded-full text-tea-text">
                想要 {r.preferred_date}
              </span>
            )}
            {r.headcount && (
              <span className="inline-flex items-center gap-1 text-xs text-tea-text-light">
                <Users className="w-3.5 h-3.5" />{r.headcount} 人
              </span>
            )}
            {r.source === "off-season" && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">季節外通知</span>
            )}
            {r.handled_at && (
              <span className="text-xs bg-tea-text-light/15 text-tea-text-light px-2 py-0.5 rounded-full">已處理</span>
            )}
            <span className="text-xs text-tea-text-light ml-auto">{r.created_at.slice(0, 16).replace("T", " ")}</span>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            {r.contact_email && (
              <a href={`mailto:${r.contact_email}`} className="inline-flex items-center gap-1.5 text-tea-green hover:underline">
                <Mail className="w-4 h-4" />{r.contact_email}
              </a>
            )}
            {r.contact_line && (
              <span className="inline-flex items-center gap-1.5 text-tea-text-light">
                <MessageCircle className="w-4 h-4" />LINE：{r.contact_line}
              </span>
            )}
          </div>

          {r.note && <p className="text-sm text-tea-text-light mt-2">{r.note}</p>}

          <button
            onClick={() => toggle(r.id, !r.handled_at)}
            className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-tea-green-pale hover:bg-tea-cream"
          >
            {r.handled_at ? "標記為未處理" : "標記處理過"}
          </button>
        </div>
      ))}
    </div>
  );
}
