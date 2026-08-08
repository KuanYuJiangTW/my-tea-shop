"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

interface ExpType { id: number; name: string; slug: string; }
interface Session {
  id: string;
  session_date: string;
  start_time: string;
  status: string;
  current_participants: number;
  experience_types: { name: string };
}

const TIME_SLOTS = ["10:00", "14:00"];

/** 只取資料、不碰 state。沿用原本語意：回應非陣列時視為空清單 */
async function fetchSessionList(): Promise<Session[]> {
  const res  = await fetch("/api/admin/experience-sessions");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export default function SessionsClient({ expTypes }: { expTypes: ExpType[] }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // 新增表單
  const [expId, setExpId]   = useState(expTypes[0]?.id ?? 0);
  const [date, setDate]     = useState("");
  const [time, setTime]     = useState("10:00");
  const [adding, setAdding] = useState(false);

  /**
   * 供新增／刪除場次後重新載入用。從事件處理器呼叫，setLoading 在此是允許的。
   *
   * 註：原本 effect 直接呼叫 fetchSessions()，而該函式開頭同步 setLoading(true)，
   * 屬 effect body 內同步 setState（`react-hooks/set-state-in-effect`）。現在取資料
   * 抽成模組層級的 fetchSessionList（不碰 state），effect 的 setState 只在 .then() 內。
   */
  function refreshSessions() {
    setLoading(true);
    fetchSessionList().then((list) => {
      setSessions(list);
      setLoading(false);
    });
  }

  // loading 初始值即為 true，所以掛載時不需要再設一次
  useEffect(() => {
    let cancelled = false;
    fetchSessionList().then((list) => {
      if (cancelled) return;
      setSessions(list);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  async function handleAdd() {
    if (!date) return setMsg({ type: "err", text: "請選擇日期" });
    setAdding(true);
    setMsg(null);

    const res = await fetch("/api/admin/experience-sessions", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experienceTypeId: expId, date, time }),
    });
    const data = await res.json();

    if (res.ok) {
      setMsg({ type: "ok", text: "場次新增成功" });
      setDate("");
      refreshSessions();
    } else {
      setMsg({ type: "err", text: data.error ?? "新增失敗" });
    }
    setAdding(false);
  }

  async function handleCancel(sessionId: string) {
    if (!confirm("確定取消此場次？")) return;
    const res = await fetch(`/api/admin/experience-sessions/${sessionId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (res.ok) {
      setMsg({ type: "ok", text: "場次已取消" });
      refreshSessions();
    } else {
      setMsg({ type: "err", text: "操作失敗" });
    }
  }

  const statusLabel: Record<string, string> = {
    open:      "開放中",
    full:      "額滿",
    cancelled: "已取消",
  };
  const statusStyle: Record<string, string> = {
    open:      "bg-emerald-100 text-emerald-700",
    full:      "bg-gray-100 text-gray-500",
    cancelled: "bg-red-100 text-red-500",
  };

  return (
    <div className="space-y-6">
      {/* 新增場次表單 */}
      <div className="bg-white rounded-2xl p-6 border border-tea-cream-dark shadow-sm">
        <h2 className="font-semibold text-tea-text mb-5">新增場次</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs text-tea-text-light mb-1.5 block">體驗類型</label>
            <select
              value={expId}
              onChange={e => setExpId(Number(e.target.value))}
              className="w-full border border-tea-green-pale rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/30"
            >
              {expTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-tea-text-light mb-1.5 block">日期</label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split("T")[0]}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-tea-green-pale rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/30"
            />
          </div>
          <div>
            <label className="text-xs text-tea-text-light mb-1.5 block">時段</label>
            <select
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full border border-tea-green-pale rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/30"
            >
              {TIME_SLOTS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="w-full bg-tea-green hover:bg-tea-green-dark text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {adding ? "新增中…" : "+ 新增"}
            </button>
          </div>
        </div>

        {msg && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${
            msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}>
            {msg.type === "ok"
              ? <CheckCircle className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />
            }
            {msg.text}
          </div>
        )}
      </div>

      {/* 場次列表 */}
      <div className="bg-white rounded-2xl border border-tea-cream-dark shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-tea-cream-dark">
          <h2 className="font-semibold text-tea-text">近期場次</h2>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-tea-text-light">載入中…</div>
        ) : sessions.length === 0 ? (
          <div className="p-10 text-center text-sm text-tea-text-light">尚無場次</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-tea-cream-light text-left">
                <th className="px-6 py-3 text-xs font-medium text-tea-text-light">日期</th>
                <th className="px-4 py-3 text-xs font-medium text-tea-text-light">時段</th>
                <th className="px-4 py-3 text-xs font-medium text-tea-text-light">體驗</th>
                <th className="px-4 py-3 text-xs font-medium text-tea-text-light">報名</th>
                <th className="px-4 py-3 text-xs font-medium text-tea-text-light">狀態</th>
                <th className="px-4 py-3 text-xs font-medium text-tea-text-light">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tea-cream">
              {sessions.map(s => (
                <tr key={s.id} className="hover:bg-tea-cream-light transition-colors">
                  <td className="px-6 py-3.5 font-medium text-tea-text">{s.session_date}</td>
                  <td className="px-4 py-3.5 text-tea-text-light">{s.start_time.slice(0, 5)}</td>
                  <td className="px-4 py-3.5 text-tea-text">{s.experience_types?.name}</td>
                  <td className="px-4 py-3.5 text-tea-text-light">{s.current_participants} 人</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[s.status] ?? ""}`}>
                      {statusLabel[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {s.status === "open" && (
                      <button
                        onClick={() => handleCancel(s.id)}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline"
                      >
                        取消場次
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
