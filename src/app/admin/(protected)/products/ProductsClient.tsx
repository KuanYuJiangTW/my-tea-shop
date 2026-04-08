"use client";

import { useState } from "react";

type Product = {
  id: number;
  slug: string;
  name: string;
  name_en: string;
  category: string;
  weight: string;
  // 150g
  price: number;
  stock_quantity: number | null;
  // 75g
  price_75g: number | null;
  stock_75g: number | null;
  // 茶包
  price_tea_bag: number | null;
  stock_tea_bag: number | null;
  is_active: boolean;
};

type EditState = {
  name: string;
  is_active: boolean;
  price: string;
  stock_quantity: string;
  price_75g: string;
  stock_75g: string;
  price_tea_bag: string;
  stock_tea_bag: string;
};

type CreateForm = {
  slug: string;
  name: string;
  name_en: string;
  category: string;
  origin: string;
  altitude: string;
  weight: string;
  description: string;
  color: string;
  image_url: string;
  image_url2: string;
  price: string;
  stock_quantity: string;
  price_75g: string;
  stock_75g: string;
  price_tea_bag: string;
  stock_tea_bag: string;
};

const COLOR_OPTIONS: { label: string; value: string }[] = [
  { label: "翠綠",   value: "from-green-100 to-emerald-200" },
  { label: "琥珀",   value: "from-amber-200 to-orange-300" },
  { label: "淡黃",   value: "from-yellow-100 to-amber-200" },
  { label: "玫瑰",   value: "from-red-100 to-rose-200" },
  { label: "嫩綠",   value: "from-lime-100 to-green-200" },
  { label: "天藍",   value: "from-sky-100 to-blue-200" },
  { label: "薰衣草", value: "from-purple-100 to-violet-200" },
  { label: "蜜桃",   value: "from-pink-100 to-rose-200" },
  { label: "米白",   value: "from-stone-100 to-amber-100" },
  { label: "深綠",   value: "from-emerald-200 to-teal-300" },
];

const EMPTY_CREATE_FORM: CreateForm = {
  slug: "",
  name: "",
  name_en: "",
  category: "",
  origin: "",
  altitude: "",
  weight: "",
  description: "",
  color: COLOR_OPTIONS[0].value,
  image_url: "",
  image_url2: "",
  price: "",
  stock_quantity: "",
  price_75g: "",
  stock_75g: "",
  price_tea_bag: "",
  stock_tea_bag: "",
};

function toStr(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}
function toNum(s: string): number | null {
  const n = parseInt(s, 10);
  return isNaN(n) || s.trim() === "" ? null : n;
}

