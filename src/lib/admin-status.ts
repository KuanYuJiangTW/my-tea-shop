/**
 * 後台狀態徽章的單一事實來源。
 *
 * 原本三個檔案（dashboard、orders 列表、orders 詳情）各自複製一份對照表，
 * 且都少了鍵：`stock_issue` 與 `failed` 的訂單會 fallback 成「新訂單」、
 * 已完課的預約會 fallback 成「待付款」。對每天看後台的人來說，
 * 那是把「付款失敗」顯示成「待出貨的新訂單」。
 *
 * ⚠️ 值域以「程式碼實際會寫入的值」為準，**不是** `src/types/index.ts` 的
 * `OrderStatus`。那份型別已與實作脫節——它宣告了 pending / paid / delivered
 * （從未寫入），卻沒有 new / completed / stock_issue / failed（實際都會寫入）。
 * 修那份型別會牽動前台，屬另一件事；這裡先以實情為準。
 *
 * 新增狀態時：**同時更新這裡與 `src/__tests__/admin/status-labels.test.ts`
 * 的值域清單**，測試會擋住漏補。
 */

export type StatusBadge = { label: string; cls: string };

/** 訂單狀態 `orders.order_status` */
export const ORDER_STATUS: Record<string, StatusBadge> = {
  new:         { label: "新訂單", cls: "bg-status-idle-soft text-status-idle" },
  preparing:   { label: "備貨中", cls: "bg-status-info-soft text-status-info" },
  shipped:     { label: "已出貨", cls: "bg-tea-green text-white" },
  completed:   { label: "已完成", cls: "bg-tea-green-dark text-white" },
  cancelled:   { label: "已取消", cls: "bg-status-danger-soft text-status-danger" },
  // 以下兩個是本次補上的。付款成功後庫存不足 → stock_issue（需人工處理，用警示琥珀）；
  // 金流回報失敗 → failed（終態，與已取消同組紅）
  stock_issue: { label: "庫存不足", cls: "bg-status-warn-soft text-status-warn" },
  failed:      { label: "付款失敗", cls: "bg-status-danger-soft text-status-danger" },
};

/** 付款狀態 `orders.payment_status` */
export const PAYMENT_STATUS: Record<string, StatusBadge> = {
  pending: { label: "待付款", cls: "bg-status-warn-soft text-status-warn" },
  paid:    { label: "已付款", cls: "bg-status-done-soft text-status-done" },
};

/** 體驗預約狀態 `experience_bookings.status` */
export const BOOKING_STATUS: Record<string, StatusBadge> = {
  // 舊表的 key 是 `pending`，但全 repo 從未寫入該值（型別與實作都是 pending_payment）。
  // 也就是說那個 key 從來沒被直接命中過，只是剛好被當成 fallback 用。
  // 配色沿用原本 fallback 呈現的樣子，避免這次修正順帶改變外觀。
  pending_payment: { label: "待付款", cls: "bg-status-idle-soft text-status-idle" },
  confirmed:       { label: "已確認", cls: "bg-status-info-soft text-status-info" },
  completed:       { label: "已完成", cls: "bg-tea-green-dark text-white" },
  cancelled:       { label: "已取消", cls: "bg-status-danger-soft text-status-danger" },
};

/**
 * 查表取徽章。查不到就**把原始值顯示出來**，不要靜默假裝成別的狀態。
 *
 * 舊寫法是 `MAP[status] ?? MAP.new`——一個沒被涵蓋的狀態會偽裝成「新訂單」，
 * 而且完全沒有痕跡。改成顯示原始字串後，下次再漏鍵至少看得見。
 */
export function statusBadge(
  map: Record<string, StatusBadge>,
  status: string | null | undefined,
): StatusBadge {
  if (status && map[status]) return map[status];
  return {
    label: status ? `未定義：${status}` : "未知狀態",
    cls: "bg-tea-cream-dark text-tea-text-light",
  };
}
