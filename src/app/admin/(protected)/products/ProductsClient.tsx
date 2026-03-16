"use client";

import { useState } from "react";

type Product = {
  id: number;
  name: string;
  name_en: string;
  category: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  weight: string;
};

type EditState = {
  name: string;
  price: string;
  stock_quantity: string;
  is_active: boolean;
};

export default function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [editing, setEditing] = useState<Record<number, EditState>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [error, setError] = useState<Record<number, string>>({});

  function startEdit(product: Product) {
    setEditing((prev) => ({
      ...prev,
      [product.id]: {
        name: product.name,
        price: String(product.price),
        stock_quantity: String(product.stock_quantity ?? 0),
        is_active: product.is_active,
      },
    }));
    setError((prev) => ({ ...prev, [product.id]: "" }));
  }

  function cancelEdit(id: number) {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function updateField(id: number, field: keyof EditState, value: string | boolean) {
    setEditing((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  async function saveProduct(id: number) {
    const draft = editing[id];
    if (!draft) return;

    const price = parseFloat(draft.price);
    const stock = parseInt(draft.stock_quantity, 10);

    if (isNaN(price) || price < 0) {
      setError((prev) => ({ ...prev, [id]: "請輸入有效價格" }));
      return;
    }
    if (isNaN(stock) || stock < 0) {
      setError((prev) => ({ ...prev, [id]: "請輸入有效庫存數量" }));
      return;
    }

    setSaving(id);
    setError((prev) => ({ ...prev, [id]: "" }));

    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name,
        price,
        stock_quantity: stock,
        is_active: draft.is_active,
      }),
    });

    setSaving(null);

    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, name: draft.name, price, stock_quantity: stock, is_active: draft.is_active }
            : p
        )
      );
      cancelEdit(id);
      setSaved(id);
      setTimeout(() => setSaved((prev) => (prev === id ? null : prev)), 2000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError((prev) => ({ ...prev, [id]: data.error ?? "儲存失敗" }));
    }
  }

  // Quick toggle active status without entering edit mode
  async function toggleActive(product: Product) {
    setSaving(product.id);

    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !product.is_active }),
    });

    setSaving(null);

    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_active: !p.is_active } : p))
      );
    }
  }

  const active = products.filter((p) => p.is_active);
  const inactive = products.filter((p) => !p.is_active);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#3D4A42] font-serif">產品管理</h1>
        <p className="text-sm text-[#6B8872] mt-1">
          上架 {active.length} 件 · 下架 {inactive.length} 件
        </p>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-[#EDE8DC] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EDE8DC] bg-[#FAF7F2]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#6B8872] uppercase tracking-wider">產品名稱</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B8872] uppercase tracking-wider hidden sm:table-cell">分類</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#6B8872] uppercase tracking-wider">售價</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#6B8872] uppercase tracking-wider">庫存</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#6B8872] uppercase tracking-wider">狀態</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#6B8872] uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F0E8]">
              {products.map((product) => {
                const isEditing = !!editing[product.id];
                const draft = editing[product.id];

                return (
                  <tr key={product.id} className={`transition ${isEditing ? "bg-[#FAF7F2]" : "hover:bg-[#FAF7F2]"}`}>
                    {/* Name */}
                    <td className="px-5 py-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={draft.name}
                          onChange={(e) => updateField(product.id, "name", e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-[#A3BFA8] bg-white text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84]"
                        />
                      ) : (
                        <div>
                          <div className="font-medium text-[#3D4A42]">{product.name}</div>
                          <div className="text-xs text-[#9CA89E]">{product.name_en} · {product.weight}</div>
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="text-xs text-[#6B8872] bg-[#EBF3EE] px-2 py-0.5 rounded-full">
                        {product.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xs text-[#9CA89E]">NT$</span>
                          <input
                            type="number"
                            min="0"
                            value={draft.price}
                            onChange={(e) => updateField(product.id, "price", e.target.value)}
                            className="w-24 px-2 py-1.5 rounded-lg border border-[#A3BFA8] bg-white text-sm text-right text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84]"
                          />
                        </div>
                      ) : (
                        <span className="font-semibold text-[#3D4A42]">NT${product.price.toLocaleString()}</span>
                      )}
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-4 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          value={draft.stock_quantity}
                          onChange={(e) => updateField(product.id, "stock_quantity", e.target.value)}
                          className="w-20 px-2 py-1.5 rounded-lg border border-[#A3BFA8] bg-white text-sm text-right text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84] ml-auto block"
                        />
                      ) : (
                        <span className={`font-medium ${
                          (product.stock_quantity ?? 0) === 0
                            ? "text-rose-400"
                            : (product.stock_quantity ?? 0) <= 5
                            ? "text-amber-500"
                            : "text-[#3D4A42]"
                        }`}>
                          {product.stock_quantity ?? 0}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 text-center">
                      {isEditing ? (
                        <button
                          onClick={() => updateField(product.id, "is_active", !draft.is_active)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            draft.is_active ? "bg-[#7D9B84]" : "bg-[#D9D9D9]"
                          }`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                            draft.is_active ? "translate-x-5" : "translate-x-0.5"
                          }`} />
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleActive(product)}
                          disabled={saving === product.id}
                          title={product.is_active ? "點擊下架" : "點擊上架"}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-60 ${
                            product.is_active ? "bg-[#7D9B84]" : "bg-[#D9D9D9]"
                          }`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                            product.is_active ? "translate-x-5" : "translate-x-0.5"
                          }`} />
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex flex-col items-end">
                            {error[product.id] && (
                              <span className="text-xs text-rose-400 mb-1">{error[product.id]}</span>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => cancelEdit(product.id)}
                                className="px-3 py-1.5 rounded-lg text-xs text-[#6B8872] hover:bg-[#EDE8DC] transition"
                              >
                                取消
                              </button>
                              <button
                                onClick={() => saveProduct(product.id)}
                                disabled={saving === product.id}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#7D9B84] hover:bg-[#5C7A67] text-white transition disabled:opacity-60"
                              >
                                {saving === product.id ? "儲存中…" : "儲存"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {saved === product.id && (
                            <span className="text-xs text-[#7D9B84] font-medium">已儲存 ✓</span>
                          )}
                          <button
                            onClick={() => startEdit(product)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#3D4A42] bg-[#EDE8DC] hover:bg-[#D9D0C7] transition"
                          >
                            編輯
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[#9CA89E] mt-4">
        * 庫存顯示紅色 = 售完，橘色 = 少於 5 件。點擊切換按鈕可快速上架或下架。
      </p>
    </div>
  );
}
