# 任務：品飲組

> **這是高風險區（庫存扣減）。** 依 CLAUDE.md 鐵律 4：動手前先讀
> `openspec/specs/product-ordering/`，改完必跑 `npm run test`，並套用
> `.claude/playbooks/judgment.md` 的高風險驗證。
>
> 第 1 章是**前置任務**：現行的部分扣減缺陷必須先修，因為組合會把每一列訂單項目
> 變成三次扣減，直接放大命中率。沒做完第 1 章不要開始第 2 章。

## 1. 前置：修既有的部分扣減缺陷

- [x] 1.1 讀 `src/app/api/orders/route.ts:190-215`，確認現況：`Promise.all` 平行扣減，任一失敗回 400 但**已成功的不回補**；訂單 insert 失敗回 500 時也不回補
      ✅ 查證結果與提案假設不同：**扣減點不是「四條建單路徑」**。只有 `orders/route.ts`（貨到付款）在建單前扣；`ecpay/return`、`stripe/webhook`、`paypal` capture 是付款成功後才扣，扣失敗時標記 `order_status = "stock_issue"` 交人工處理——那是正確設計，不在本章範圍。**缺陷只在 `orders/route.ts` 一支**
- [x] 1.2 先寫**會紅的測試**：兩品項訂單，第二項庫存不足 → 斷言第一項的庫存維持原值
      ✅ `src/__tests__/orders/create-order-stock-rollback.test.ts`「其中一項扣減失敗」，實跑先紅
- [x] 1.3 再寫一條：扣減全成功但 `orders` insert 回錯 → 斷言所有品項庫存回補
      ✅ 同檔「扣減全成功但訂單寫入失敗」，實跑先紅
- [x] 1.4 實作回補（呼叫既有的 `increment_stock`），四條建單路徑都要：`orders`、`ecpay/checkout`、`stripe/checkout`、`paypal/create-order`
      ✅ 加 `rollbackStock()`，只補 `data === true` 的項目（失敗那項沒扣成功，補了會無中生有）。**範圍修正為 `orders/route.ts` 一支**，理由見 1.1
- [x] 1.5 `npm run test` 全綠，且 1.2／1.3 兩條由紅轉綠
      ✅ 46 檔 590 測試全過（新增 3 條），1.2／1.3 由紅轉綠；tsc 0 錯誤、lint 0 error、build 成功
- [x] 1.6 反向驗證：拿掉回補邏輯，確認 1.2／1.3 確實變紅（見 `reverse-verify` skill）
      ✅ 移除兩處 `rollbackStock()` 後 1.2／1.3 立刻變紅（2 failed），確認測試不是空過

## 2. 資料層

- [ ] 2.1 寫 `supabase/add_product_bundles.sql`：`product_bundles`（name、name_en、price、is_active、slug、description）與 `product_bundle_items`（bundle_id、product_id、spec、quantity）
- [ ] 2.2 同檔加 `decrement_bundle_stock(p_bundle_id, p_qty)`：在單一交易內逐一扣減成分，任一不足即 `RAISE EXCEPTION` 回滾；**不可設 SECURITY DEFINER**（沿用三參數版 `decrement_stock` 的安全模型，理由見 `supabase/rpc-grants-remediation.sql`）
- [ ] 2.3 同檔加 RLS：公開只能讀 `is_active = true` 的組合
- [ ] 2.4 業主在 Supabase 執行該 SQL 並回報
- [ ] 2.5 建立第一個組合：三款各 75g × 1（烏龍、蜜香紅茶、金萱）——**紅烏龍與四季春的 `stock_75g` 是 0，不能當成分**

## 3. 讀取與可售量

- [ ] 3.1 `src/lib/products.ts` 加組合的讀取，回傳含成分清單
- [ ] 3.2 實作可售量 `min(floor(成分庫存 ÷ 所需數量))`，**不新增庫存欄位**
- [ ] 3.3 單元測試：成分充足取最小值、任一成分為 0 時可售量為 0、成分需求量 > 1 的情況

## 4. 前台

- [ ] 4.1 新增組合卡片元件（**不要硬塞進 `ProductCard`**：組合沒有規格選擇，但要列三款成分）
- [ ] 4.2 可售量為 0 時顯示售完，不隱藏商品
- [ ] 4.3 加入購物車：`CartContext` 能承載組合品項（帶 `bundleId` 與成分快照）
- [ ] 4.4 文案：定位為入門組合，並說明「再加一包即達 NT$1,000 免運」——組合定價低於免運門檻是刻意的加購動線
- [ ] 4.5 中英文案進 `messages/zh.json` 與 `en.json`

## 5. 建單與取消

- [ ] 5.1 四條建單 API 辨識組合品項，改呼叫 `decrement_bundle_stock`
- [ ] 5.2 單價取 `product_bundles.price`，**不由成分加總推導**
- [ ] 5.3 `orders.items` 寫入組合時附成分快照
- [ ] 5.4 取消訂單依**快照**回補成分庫存（不是依目前的成分設定）
- [ ] 5.5 缺貨錯誤訊息指出是哪一款成分不足
- [ ] 5.6 測試：只含組合／混合單品與組合／組合成分與單品指向同一款茶（庫存合計扣 2）

## 6. 驗收

- [ ] 6.1 `/verify` 三項全過
- [ ] 6.2 併發測試：兩筆訂單同時搶僅剩 1 組，只有一筆成功且庫存不為負
- [ ] 6.3 反向驗證：把 `decrement_bundle_stock` 的回滾拿掉，確認「其中一項成分不足」的測試會紅
- [ ] 6.4 端對端：下單一組 → 確認三款成分各扣 1 → 取消 → 確認各回補 1
- [ ] 6.5 英文版 `/en` 無中文殘留
- [ ] 6.6 業主提供包材成本後拍板售價，並確認是否上首頁

## 7. 待業主提供

- [ ] 7.1 組合的外盒與包材成本
- [ ] 7.2 組合售價（成分單買合計 700）
- [ ] 7.3 是否上首頁（目前三張卡是烏龍、蜜香紅茶、金萱）
- [ ] 7.4 紅烏龍與四季春的 75g 是暫時缺貨還是不做——決定要不要出第二種組合
