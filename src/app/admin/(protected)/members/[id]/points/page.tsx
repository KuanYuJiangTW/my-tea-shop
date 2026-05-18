"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PointTransaction = {
  id: string;
  points: number;
  type: string;
  description: string;
  admin_note: string | null;
  created_at: string;
  expires_at: string | null;
  is_flagged: boolean;
};

export default function MemberPointsPage() {
  const { id: userId } = useParams<{ id: string }>();
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [tierHistory, setTierHistory] = useState<Array<{ id: string; from_tier: string; to_tier: string; reason: string; triggered_by: string; changed_at: string }>>([]);

  // 調整表單
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState("");
  const [adjustSuccess, setAdjustSuccess] = useState("");

  async function fetchData() {
    setLoading(true);
    // Fetch tier history
    fetch(`/api/admin/members/${userId}/tier-history`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTierHistory(data); })
      .catch(() => {});

    const [txnRes, balRes] = await Promise.all([
      supabase
        .from("point_transactions")
        .select("id, points, type, description, admin_note, created_at, expires_at, is_flagged")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      // 簡易計算餘額
      supabase
        .from("point_transactions")
        .select("points")
        .eq("user_id", userId),
    ]);
    setTransactions(txnRes.data ?? []);
    const total = (balRes.data ?? []).reduce((s, t) => s + t.points, 0);
    setBalance(Math.max(total, 0));
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [userId]);

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    setAdjustError("");
    setAdjustSuccess("");
    const pts = parseInt(adjustPoints, 10);
    if (!pts || isNaN(pts)) { setAdjustError("請輸入有效的點數"); return; }
    if (!adjustNote.trim()) { setAdjustError("請填寫調整原因"); return; }

    setAdjusting(true);
    const res = await fetch("/api/admin/points-adjustment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, points: pts, adminId: "admin", adminNote: adjustNote }),
    });
    const data = await res.json();
    setAdjusting(false);

    if (!res.ok) { setAdjustError(data.error); return; }
    setAdjustSuccess(`已${pts > 0 ? "加" : "扣"}${Math.abs(pts)} 點`);
    setAdjustPoints("");
    setAdjustNote("");
    fetchData();
  }

  const typeLabel: Record<string, string> = {
    earn: "消費回饋",
    redeem: "折抵",
    refund: "退還",
    adjustment: "手動調整",
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold text-[#3D4A42] mb-1">會員點數管理</h1>
      <p className="text-sm text-[#6B8872] mb-6 font-mono">{userId}</p>

      {/* 餘額 */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] p-4 mb-6">
        <span className="text-sm text-[#6B8872]">有效餘額</span>
        <div className="text-2xl font-bold text-[#3D4A42]">
          {balance !== null ? `${balance.toLocaleString()} 點` : "—"}
        </div>
      </div>

      {/* 調整表單 */}
      <form onSubmit={handleAdjust} className="bg-white rounded-xl border border-[#EDE8DC] p-4 mb-6 space-y-3">
        <h2 className="text-sm font-semibold text-[#3D4A42]">手動調整</h2>
        <div className="flex gap-3">
          <input
            type="number"
            placeholder="點數（正=加，負=扣）"
            value={adjustPoints}
            onChange={e => setAdjustPoints(e.target.value)}
            className="flex-1 border border-[#D5CFC3] rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <textarea
          placeholder="調整原因（必填）"
          value={adjustNote}
          onChange={e => setAdjustNote(e.target.value)}
          className="w-full border border-[#D5CFC3] rounded-lg px-3 py-2 text-sm"
          rows={2}
        />
        {adjustError && <p className="text-xs text-red-600">{adjustError}</p>}
        {adjustSuccess && <p className="text-xs text-green-600">{adjustSuccess}</p>}
        <button
          type="submit"
          disabled={adjusting}
          className="bg-[#7D9B84] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#5C7A67] disabled:opacity-50"
        >
          {adjusting ? "處理中..." : "確認調整"}
        </button>
      </form>

      {/* 等級歷史 */}
      {tierHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-4 mb-6">
          <h2 className="text-sm font-semibold text-[#3D4A42] mb-2">等級變更紀錄</h2>
          <div className="space-y-1">
            {tierHistory.map(h => (
              <div key={h.id} className="text-xs text-[#3D4A42] flex gap-3">
                <span className="text-[#9CA89E] w-24 flex-shrink-0">{new Date(h.changed_at).toLocaleDateString("zh-TW")}</span>
                <span className="font-medium">{h.from_tier} → {h.to_tier}</span>
                <span className="text-[#6B8872]">{h.reason}</span>
                <span className="text-[#9CA89E]">by {h.triggered_by}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 歷史列表 */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#EDE8DC]">
          <h2 className="text-sm font-semibold text-[#3D4A42]">點數明細</h2>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-[#9CA89E]">載入中...</div>
        ) : transactions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[#9CA89E]">尚無記錄</div>
        ) : (
          <div className="divide-y divide-[#F5F0E8]">
            {transactions.map(t => (
              <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      t.type === "earn" ? "bg-green-100 text-green-700" :
                      t.type === "redeem" ? "bg-orange-100 text-orange-700" :
                      t.type === "adjustment" ? "bg-purple-100 text-purple-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {typeLabel[t.type] ?? t.type}
                    </span>
                    {t.is_flagged && <span className="text-xs text-red-500">⚠</span>}
                  </div>
                  <div className="text-sm text-[#3D4A42] mt-0.5 truncate">{t.description}</div>
                  {t.admin_note && <div className="text-xs text-[#9CA89E]">備註：{t.admin_note}</div>}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-sm font-semibold ${t.points >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {t.points > 0 ? "+" : ""}{t.points}
                  </div>
                  <div className="text-xs text-[#9CA89E]">
                    {new Date(t.created_at).toLocaleDateString("zh-TW")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
