## Context

商品卡片（`ProductCard.tsx`）使用 `product.color` 作為 Tailwind 漸層 class（`bg-gradient-to-br ${product.color}`）。現有 5 種茶各有一個手工設定的漸層色，例如 `from-green-100 to-emerald-200`。後台新增表單目前是純文字 input，管理員需要知道正確的 Tailwind class 名稱。

## Goals / Non-Goals

**Goals:**
- 新增商品表單的 `color` 欄位改為視覺化色票選擇器
- 預設選中第一個色票，確保不會送出空值
- 色票包含現有 5 種茶的顏色，並補充幾個常用漸層

**Non-Goals:**
- 不支援自訂顏色輸入（固定色票清單即可）
- 不修改現有商品的顏色編輯（編輯功能目前不在後台，不在本次範圍）
- 不修改前台商品卡片顯示邏輯

## Decisions

**色票用 radio button 實作，視覺上顯示漸層色塊**

每個色票是一個隱藏的 radio input + 可點擊的色塊 div，選中時加上 ring 邊框，符合現有 UI 風格。不需要引入任何新套件。

**預設色票清單（10 個）**：

| 名稱 | Tailwind class |
|------|---------------|
| 翠綠 | `from-green-100 to-emerald-200` |
| 琥珀 | `from-amber-200 to-orange-300` |
| 淡黃 | `from-yellow-100 to-amber-200` |
| 玫瑰 | `from-red-100 to-rose-200` |
| 嫩綠 | `from-lime-100 to-green-200` |
| 天藍 | `from-sky-100 to-blue-200` |
| 薰衣草 | `from-purple-100 to-violet-200` |
| 蜜桃 | `from-pink-100 to-rose-200` |
| 米白 | `from-stone-100 to-amber-100` |
| 深綠 | `from-emerald-200 to-teal-300` |

**`EMPTY_CREATE_FORM.color` 預設為第一個色票**

確保即使管理員未選擇，送出時也有有效值。

## Risks / Trade-offs

- [Tailwind purge 問題] → 這些 class 已在 `data/products.ts` 或現有商品中使用，Tailwind 不會 purge 掉；新增的色票 class 需確認有被 Tailwind 掃到（放在 `ProductsClient.tsx` 的常數中即可）
