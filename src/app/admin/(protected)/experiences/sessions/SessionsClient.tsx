"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function SessionsClient({ expTypes }: { expTypes: ExpType[] }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // 新增表單
  const [expId, setExpId]   = useState(expTypes[0]?.id ?? 0);
  const [date, setDate]     = useState("");
  const [time, setTime]     = useState("10:00");
  const [adding, setAdding] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/admin/experience-sessions");
    const data = await res.json();
    setSessions(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

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
      fetchSessions();
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
      fetchSessions();
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
      <div className="bg-white rounded-2xl p-6 border border-[#EDE8DC] shadow-sm">
        <h2 className="font-semibold text-[#3D4A42] mb-5">新增場次</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs text-[#6B8872] mb-1.5 block">體驗類型</label>
            <select
              value={expId}
              onChange={e => setExpId(Number(e.target.value))}
              className="w-full border border-[#C8DDD0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7D9B84]/30"
            >
              {expTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#6B8872] mb-1.5 block">日期</label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split("T")[0]}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-[#C8DDD0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7D9B84]/30"
            />
          </div>
          <div>
            <label className="text-xs text-[#6B8872] mb-1.5 block">時段</label>
            <select
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full border border-[#C8DDD0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7D9B84]/30"
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
              className="w-full bg-[#7D9B84] hover:bg-[#5C7A67] text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
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
      <div className="bg-white rounded-2xl border border-[#EDE8DC] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#EDE8DC]">
          <h2 className="font-semibold text-[#3D4A42]">近期場次</h2>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-[#6B8872]">載入中…</div>
        ) : sessions.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#6B8872]">尚無場次</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9F6F1] text-left">
                <th className="px-6 py-3 text-xs font-medium text-[#6B8872]">日期</th>
                <th className="px-4 py-3 text-xs font-medium text-[#6B8872]">時段</th>
                <th className="px-4 py-3 text-xs font-medium text-[#6B8872]">體驗</th>
                <th className="px-4 py-3 text-xs font-medium text-[#6B8872]">報名</th>
                <th className="px-4 py-3 text-xs font-medium text-[#6B8872]">狀態</th>
                <th className="px-4 py-3 text-xs font-medium text-[#6B8872]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F0E8]">
              {sessions.map(s => (
                <tr key={s.id} className="hover:bg-[#F9F6F1] transition-colors">
                  <td className="px-6 py-3.5 font-medium text-[#3D4A42]">{s.session_date}</td>
                  <td className="px-4 py-3.5 text-[#6B8872]">{s.start_time.slice(0, 5)}</td>
                  <td className="px-4 py-3.5 text-[#3D4A42]">{s.experience_types?.name}</td>
                  <td className="px-4 py-3.5 text-[#6B8872]">{s.current_participants} 人</td>
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
        )}
      </div>
    </div>
  );
}
