"use client";

import { useState } from "react";
import { calcBundleAvailable } from "@/lib/bundle-core";
import type { Bundle } from "@/types";

type AdminBundle = Bundle & { isActive: boolean };

/**
 * 組合管理。版面刻意與「產品管理」一致（同樣的卡片、開關、庫存色碼），
 * 業主不必再學一套。
 *
 * **可售量是算出來的，不是存的**：`min(floor(成分庫存 ÷ 每組所需))`。
 * 所以這裡沒有「庫存」欄位可以編輯——要調庫存請去產品管理改成分那三款茶。
 */
export default function BundlesClient({ initialBundles }: { initialBundles: AdminBundle[] }) {
  const [bundles, setBundles] = useState(initialBundles);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCount = bundles.filter((b) => b.isActive).length;

  async function toggleActive(bundle: AdminBundle) {
    setSaving(bundle.id);
    setError(null);
    const res = await fetch(`/api/admin/bundles/${bundle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !bundle.isActive }),
    });
    setSaving(null);
    if (res.ok) {
      setBundles((prev) =>
        prev.map((b) => (b.id === bundle.id ? { ...b, isActive: !b.isActive } : b)),
      );
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "更新失敗");
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-tea-text">組合管理</h1>
        <p className="text-sm text-tea-text-light mt-1">
          上架 {activeCount} 件 · 下架 {bundles.length - activeCount} 件
        </p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2">{error}</p>
      )}

      {bundles.length === 0 ? (
        <p className="text-sm text-tea-text-light">目前沒有任何組合。</p>
      ) : (
        <div className="space-y-3">
          {bundles.map((bundle) => {
            const available = calcBundleAvailable(bundle.items);
            const soldOut = available === 0;
            const low = available !== undefined && available > 0 && available <= 5;

            return (
              <div
                key={bundle.id}
                className="bg-white rounded-2xl border border-tea-cream-dark shadow-sm overflow-hidden"
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-tea-text">{bundle.name}</span>
                    <span className="text-xs text-tea-text-faint ml-2">
                      {bundle.nameEn} · {bundle.slug}
                    </span>
                  </div>

                  <span className="font-medium text-tea-text text-sm flex-shrink-0">
                    NT${bundle.price.toLocaleString()}
                  </span>

                  {/* 可售量：由成分推導，不是獨立欄位 */}
                  <span
                    className={`text-xs flex-shrink-0 ${
                      soldOut
                        ? "text-red-500 font-medium"
                        : low
                        ? "text-amber-600 font-medium"
                        : "text-tea-text-light"
                    }`}
                    title="可售量 = 各成分還能組出幾組的最小值"
                  >
                    {available === undefined ? "可售量 不限" : `可售量 ${available}`}
                  </span>

                  <button
                    onClick={() => toggleActive(bundle)}
                    disabled={saving === bundle.id}
                    title={bundle.isActive ? "點擊下架" : "點擊上架"}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 disabled:opacity-60 ${
                      bundle.isActive ? "bg-tea-green" : "bg-[#D9D9D9]"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        bundle.isActive ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* 成分 */}
                <div className="px-5 pb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="text-tea-text-faint">內含</span>
                  {bundle.items.map((i) => {
                    const perSet =
                      i.stock === undefined ? undefined : Math.floor(i.stock / i.quantity);
                    return (
                      <span key={`${i.productId}-${i.spec}`} className="text-tea-text-light">
                        {i.productName}
                        <span className="text-tea-text-faint"> {i.spec} ×{i.quantity}</span>
                        <span
                          className={
                            i.stock === 0
                              ? "text-red-500 ml-1"
                              : perSet !== undefined && perSet <= 5
                              ? "text-amber-600 ml-1"
                              : "text-tea-text-faint ml-1"
                          }
                        >
                          庫存 {i.stock ?? "不限"}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-tea-text-faint leading-relaxed">
        ＊可售量＝各成分「還能組出幾組」的最小值，**由庫存即時算出、不是獨立欄位**。
        要調庫存請到「產品管理」改對應茶款的規格庫存。
        <br />
        ＊成分與售價的變動不在這裡：改成分會讓既有訂單的成分快照對不上，需要走 SQL 並留紀錄。
      </p>
    </div>
  );
}
