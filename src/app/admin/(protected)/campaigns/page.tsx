"use client";

import React, { useState, useEffect } from "react";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  multiplier: number;
  campaign_type: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
};

type FormData = {
  name: string;
  description: string;
  multiplier: number;
  campaign_type: string;
  starts_at: string;
  ends_at: string;
};

const CAMPAIGN_TYPES = [
  { value: "global", label: "全站活動" },
  { value: "first_purchase", label: "首購加碼" },
  { value: "product", label: "指定商品" },
  { value: "tier_specific", label: "指定等級" },
];

/**
 * 只取資料、不碰 state，讓呼叫端決定何時寫入。
 * 回傳 null 表示回應不是陣列（API 錯誤），此時呼叫端**不覆蓋既有清單**——
 * 沿用原本 `if (Array.isArray(data))` 的語意，避免把錯誤顯示成「尚無資料」。
 */
async function fetchCampaignList(): Promise<Campaign[] | null> {
  const res = await fetch("/api/admin/campaigns");
  const data = await res.json();
  return Array.isArray(data) ? data : null;
}

function getStatus(c: Campaign): { label: string; cls: string } {
  if (!c.is_active) return { label: "已停用", cls: "bg-gray-100 text-gray-500" };
  const now = new Date();
  if (new Date(c.starts_at) > now) return { label: "未開始", cls: "bg-amber-50 text-amber-700" };
  if (new Date(c.ends_at) < now) return { label: "已結束", cls: "bg-gray-100 text-gray-500" };
  return { label: "進行中", cls: "bg-green-50 text-green-700" };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ name: "", description: "", multiplier: 2, campaign_type: "global", starts_at: "", ends_at: "" });
  const [error, setError] = useState("");
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<Array<{ id: string; action: string; changed_fields: string[]; old_values: Record<string, unknown>; new_values: Record<string, unknown>; changed_at: string }>>([]);

  async function toggleHistory(id: string) {
    if (historyId === id) { setHistoryId(null); return; }
    setHistoryId(id);
    const res = await fetch(`/api/admin/campaigns/${id}/history`);
    const data = await res.json();
    setHistoryData(Array.isArray(data) ? data : []);
  }

  /**
   * 供表單送出、啟用切換後重新載入清單用。
   *
   * 註：取資料的部分抽成模組層級的 `fetchCampaignList`（不碰 state），這裡與下方的
   * effect 都只在 `.then()` callback 內 setState——原本 effect 直接呼叫一個會 setState
   * 的函式，屬 effect body 內同步 setState（`react-hooks/set-state-in-effect`）。
   */
  function refreshCampaigns() {
    fetchCampaignList().then((list) => {
      if (list) setCampaigns(list);
      setLoading(false);
    });
  }

  useEffect(() => {
    let cancelled = false;
    fetchCampaignList().then((list) => {
      if (cancelled) return;
      if (list) setCampaigns(list);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  function resetForm() {
    setForm({ name: "", description: "", multiplier: 2, campaign_type: "global", starts_at: "", ends_at: "" });
    setEditId(null);
    setShowForm(false);
    setError("");
  }

  function editCampaign(c: Campaign) {
    setForm({
      name: c.name,
      description: c.description || "",
      multiplier: c.multiplier,
      campaign_type: c.campaign_type,
      starts_at: c.starts_at.slice(0, 16),
      ends_at: c.ends_at.slice(0, 16),
    });
    setEditId(c.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const payload = {
      ...form,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
    };

    const url = editId ? `/api/admin/campaigns/${editId}` : "/api/admin/campaigns";
    const method = editId ? "PATCH" : "POST";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "操作失敗"); return; }

    resetForm();
    refreshCampaigns();
  }

  async function toggleActive(id: string) {
    await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE" });
    refreshCampaigns();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-tea-text font-serif">點數活動管理</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-tea-green text-white text-sm rounded-xl hover:bg-tea-green-dark transition">
          新增活動
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-tea-cream-dark p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-tea-text-light block mb-1">活動名稱</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-tea-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tea-green" required />
            </div>
            <div>
              <label className="text-xs font-medium text-tea-text-light block mb-1">倍率（1~10）</label>
              <input type="number" min={1} max={10} step={0.5} value={form.multiplier}
                onChange={e => setForm(f => ({ ...f, multiplier: Number(e.target.value) }))}
                className="w-full border border-tea-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tea-green" required />
            </div>
            <div>
              <label className="text-xs font-medium text-tea-text-light block mb-1">活動類型</label>
              <select value={form.campaign_type} onChange={e => setForm(f => ({ ...f, campaign_type: e.target.value }))}
                className="w-full border border-tea-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tea-green">
                {CAMPAIGN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-tea-text-light block mb-1">說明</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-tea-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tea-green" />
            </div>
            <div>
              <label className="text-xs font-medium text-tea-text-light block mb-1">開始時間</label>
              <input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                className="w-full border border-tea-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tea-green" required />
            </div>
            <div>
              <label className="text-xs font-medium text-tea-text-light block mb-1">結束時間</label>
              <input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                className="w-full border border-tea-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tea-green" required />
            </div>
          </div>
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-tea-green text-white text-sm rounded-lg hover:bg-tea-green-dark">
              {editId ? "儲存" : "建立"}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-tea-text-light border border-tea-cream-dark rounded-lg hover:bg-tea-cream-light">取消</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-[#9CA89E]">載入中...</p>
      ) : campaigns.length === 0 ? (
        <p className="text-sm text-[#9CA89E]">尚無點數活動</p>
      ) : (
        <div className="bg-white rounded-2xl border border-tea-cream-dark overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-tea-cream-light text-tea-text-light">
              <tr>
                <th className="text-left px-4 py-3 font-medium">活動名稱</th>
                <th className="text-left px-4 py-3 font-medium">倍率</th>
                <th className="text-left px-4 py-3 font-medium">類型</th>
                <th className="text-left px-4 py-3 font-medium">狀態</th>
                <th className="text-left px-4 py-3 font-medium">時間</th>
                <th className="text-right px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tea-cream">
              {campaigns.map(c => {
                const status = getStatus(c);
                return (
                  <React.Fragment key={c.id}>
                  <tr className="hover:bg-tea-cream-light">
                    <td className="px-4 py-3 font-medium text-tea-text">{c.name}</td>
                    <td className="px-4 py-3 text-tea-green font-bold">{c.multiplier}x</td>
                    <td className="px-4 py-3 text-tea-text-light">{CAMPAIGN_TYPES.find(t => t.value === c.campaign_type)?.label ?? c.campaign_type}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span></td>
                    <td className="px-4 py-3 text-xs text-[#9CA89E]">
                      {new Date(c.starts_at).toLocaleDateString("zh-TW")} ~ {new Date(c.ends_at).toLocaleDateString("zh-TW")}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => editCampaign(c)} className="text-xs text-tea-green hover:underline">編輯</button>
                      <button onClick={() => toggleHistory(c.id)} className="text-xs text-tea-text-light hover:underline">歷史</button>
                      {c.is_active && (
                        <button onClick={() => toggleActive(c.id)} className="text-xs text-rose-500 hover:underline">停用</button>
                      )}
                    </td>
                  </tr>
                  {historyId === c.id && (
                    <tr>
                      <td colSpan={6} className="bg-tea-cream-light px-4 py-3">
                        {historyData.length === 0 ? (
                          <p className="text-xs text-[#9CA89E]">尚無變更記錄</p>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-tea-text-light mb-1">變更歷史</p>
                            {historyData.map(h => (
                              <div key={h.id} className="text-xs text-tea-text border-l-2 border-tea-green pl-3">
                                <span className="text-[#9CA89E]">{new Date(h.changed_at).toLocaleString("zh-TW")}</span>
                                {" "}
                                <span className="font-medium">{h.action === "deactivate" ? "停用活動" : "修改欄位"}</span>
                                {h.changed_fields?.length > 0 && (
                                  <span className="text-tea-text-light">
                                    {" "}({h.changed_fields.join(", ")})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
