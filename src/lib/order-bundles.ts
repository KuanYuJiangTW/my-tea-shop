import { supabase } from "./supabase";
import { calcBundleAvailable, mapBundle } from "./bundle-core";
import type { CreateOrderRequest, ProductSpec } from "@/types";

/**
 * 建單路徑處理「組合品項」的共用邏輯。
 *
 * **刻意不動四條建單路徑既有的單品迴圈**：那四個迴圈是各自複製的，要在裡面加
 * 組合分支等於改四次金流程式碼。改成先把品項分流——單品原封不動走既有路徑，
 * 組合集中在這裡處理。既有行為零風險，組合邏輯只有一份。
 */

type ReqItem = CreateOrderRequest["items"][number];

/** 下單當時的成分快照。取消訂單時依它回補，不依「現在的」成分設定 */
export interface BundleSnapshotItem {
  productId: number;
  productName: string;
  spec: ProductSpec;
  quantity: number;
}

/** 寫進 `orders.items` 的組合品項。與單品共用 name/quantity/unitPrice/subtotal 四個欄位 */
export interface ValidatedBundleItem {
  bundleId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  bundleItems: BundleSnapshotItem[];
}

export interface ProductReqItem {
  productId: number;
  quantity: number;
  spec?: ProductSpec;
}

/** 把請求的品項分成單品與組合兩堆 */
export function splitOrderItems(items: ReqItem[]): {
  productItems: ProductReqItem[];
  bundleItems: { bundleId: number; quantity: number }[];
} {
  const productItems: ProductReqItem[] = [];
  const bundleItems: { bundleId: number; quantity: number }[] = [];

  for (const i of items) {
    if (i.bundleId !== undefined) {
      bundleItems.push({ bundleId: i.bundleId, quantity: i.quantity });
    } else if (i.productId !== undefined) {
      productItems.push({ productId: i.productId, quantity: i.quantity, spec: i.spec });
    }
  }
  return { productItems, bundleItems };
}

const BUNDLE_SELECT = `
  id, slug, name, name_en, description, description_en, price,
  product_bundle_items (
    product_id, spec, quantity,
    products ( name, name_en, stock_quantity, stock_75g, stock_tea_bag )
  )
`;

/**
 * 驗證組合品項：組合存在且上架、數量合法、可售量足夠。
 *
 * **單價一律取 `product_bundles.price`**，不由成分售價加總推導——
 * 組合的定價是獨立決策（650 vs 單買 700），加總會讓折扣憑空消失。
 */
export async function validateBundleItems(
  reqs: { bundleId: number; quantity: number }[],
): Promise<{ ok: true; items: ValidatedBundleItem[] } | { ok: false; error: string }> {
  if (reqs.length === 0) return { ok: true, items: [] };

  const ids = reqs.map((r) => r.bundleId);
  const { data, error } = await supabase
    .from("product_bundles")
    .select(BUNDLE_SELECT)
    .in("id", ids)
    .eq("is_active", true);

  if (error || !data) return { ok: false, error: "查詢組合失敗" };

  const items: ValidatedBundleItem[] = [];
  for (const req of reqs) {
    if (!Number.isInteger(req.quantity) || req.quantity < 1) {
      return { ok: false, error: "數量必須為正整數" };
    }

    const row = data.find((b) => b.id === req.bundleId);
    if (!row) return { ok: false, error: `組合不存在或已下架：${req.bundleId}` };

    const bundle = mapBundle(row);
    if (bundle.items.length === 0) {
      return { ok: false, error: `組合設定不完整：${bundle.name}` };
    }

    const available = calcBundleAvailable(bundle.items);
    if (available !== undefined && available < req.quantity) {
      // 指出是哪一款成分不足，客人才知道要怎麼調整
      const short = bundle.items.find(
        (i) => i.stock !== undefined && Math.floor(i.stock / i.quantity) < req.quantity,
      );
      return {
        ok: false,
        error: short
          ? `庫存不足：${bundle.name}（${short.productName} 不足）`
          : `庫存不足：${bundle.name}`,
      };
    }

    items.push({
      bundleId: bundle.id,
      name: bundle.name,
      quantity: req.quantity,
      unitPrice: bundle.price,
      subtotal: bundle.price * req.quantity,
      bundleItems: bundle.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        spec: i.spec,
        quantity: i.quantity,
      })),
    });
  }

  return { ok: true, items };
}

/**
 * 扣減組合庫存。每個組合一次 RPC，函式內部是單一交易——
 * 任一成分不足就整組回滾，不會留下扣了一半的狀態。
 *
 * 回傳失敗的組合名稱（含資料庫給的成分名），沒有失敗則為 null。
 */
export async function decrementBundles(
  items: ValidatedBundleItem[],
): Promise<{ failed: ValidatedBundleItem; message: string } | null> {
  for (const item of items) {
    const { error } = await supabase.rpc("decrement_bundle_stock", {
      p_bundle_id: item.bundleId,
      p_qty: item.quantity,
    });
    if (error) {
      return { failed: item, message: error.message };
    }
  }
  return null;
}

/**
 * 回補組合的成分庫存，依**下單當時的快照**而不是目前的成分設定。
 *
 * 成分在出貨後被改動過的話，依現況回補會補到錯的商品上。
 */
export async function restoreBundleStock(
  snapshots: BundleSnapshotItem[],
  qty: number,
  // 取消路徑會傳自己的 admin client（`orders/[id]/cancel` 用的是另一個實例）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: { rpc: (fn: string, args: Record<string, unknown>) => any } = supabase,
): Promise<void> {
  await Promise.all(
    snapshots.map((s) =>
      client.rpc("increment_stock", {
        p_id: s.productId,
        qty: s.quantity * qty,
        spec: s.spec,
      }),
    ),
  );
}

/** `orders.items` 裡的一筆是不是組合 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isBundleOrderItem(item: any): item is ValidatedBundleItem {
  return item != null && typeof item.bundleId === "number" && Array.isArray(item.bundleItems);
}

/**
 * 付款成功後的扣減（`ecpay/return`、`stripe/webhook`、`paypal` capture 共用）。
 *
 * 這三條路徑與建單路徑的差別是：**付款已經成功，無法回滾**。所以扣失敗時它們
 * 標記 `order_status = "stock_issue"` 交人工處理，而不是回補——不要把建單那邊的
 * `rollbackStock` 照搬過來。
 *
 * 回傳 true 代表全部扣減成功。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function decrementOrderItems(items: any[]): Promise<boolean> {
  const results = await Promise.all(
    items.map(async (item) => {
      if (isBundleOrderItem(item)) {
        const { error } = await supabase.rpc("decrement_bundle_stock", {
          p_bundle_id: item.bundleId,
          p_qty: item.quantity,
        });
        return !error;
      }
      const { data, error } = await supabase.rpc("decrement_stock", {
        p_id: item.productId,
        qty: item.quantity,
        spec: item.spec ?? "150g",
      });
      return data === true && !error;
    }),
  );
  return results.every(Boolean);
}
