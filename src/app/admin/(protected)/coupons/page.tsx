"use client";

import { useState, useEffect } from "react";

type UniversalCoupon = {
  id: string;
  name: string;
  code: string;
  discount_amount: number;
  min_order_amount: number;
  max_uses: number | null;
  max_uses_per_user: number;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  used_count: number;
  usage_rate: number | null;
};

type Tab = "universal" | "batch";

/**
 * 只取資料、不碰 state。回傳 null 表示回應不是陣列（API 錯誤），
 * 呼叫端據此決定不覆蓋既有清單。
 */
async function fetchCouponList(tab: Tab): Promise<unknown[] | null> {
  const res = await fetch(`/api/admin/coupons?type=${tab}`);
  const data = await res.json();
  return Array.isArray(data) ? data : null;
}

export default function CouponsPage() {
  const [tab, setTab] = useState<Tab>("universal");
  const [universalList, setUniversalList] = useState<UniversalCoupon[]>([]);
  const [batchList, setBatchList] = useState<Record<string, unknown>[]>([]);
  // 記「目前顯示的清單屬於哪個 tab」，loading 就能推導出來——切換 tab 時
  // loadedTab 還是舊值，自然是 loading，不需要在 effect 裡同步 setLoading(true)
  const [loadedTab, setLoadedTab] = useState<Tab | null>(null);
  const loading = loadedTab !== tab;
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  // Universal form
  const [uForm, setUForm] = useState({ code: "", name: "", discount_amount: 50, min_order_amount: 0, max_uses: 100, max_uses_per_user: 1, expires_at: "" });

  /**
   * 寫入某個 tab 的清單。取資料的部分抽成模組層級的 `fetchCouponList`（不碰 state），
   * setState 只發生在 `.then()` callback 內——原本 effect 直接呼叫會 setState 的
   * `fetchData()`，且該函式開頭同步 `setLoading(true)`，屬 effect body 內同步 setState。
   *
   * 回傳 null（回應非陣列）時不覆蓋既有清單，沿用原本 `if (Array.isArray(data))` 的語意。
   */
  function commitList(which: Tab, list: unknown[] | null) {
    if (list) {
      if (which === "universal") setUniversalList(list as UniversalCoupon[]);
      else setBatchList(list as Record<string, unknown>[]);
    }
    setLoadedTab(which);
  }

  /** 供建立／作廢後重新載入當前 tab 用 */
  function refreshData() {
    setLoadedTab(null);
    fetchCouponList(tab).then((list) => commitList(tab, list));
  }

  useEffect(() => {
    let cancelled = false;
    const which = tab;
    fetchCouponList(which).then((list) => {
      if (!cancelled) commitList(which, list);
    });
    return () => { cancelled = true; };
  }, [tab]);

  async function handleCreateUniversal(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "universal", ...uForm, expires_at: new Date(uForm.expires_at).toISOString() }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "建立失敗"); return; }
    setShowForm(false);
    setUForm({ code: "", name: "", discount_amount: 50, min_order_amount: 0, max_uses: 100, max_uses_per_user: 1, expires_at: "" });
    refreshData();
  }

  async function toggleActive(id: string) {
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    refreshData();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#3D4A42] font-serif">折價券管理</h1>
        {tab === "universal" && (
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[#7D9B84] text-white text-sm rounded-xl hover:bg-[#5C7A67] transition">
            新增通用碼
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("universal")}
          className={`px-4 py-2 text-sm rounded-lg transition ${tab === "universal" ? "bg-[#7D9B84] text-white" : "bg-[#EDE8DC] text-[#6B8872] hover:bg-[#D5E8DA]"}`}>
          通用碼
        </button>
        <button onClick={() => setTab("batch")}
          className={`px-4 py-2 text-sm rounded-lg transition ${tab === "batch" ? "bg-[#7D9B84] text-white" : "bg-[#EDE8DC] text-[#6B8872] hover:bg-[#D5E8DA]"}`}>
          批次券
        </button>
      </div>

      {/* Universal form */}
      {showForm && tab === "universal" && (
        <form onSubmit={handleCreateUniversal} className="bg-white rounded-2xl border border-[#EDE8DC] p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#6B8872] block mb-1">折價碼</label>
              <input value={uForm.code} onChange={e => setUForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="例：DRAGON2026" className="w-full border border-[#EDE8DC] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#7D9B84]" required />
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B8872] block mb-1">名稱</label>
              <input value={uForm.name} onChange={e => setUForm(f => ({ ...f, name: e.target.value }))}
                placeholder="端午節折扣" className="w-full border border-[#EDE8DC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7D9B84]" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B8872] block mb-1">折扣金額 (NT$)</label>
              <input type="number" min={1} value={uForm.discount_amount} onChange={e => setUForm(f => ({ ...f, discount_amount: Number(e.target.value) }))}
                className="w-full border border-[#EDE8DC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7D9B84]" required />
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B8872] block mb-1">最低消費 (NT$)</label>
              <input type="number" min={0} value={uForm.min_order_amount} onChange={e => setUForm(f => ({ ...f, min_order_amount: Number(e.target.value) }))}
                className="w-full border border-[#EDE8DC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7D9B84]" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B8872] block mb-1">總使用上限</label>
              <input type="number" min={1} value={uForm.max_uses} onChange={e => setUForm(f => ({ ...f, max_uses: Number(e.target.value) }))}
                className="w-full border border-[#EDE8DC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7D9B84]" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B8872] block mb-1">每人限用次數</label>
              <input type="number" min={1} value={uForm.max_uses_per_user} onChange={e => setUForm(f => ({ ...f, max_uses_per_user: Number(e.target.value) }))}
                className="w-full border border-[#EDE8DC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7D9B84]" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B8872] block mb-1">到期日</label>
              <input type="datetime-local" value={uForm.expires_at} onChange={e => setUForm(f => ({ ...f, expires_at: e.target.value }))}
                className="w-full border border-[#EDE8DC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7D9B84]" required />
            </div>
          </div>
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-[#7D9B84] text-white text-sm rounded-lg hover:bg-[#5C7A67]">建立</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[#6B8872] border border-[#EDE8DC] rounded-lg hover:bg-[#FAF7F2]">取消</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-[#9CA89E]">載入中...</p>
      ) : tab === "universal" ? (
        universalList.length === 0 ? (
          <p className="text-sm text-[#9CA89E]">尚無通用碼折價券</p>
        ) : (
          <div className="bg-white rounded-2xl border border-[#EDE8DC] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#FAF7F2] text-[#6B8872]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">折價碼</th>
                  <th className="text-left px-4 py-3 font-medium">名稱</th>
                  <th className="text-right px-4 py-3 font-medium">折扣</th>
                  <th className="text-right px-4 py-3 font-medium">使用率</th>
                  <th className="text-left px-4 py-3 font-medium">狀態</th>
                  <th className="text-right px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F0E8]">
                {universalList.map(c => {
                  const expired = new Date(c.expires_at) < new Date();
                  const statusLabel = !c.is_active ? "已停用" : expired ? "已過期" : "啟用中";
                  const statusCls = !c.is_active || expired ? "bg-gray-100 text-gray-500" : "bg-green-50 text-green-700";
                  return (
                    <tr key={c.id} className="hover:bg-[#FAF7F2]">
                      <td className="px-4 py-3 font-mono font-bold text-[#7D9B84]">{c.code}</td>
                      <td className="px-4 py-3 text-[#3D4A42]">{c.name}</td>
                      <td className="px-4 py-3 text-right">NT${c.discount_amount}</td>
                      <td className="px-4 py-3 text-right text-[#6B8872]">
                        {c.used_count}{c.max_uses ? `/${c.max_uses}` : ""}{c.usage_rate !== null ? ` (${c.usage_rate}%)` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}>{statusLabel}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.is_active && !expired && (
                          <button onClick={() => toggleActive(c.id)} className="text-xs text-rose-500 hover:underline">停用</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        batchList.length === 0 ? (
          <p className="text-sm text-[#9CA89E]">尚無批次券</p>
        ) : (
          <div className="bg-white rounded-2xl border border-[#EDE8DC] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#FAF7F2] text-[#6B8872]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">代碼</th>
                  <th className="text-right px-4 py-3 font-medium">折扣</th>
                  <th className="text-left px-4 py-3 font-medium">來源</th>
                  <th className="text-left px-4 py-3 font-medium">狀態</th>
                  <th className="text-left px-4 py-3 font-medium">到期日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F0E8]">
                {batchList.slice(0, 50).map((c, i) => (
                  <tr key={i} className="hover:bg-[#FAF7F2]">
                    <td className="px-4 py-3 font-mono text-xs text-[#6B8872]">{c.code as string}</td>
                    <td className="px-4 py-3 text-right">NT${c.discount_amount as number}</td>
                    <td className="px-4 py-3 text-xs text-[#9CA89E]">{c.source as string}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.used_at ? "bg-gray-100 text-gray-500" : "bg-green-50 text-green-700"}`}>
                        {c.used_at ? "已使用" : "未使用"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#9CA89E]">{new Date(c.expires_at as string).toLocaleDateString("zh-TW")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