export default function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [editing, setEditing] = useState<Record<number, EditState>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [error, setError] = useState<Record<number, string>>({});

  // 新增商品狀態
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE_FORM);
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof CreateForm | "submit", string>>>({});
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  // 刪除確認狀態
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  function startEdit(product: Product) {
    setEditing((prev) => ({
      ...prev,
      [product.id]: {
        name:          product.name,
        is_active:     product.is_active,
        price:         toStr(product.price),
        stock_quantity: toStr(product.stock_quantity),
        price_75g:     toStr(product.price_75g),
        stock_75g:     toStr(product.stock_75g),
        price_tea_bag: toStr(product.price_tea_bag),
        stock_tea_bag: toStr(product.stock_tea_bag),
      },
    }));
    setError((prev) => ({ ...prev, [product.id]: "" }));
  }

  function cancelEdit(id: number) {
    setEditing((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  function updateField(id: number, field: keyof EditState, value: string | boolean) {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function saveProduct(id: number) {
    const draft = editing[id];
    if (!draft) return;

    const price = parseInt(draft.price, 10);
    if (isNaN(price) || price < 0) {
      setError((prev) => ({ ...prev, [id]: "150g 售價請填有效數字" }));
      return;
    }
    const stock = parseInt(draft.stock_quantity, 10);
    if (draft.stock_quantity.trim() !== "" && (isNaN(stock) || stock < 0)) {
      setError((prev) => ({ ...prev, [id]: "庫存請填 0 或正整數" }));
      return;
    }

    setSaving(id);
    setError((prev) => ({ ...prev, [id]: "" }));

    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:          draft.name,
        is_active:     draft.is_active,
        price,
        stock_quantity: draft.stock_quantity.trim() === "" ? null : stock,
        price_75g:     toNum(draft.price_75g),
        stock_75g:     toNum(draft.stock_75g),
        price_tea_bag: toNum(draft.price_tea_bag),
        stock_tea_bag: toNum(draft.stock_tea_bag),
      }),
    });

    setSaving(null);

    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                name:          draft.name,
                is_active:     draft.is_active,
                price,
                stock_quantity: toNum(draft.stock_quantity),
                price_75g:     toNum(draft.price_75g),
                stock_75g:     toNum(draft.stock_75g),
                price_tea_bag: toNum(draft.price_tea_bag),
                stock_tea_bag: toNum(draft.stock_tea_bag),
              }
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

  async function deleteProduct(id: number) {
    setDeleting(true);
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setConfirmDeleteId(null);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "刪除失敗，請稍後再試");
    }
  }

  function updateCreateField(field: keyof CreateForm, value: string) {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    setCreateErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validateCreateForm(): boolean {
    const errs: Partial<Record<keyof CreateForm | "submit", string>> = {};
    const slug = createForm.slug.trim();
    if (!slug) {
      errs.slug = "Slug 為必填";
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      errs.slug = "Slug 只能包含小寫英文、數字與連字號（例如：dong-fang-mei-ren）";
    }
    const price = parseInt(createForm.price, 10);
    if (createForm.price.trim() === "" || isNaN(price) || price < 0) {
      errs.price = "150g 售價為必填，且須為 0 或正整數";
    }
    setCreateErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function createProduct() {
    if (!validateCreateForm()) return;

    setCreating(true);
    setCreateErrors({});

    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug:           createForm.slug.trim(),
        name:           createForm.name.trim() || undefined,
        name_en:        createForm.name_en.trim() || undefined,
        category:       createForm.category.trim() || undefined,
        origin:         createForm.origin.trim() || undefined,
        altitude:       createForm.altitude.trim() || undefined,
        weight:         createForm.weight.trim() || undefined,
        description:    createForm.description.trim() || undefined,
        color:          createForm.color.trim() || undefined,
        image_url:      createForm.image_url.trim() || undefined,
        image_url2:     createForm.image_url2.trim() || undefined,
        price:          parseInt(createForm.price, 10),
        stock_quantity: toNum(createForm.stock_quantity),
        price_75g:      toNum(createForm.price_75g),
        stock_75g:      toNum(createForm.stock_75g),
        price_tea_bag:  toNum(createForm.price_tea_bag),
        stock_tea_bag:  toNum(createForm.stock_tea_bag),
      }),
    });

    setCreating(false);

    if (res.ok) {
      const newProduct = await res.json();
      setProducts((prev) => [newProduct, ...prev]);
      setCreateForm(EMPTY_CREATE_FORM);
      setShowCreate(false);
      setCreateSuccess(true);
      setTimeout(() => setCreateSuccess(false), 4000);
    } else {
      const data = await res.json().catch(() => ({}));
      setCreateErrors({ submit: data.error ?? "建立失敗，請稍後再試" });
    }
  }

  function stockColor(stock: number | null) {
    if (stock === null) return "text-[#9CA89E]";
    if (stock === 0) return "text-rose-400";
    if (stock <= 5) return "text-amber-500";
    return "text-[#3D4A42]";
  }
  function stockLabel(stock: number | null) {
    if (stock === null) return "—";
    return String(stock);
  }

  const active   = products.filter((p) =>  p.is_active);
  const inactive = products.filter((p) => !p.is_active);
  const confirmProduct = products.find((p) => p.id === confirmDeleteId);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3D4A42] font-serif">產品管理</h1>
          <p className="text-sm text-[#6B8872] mt-1">
            上架 {active.length} 件 · 下架 {inactive.length} 件
          </p>
        </div>
        <button
          onClick={() => { setShowCreate((v) => !v); setCreateErrors({}); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex-shrink-0 ${
            showCreate
              ? "bg-[#EDE8DC] text-[#6B8872] hover:bg-[#D9D0C7]"
              : "bg-[#7D9B84] text-white hover:bg-[#5C7A67]"
          }`}
        >
          {showCreate ? "收起" : "+ 新增商品"}
        </button>
      </div>

      {/* 成功訊息 */}
      {createSuccess && (
        <div className="mb-4 px-4 py-3 bg-[#EBF3EE] border border-[#A3BFA8] rounded-xl text-sm text-[#3D4A42]">
          商品已建立 ✓　請開啟上架開關讓商品出現在前台。
        </div>
      )}

      {/* 新增商品表單 */}
      {showCreate && (
        <div className="mb-6 bg-white rounded-2xl border border-[#A3BFA8] shadow-md overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F5F0E8] bg-[#F7FAF7]">
            <h2 className="text-sm font-semibold text-[#3D4A42]">新增商品</h2>
            <p className="text-xs text-[#9CA89E] mt-0.5">填入商品資料後點擊「建立商品」，再開啟上架開關即可上架。</p>
          </div>

          <div className="px-5 py-4 space-y-5">
            {/* 必填：Slug + 售價 */}
            <div>
              <p className="text-xs font-semibold text-[#6B8872] uppercase tracking-wider mb-2">必填</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#3D4A42] mb-1">
                    Slug <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="例如：dong-fang-mei-ren"
                    value={createForm.slug}
                    onChange={(e) => updateCreateField("slug", e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-lg border text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84] ${
                      createErrors.slug ? "border-rose-400" : "border-[#A3BFA8]"
                    }`}
                  />
                  {createErrors.slug && <p className="text-xs text-rose-500 mt-1">{createErrors.slug}</p>}
                  <p className="text-xs text-[#9CA89E] mt-1">英文小寫 + 數字 + 連字號，系統內部識別用</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3D4A42] mb-1">
                    150g 售價 (NT$) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="例如：1200"
                    value={createForm.price}
                    onChange={(e) => updateCreateField("price", e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-lg border text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84] ${
                      createErrors.price ? "border-rose-400" : "border-[#A3BFA8]"
                    }`}
                  />
                  {createErrors.price && <p className="text-xs text-rose-500 mt-1">{createErrors.price}</p>}
                </div>
              </div>
            </div>

            {/* 基本資料 */}
            <div>
              <p className="text-xs font-semibold text-[#6B8872] uppercase tracking-wider mb-2">基本資料（選填）</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { field: "name" as const,     label: "商品名稱（中文）", placeholder: "例如：東方美人" },
                  { field: "name_en" as const,  label: "商品名稱（英文）", placeholder: "例如：Oriental Beauty" },
                  { field: "category" as const, label: "分類",             placeholder: "例如：烏龍茶" },
                  { field: "origin" as const,   label: "產地",             placeholder: "例如：新竹峨眉" },
                  { field: "altitude" as const, label: "海拔",             placeholder: "例如：400m" },
                  { field: "weight" as const,   label: "重量規格",         placeholder: "例如：150g / 75g" },
                ].map(({ field, label, placeholder }) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-[#3D4A42] mb-1">{label}</label>
                    <input
                      type="text"
                      placeholder={placeholder}
                      value={createForm[field]}
                      onChange={(e) => updateCreateField(field, e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#A3BFA8] text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84]"
                    />
                  </div>
                ))}
                {/* 顏色色票選擇器 */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#3D4A42] mb-2">商品卡背景色</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        title={opt.label}
                        onClick={() => updateCreateField("color", opt.value)}
                        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${opt.value} border-2 transition-all ${
                          createForm.color === opt.value
                            ? "border-[#5C7A67] ring-2 ring-[#7D9B84] ring-offset-1 scale-110"
                            : "border-transparent hover:scale-105"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[#9CA89E] mt-1">
                    已選：{COLOR_OPTIONS.find((o) => o.value === createForm.color)?.label ?? "未選"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#3D4A42] mb-1">商品描述</label>
                  <textarea
                    rows={3}
                    placeholder="簡短描述商品特色…"
                    value={createForm.description}
                    onChange={(e) => updateCreateField("description", e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#A3BFA8] text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* 圖片 */}
            <div>
              <p className="text-xs font-semibold text-[#6B8872] uppercase tracking-wider mb-2">圖片（選填）</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#3D4A42] mb-1">封面圖片 URL</label>
                  <input
                    type="url"
                    placeholder="https://…"
                    value={createForm.image_url}
                    onChange={(e) => updateCreateField("image_url", e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#A3BFA8] text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3D4A42] mb-1">第二張圖片 URL</label>
                  <input
                    type="url"
                    placeholder="https://…"
                    value={createForm.image_url2}
                    onChange={(e) => updateCreateField("image_url2", e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#A3BFA8] text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84]"
                  />
                </div>
              </div>
            </div>

            {/* 規格 */}
            <div>
              <p className="text-xs font-semibold text-[#6B8872] uppercase tracking-wider mb-2">各規格售價與庫存（選填）</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#FAF7F2] rounded-xl border border-[#EDE8DC] p-3">
                  <p className="text-xs font-bold text-[#3D4A42] mb-2">150g 散茶</p>
                  <label className="block mb-1 text-xs text-[#9CA89E]">庫存（空白=不限）</label>
                  <input
                    type="number" min="0"
                    value={createForm.stock_quantity}
                    onChange={(e) => updateCreateField("stock_quantity", e.target.value)}
                    placeholder="不限"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#A3BFA8] text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84]"
                  />
                </div>
                <div className="bg-[#FAF7F2] rounded-xl border border-[#EDE8DC] p-3">
                  <p className="text-xs font-bold text-[#3D4A42] mb-2">75g 散茶</p>
                  <label className="block mb-1 text-xs text-[#9CA89E]">售價 (NT$)</label>
                  <input
                    type="number" min="0"
                    value={createForm.price_75g}
                    onChange={(e) => updateCreateField("price_75g", e.target.value)}
                    placeholder="未設定"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#A3BFA8] text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84] mb-2"
                  />
                  <label className="block mb-1 text-xs text-[#9CA89E]">庫存（空白=不限）</label>
                  <input
                    type="number" min="0"
                    value={createForm.stock_75g}
                    onChange={(e) => updateCreateField("stock_75g", e.target.value)}
                    placeholder="不限"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#A3BFA8] text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84]"
                  />
                </div>
                <div className="bg-[#FAF7F2] rounded-xl border border-[#EDE8DC] p-3">
                  <p className="text-xs font-bold text-[#3D4A42] mb-2">茶包 15入 × 3g</p>
                  <label className="block mb-1 text-xs text-[#9CA89E]">售價 (NT$)</label>
                  <input
                    type="number" min="0"
                    value={createForm.price_tea_bag}
                    onChange={(e) => updateCreateField("price_tea_bag", e.target.value)}
                    placeholder="未設定"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#A3BFA8] text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84] mb-2"
                  />
                  <label className="block mb-1 text-xs text-[#9CA89E]">庫存（空白=不限）</label>
                  <input
                    type="number" min="0"
                    value={createForm.stock_tea_bag}
                    onChange={(e) => updateCreateField("stock_tea_bag", e.target.value)}
                    placeholder="不限"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#A3BFA8] text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84]"
                  />
                </div>
              </div>
            </div>

            {createErrors.submit && (
              <p className="text-xs text-rose-500">{createErrors.submit}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => { setShowCreate(false); setCreateForm(EMPTY_CREATE_FORM); setCreateErrors({}); }}
                className="px-4 py-2 rounded-lg text-sm text-[#6B8872] hover:bg-[#EDE8DC] transition"
              >
                取消
              </button>
              <button
                onClick={createProduct}
                disabled={creating}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#7D9B84] hover:bg-[#5C7A67] text-white transition disabled:opacity-60"
              >
                {creating ? "建立中…" : "建立商品"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {products.map((product) => {
          const isEditing = !!editing[product.id];
          const draft = editing[product.id];

          return (
            <div
              key={product.id}
              className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                isEditing ? "border-[#A3BFA8] shadow-md" : "border-[#EDE8DC] shadow-sm"
              }`}
            >
              {/* 主列 */}
              <div className="flex items-center gap-4 px-5 py-4">
                {/* 名稱 */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(e) => updateField(product.id, "name", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#A3BFA8] text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84]"
                    />
                  ) : (
                    <div>
                      <span className="font-medium text-[#3D4A42]">{product.name || product.slug}</span>
                      <span className="text-xs text-[#9CA89E] ml-2">{product.name_en} · {product.weight}</span>
                    </div>
                  )}
                </div>

                {/* 分類 */}
                <span className="text-xs text-[#6B8872] bg-[#EBF3EE] px-2 py-0.5 rounded-full hidden sm:inline">
                  {product.category}
                </span>

                {/* 上架狀態 */}
                <button
                  onClick={() => isEditing ? updateField(product.id, "is_active", !draft.is_active) : toggleActive(product)}
                  disabled={saving === product.id}
                  title={(isEditing ? draft.is_active : product.is_active) ? "點擊下架" : "點擊上架"}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 disabled:opacity-60 ${
                    (isEditing ? draft.is_active : product.is_active) ? "bg-[#7D9B84]" : "bg-[#D9D9D9]"
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    (isEditing ? draft.is_active : product.is_active) ? "translate-x-5" : "translate-x-0.5"
                  }`} />
                </button>

                {/* 操作按鈕 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {saved === product.id && !isEditing && (
                    <span className="text-xs text-[#7D9B84] font-medium">已儲存 ✓</span>
                  )}
                  {isEditing ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(product)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#3D4A42] bg-[#EDE8DC] hover:bg-[#D9D0C7] transition"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(product.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-50 transition"
                      >
                        刪除
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 錯誤訊息 */}
              {error[product.id] && (
                <div className="px-5 pb-2">
                  <p className="text-xs text-rose-500">{error[product.id]}</p>
                </div>
              )}

              {/* 規格區 */}
              {isEditing ? (
                <div className="border-t border-[#F5F0E8] px-5 py-4 bg-[#FAF7F2]">
                  <p className="text-xs font-semibold text-[#6B8872] uppercase tracking-wider mb-3">各規格售價與庫存</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-[#EDE8DC] p-4">
                      <p className="text-xs font-bold text-[#3D4A42] mb-3">150g 散茶</p>
                      <label className="block mb-1 text-xs text-[#9CA89E]">售價 (NT$)</label>
                      <input
                        type="number" min="0"
                        value={draft.price}
                        onChange={(e) => updateField(product.id, "price", e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#A3BFA8] text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84] mb-3"
                      />
                      <label className="block mb-1 text-xs text-[#9CA89E]">庫存（空白=不限）</label>
                      <input
                        type="number" min="0"
                        value={draft.stock_quantity}
                        onChange={(e) => updateField(product.id, "stock_quantity", e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#A3BFA8] text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84]"
                        placeholder="不限"
                      />
                    </div>
                    <div className="bg-white rounded-xl border border-[#EDE8DC] p-4">
                      <p className="text-xs font-bold text-[#3D4A42] mb-3">75g 散茶</p>
                      <label className="block mb-1 text-xs text-[#9CA89E]">售價 (NT$)</label>
                      <input
                        type="number" min="0"
                        value={draft.price_75g}
                        onChange={(e) => updateField(product.id, "price_75g", e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#A3BFA8] text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84] mb-3"
                        placeholder="未設定"
                      />
                      <label className="block mb-1 text-xs text-[#9CA89E]">庫存（空白=不限）</label>
                      <input
                        type="number" min="0"
                        value={draft.stock_75g}
                        onChange={(e) => updateField(product.id, "stock_75g", e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#A3BFA8] text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84]"
                        placeholder="不限"
                      />
                    </div>
                    <div className="bg-white rounded-xl border border-[#EDE8DC] p-4">
                      <p className="text-xs font-bold text-[#3D4A42] mb-3">茶包 15入 × 3g</p>
                      <label className="block mb-1 text-xs text-[#9CA89E]">售價 (NT$)</label>
                      <input
                        type="number" min="0"
                        value={draft.price_tea_bag}
                        onChange={(e) => updateField(product.id, "price_tea_bag", e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#A3BFA8] text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84] mb-3"
                        placeholder="未設定"
                      />
                      <label className="block mb-1 text-xs text-[#9CA89E]">庫存（空白=不限）</label>
                      <input
                        type="number" min="0"
                        value={draft.stock_tea_bag}
                        onChange={(e) => updateField(product.id, "stock_tea_bag", e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#A3BFA8] text-sm text-[#3D4A42] focus:outline-none focus:ring-2 focus:ring-[#7D9B84]"
                        placeholder="不限"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-t border-[#F5F0E8] px-5 py-3 flex flex-wrap gap-4 bg-[#FAF7F2]">
                  {[
                    { label: "150g", price: product.price,         stock: product.stock_quantity },
                    { label: "75g",  price: product.price_75g,      stock: product.stock_75g },
                    { label: "茶包", price: product.price_tea_bag,  stock: product.stock_tea_bag },
                  ].map(({ label, price, stock }) => (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      <span className="text-[#9CA89E] font-medium w-8">{label}</span>
                      <span className="text-[#3D4A42] font-semibold">
                        {price != null ? `NT$${price.toLocaleString()}` : "—"}
                      </span>
                      <span className={`${stockColor(stock ?? null)} ml-1`}>
                        庫存 {stockLabel(stock ?? null)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-[#9CA89E] mt-4">
        * 庫存 0 = 售完（紅色）；≤5 = 庫存偏低（橘色）；空白 = 不限。售價空白表示不顯示此規格。
      </p>

      {/* 刪除確認 Modal */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-[#3D4A42] mb-2">確認刪除商品</h3>
            <p className="text-sm text-[#6B8872] mb-1">即將永久刪除以下商品，此操作無法復原：</p>
            <p className="text-sm font-medium text-[#3D4A42] bg-[#FAF7F2] rounded-lg px-3 py-2 mb-5">
              {confirmProduct?.name || confirmProduct?.slug}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm text-[#6B8872] hover:bg-[#EDE8DC] transition disabled:opacity-60"
              >
                取消
              </button>
              <button
                onClick={() => deleteProduct(confirmDeleteId)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-500 hover:bg-rose-600 text-white transition disabled:opacity-60"
              >
                {deleting ? "刪除中…" : "確認刪除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
