# 設計：品飲組

## Context

現行的商品模型是「一個 `products` 列 × 三種規格」（`price` / `price_75g` / `price_tea_bag`，各配一個 `stock_*` 欄位）。沒有任何組合／套裝的概念。

庫存扣減的現況（`src/app/api/orders/route.ts:190-200`）：

```ts
const decrementResults = await Promise.all(
  validatedItems.map((item) =>
    supabase.rpc("decrement_stock", { p_id: item.productId, qty: item.quantity, spec: item.spec })
  )
);
const failedIdx = decrementResults.findIndex((r) => r.data === false || r.error);
if (failedIdx !== -1) {
  return NextResponse.json({ error: `庫存不足：...` }, { status: 400 });
}
```

**這裡有一個既有缺陷，必須先處理才能做組合**：`Promise.all` 平行扣減，任一項失敗就回 400，但**已經成功的那幾項不會補回去**。訂單 insert 失敗（第 215 行回 500）時也一樣不補。`increment_stock` 這支 RPC 存在，但只在「取消訂單」時被呼叫（`admin/orders/[id]`、`orders/[id]/cancel`）。

也就是說今天已經可能發生「庫存被扣掉但訂單不存在」。單品情境下要兩項以上商品才會遇到，機率低；**組合商品會把每一列訂單項目變成三次扣減，命中率直接上升三倍**。

其他約束：

- `stock_75g` 現況：烏龍 50、蜜香紅茶 53、金萱 48、紅烏龍 **0**、四季春 **0**
- 三參數版 `decrement_stock` 不是 `SECURITY DEFINER`，靠伺服器端的 service role 執行（`supabase/rpc-grants-remediation.sql` 有完整脈絡），新函式必須沿用同一個安全模型
- 商品卡固定高度 632px（業主指定值）

## Goals / Non-Goals

**Goals**

- 品飲組能被瀏覽、加入購物車、結帳、出貨、取消退款，與一般商品一致
- 可售量正確反映三款成分的最小值，且**不超賣**
- 扣減具備原子性：全成功或全不動
- 組合的成分與比例存在資料庫，不寫死在程式碼

**Non-Goals**

- 不做自由選配（N 選 3）
- 不做組合的獨立庫存（組合不預先打包，出貨時才組）
- 不改動既有單品的訂購流程行為
- 不做組合專屬的折扣券規則

## Decisions

### D1：組合用新表描述，不在 `products` 加欄位

**選擇**：新增 `product_bundles`（組合本身：名稱、售價、是否上架）與 `product_bundle_items`（成分：`bundle_id`、`product_id`、`spec`、`quantity`）。

**替代方案**：在 `products` 加 `is_bundle` 與一個 JSON 欄位描述成分。

**理由**：成分是一對多關係，塞進 JSON 會讓「哪些組合用到金萱 75g」這種查詢無法用索引，而缺貨判斷正需要反向查詢。另外 `products` 已經被三種規格的欄位撐得很寬，再加型別分支會讓每個讀取點都要判斷。

### D2：可售量由成分推導，不獨立維護

**選擇**：`available = min(floor(component.stock / component.quantity))`，即時計算，不存欄位。

**理由**：獨立維護等於同一個事實有兩個來源，一定會不同步。組合不預先打包，所以也沒有「已打包庫存」這種真實存在的東西可記。

### D3：扣減改為單一 RPC，一個交易內完成

**選擇**：新增 `decrement_bundle_stock(bundle_id, qty)`，在函式內對所有成分逐一扣減；任一成分不足就整個交易 `RAISE EXCEPTION` 回滾。與既有 `decrement_stock` 同樣不是 `SECURITY DEFINER`。

**替代方案**：在應用層對三個成分各呼叫一次 `decrement_stock`。

**理由**：應用層迴圈無法保證原子性——這正是現況那個缺陷的成因。放進單一 plpgsql 函式，Postgres 的交易語意直接給我們「全成功或全不動」。

### D4：先修既有的部分扣減缺陷，再做組合

**選擇**：把「扣減失敗或訂單 insert 失敗時，補回已扣減的項目」列為本提案的**前置任務**，四條建單路徑（`orders`、`ecpay/checkout`、`stripe/checkout`、`paypal/create-order`）都要處理。

**理由**：組合會放大這個缺陷。在放大它之前先修掉，是唯一負責任的順序。這也是 CLAUDE.md 鐵律 4 所說的高風險區——改完必跑 `npm run test`。

### D5：組合在購物車與訂單中以「一個品項」存在

**選擇**：`orders.items` 裡組合是一列（帶 `bundleId` 與成分快照），不是展開成三列。

**理由**：客人買的是一組，訂單明細、退款、客服溝通都應該以「一組」為單位。成分快照是為了日後追溯（成分或售價變動後，舊訂單仍能顯示當時的內容）。

### D6：定價待業主拍板，但設下限

**選擇**：程式不寫死售價，讀 `product_bundles.price`。設計上建議不低於**成分成本 ＋ 包材 ＋ 金流** 的打平點。

參考數字（成本取自業主 2026-08-12 提供的斤價）：

| 成分（75g） | 售價 | 茶葉成本 |
|---|---|---|
| 阿里山高山烏龍 | 240 | 81.25 |
| 蜜香紅茶 | 240 | 100.00 |
| 阿里山金萱 | 220 | 81.25 |
| **合計** | **700** | **262.50** |

外盒與包材成本業主尚未提供，是定價的最後一塊拼圖。

## Risks / Trade-offs

- **[既有的部分扣減缺陷被組合放大]** → D4 列為前置任務，先修再做
- **[組合與單品同時搶同一批 75g 庫存]** → 扣減在 DB 交易內完成，先到先得；前台顯示的可售量是即時計算，可能在結帳當下已被搶走——錯誤訊息要明確指出是哪一款成分不足
- **[成分之一停產或長期缺貨]** → 組合的 `is_active` 由人工控制；可售量為 0 時前台顯示售完而非隱藏，避免客人以為商品消失
- **[組合售價低於免運門檻 1,000]** → 這是加購動線不是缺陷，但文案要講清楚「再加一包就免運」，否則客人會覺得被卡
- **[商品卡 632px]** → 組合卡的資訊量與單品不同（沒有規格選擇、但要列三款成分），需要獨立的卡片元件而不是硬塞進 `ProductCard`
- **[退款與部分退貨]** → 本提案不做組合的部分退貨（退一款茶），退款以整組為單位

## Migration Plan

1. **前置**：修四條建單路徑的扣減回補（D4），跑 `npm run test`
2. 執行 `supabase/add_product_bundles.sql`（兩張新表 ＋ `decrement_bundle_stock` RPC ＋ RLS）
3. 後台或 SQL 建立第一個組合（三款各 75g × 1）
4. 部署前台顯示與訂購流程
5. 業主提供包材成本後拍板售價

**回滾**：`product_bundles.is_active = false` 即可讓組合從前台消失，不影響既有訂單；程式碼回滾用 `git revert`。

## Open Questions

- **組合售價**（單買合計 700，等包材成本才能定）
- **組合的外盒是否算獨立包材**，還是沿用現有的單包包材 × 3
- **要不要放上首頁**（首頁目前三張卡是烏龍、蜜香紅茶、金萱；業主 2026-08-12 已決定紅烏龍不換上首頁，組合是否比照）
- 紅烏龍與四季春的 `stock_75g` 是 0——是暫時缺貨還是不打算做 75g？若之後補貨，是否要出第二種組合
