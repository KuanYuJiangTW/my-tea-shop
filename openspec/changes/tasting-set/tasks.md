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

- [x] 2.1 寫 `supabase/add_product_bundles.sql`：`product_bundles`（name、name_en、price、is_active、slug、description）與 `product_bundle_items`（bundle_id、product_id、spec、quantity）
      ✅ `supabase/add_product_bundles.sql`：product_bundles（slug/name/price/is_active）＋ product_bundle_items（bundle_id/product_id/spec/quantity，unique 三欄）＋ 反查索引 (product_id, spec)
- [x] 2.2 同檔加 `decrement_bundle_stock(p_bundle_id, p_qty)`：在單一交易內逐一扣減成分，任一不足即 `RAISE EXCEPTION` 回滾；**不可設 SECURITY DEFINER**（沿用三參數版 `decrement_stock` 的安全模型，理由見 `supabase/rpc-grants-remediation.sql`）
      ✅ 同檔 decrement_bundle_stock(integer, integer)：單一 plpgsql 內逐一扣減，任一不足即 RAISE（整個交易回滾）。**不是 SECURITY DEFINER**，且 revoke public/anon/authenticated、只 grant service_role，比照 decrement_stock。NULL 庫存＝不管控，不擋扣減
- [x] 2.3 同檔加 RLS：公開只能讀 `is_active = true` 的組合
      ✅ 同檔：兩張表都 enable RLS，公開 select 僅限 is_active = true 的組合與其成分
- [x] 2.4 業主在 Supabase 執行該 SQL 並回報
      ✅ 業主 2026-08-13 執行完畢。實測：`product_bundles` 1 列、`product_bundle_items` 3 列；`decrement_bundle_stock` 存在且守衛有效（不存在的組合、數量 0 都正確 RAISE）
- [x] 2.5 建立第一個組合：**三款各 75g × 1（烏龍、蜜香紅茶、金萱），定價 650，附手提袋**。紅烏龍與四季春的 `stock_75g` 是 0（業主說明為暫時缺貨），本版不當成分
      ✅ 品飲組已建（`tasting-set`／NT$650／`is_active=false`），成分為烏龍・蜜香紅茶・金萱 各 75g×1。**原子性在真實資料庫實測通過**：用臨時組合（烏龍有貨 ＋ 紅烏龍 0）觸發失敗，錯誤訊息指名「紅烏龍茶（75g）」，而烏龍庫存 50 → 50 未變，交易確實整個回滾；臨時組合已刪除

## 3. 讀取與可售量

- [x] 3.1 `src/lib/products.ts` 加組合的讀取，回傳含成分清單
      ✅ `src/lib/bundles.ts`（查 DB）＋ `src/lib/bundle-core.ts`（純邏輯）。拆兩檔的理由同 `shipping.ts`／`shipping-constants.ts`：純函式不該把 supabase client 拖進來，否則單元測試要 mock 一個它用不到的東西。真實資料庫實測巢狀 select 成功，成分與庫存都正確攤平
- [x] 3.2 實作可售量 `min(floor(成分庫存 ÷ 所需數量))`，**不新增庫存欄位**
      ✅ `calcBundleAvailable`：`min(floor(庫存 ÷ 每組所需))`，不新增庫存欄位。庫存 undefined＝不限量不參與最小值；全不限量回 undefined；**無成分回 0（設定錯誤，不能當無限供應）**。實測正式資料回 48 = min(53, 48, 50)
- [x] 3.3 單元測試：成分充足取最小值、任一成分為 0 時可售量為 0、成分需求量 > 1 的情況
      ✅ `src/__tests__/orders/bundle-availability.test.ts` 8 條：取最小值／任一為 0／每組需 2 件／不限量成分不參與／全不限量／無成分回 0，另含 `mapBundle` 依規格取對應庫存欄位與 null→undefined

## 4. 前台

- [x] 4.1 新增組合卡片元件（**不要硬塞進 `ProductCard`**：組合沒有規格選擇，但要列三款成分）
      ✅ `src/components/BundleCard.tsx`（獨立元件，不塞進 `ProductCard`）。接進 `/products`，排在單品之前、只在「全部」分類顯示（組合橫跨烏龍與紅茶，放進任一分類都不誠實）。**實測兩語系渲染**：`/products` 出現「入門首選／品飲組」、`/en/products` 出現「Start Here／Tasting Set」
- [x] 4.2 可售量為 0 時顯示售完，不隱藏商品
      ⚠️ 已實作（`available === 0` → 按鈕 disabled ＋ 顯示「暫時售完」，卡片不隱藏），`calcBundleAvailable` 回 0 的情形有單元測試覆蓋。**但售完的畫面沒有目視驗證**——現貨 48 組，要看到得先把真實庫存歸零，不值得為此動正式資料
- [x] 4.3 加入購物車：`CartContext` 能承載組合品項（帶 `bundleId` 與成分快照）
      ✅ 合成 id 落在 30000+ 區間（`bundleToCartProduct`），沿用 `TeaBagCard` 早就在用的「合成 Product」慣例，所以購物車／Header 徽章／訂單摘要都不用改。編解碼收斂進 `src/lib/cart-item-id.ts`（11 條測試）。**未做端對端**：加入購物車需登入，且送出格式屬第 5 章
- [x] 4.4 文案：定位為「第一次買茶的人從這裡開始」，並把加購話術寫成算術——**「再加一包金萱就免運」**（650 ＋ 金萱 150g 350 ＝ 1,000，差額正好等於一包金萱的售價）。組合定價低於免運門檻是刻意的加購動線，不是缺點
      ✅ 文案定位「入門首選」，加購話術寫成算術：「再加一包阿里山金萱（NT$350）即達 NT$1,000 免運」
- [x] 4.5 中英文案進 `messages/zh.json` 與 `en.json`
      ✅ `messages/zh.json` 與 `en.json` 的 `products.bundle`，兩語系實測渲染正確

## 5. 建單與取消

- [x] 5.1 四條建單 API 辨識組合品項，改呼叫 `decrement_bundle_stock`
      ✅ 共 7 個接點。**建單 4 條**（orders／ecpay·checkout／stripe·checkout／paypal·create-order）用 `splitOrderItems` 分流，單品照既有迴圈、組合走 `validateBundleItems`——刻意不在既有迴圈裡加分支，那四段是各自複製的金流程式碼。**付款後扣減 3 處**（ecpay/return、stripe/webhook、paypal capture）改用共用的 `decrementOrderItems`，組合走 `decrement_bundle_stock`（單一交易），單品走 `decrement_stock`。另解開 `CheckoutClient` 第 4 章留下的刻意 throw
      ⚠️ 前置：`CheckoutClient` 送出時對組合目前是**刻意 throw**（`組合商品尚未開放結帳`），避免靜默丟棄品項讓客人付了錢少收東西。5.1 要連同 `CreateOrderRequest` 的契約一起改掉
- [x] 5.2 單價取 `product_bundles.price`，**不由成分加總推導**
      ✅ 單價取 `product_bundles.price`，測試釘住：組合 ×2 的 `unitPrice` 是 650、`subtotal` 是 1300，而不是成分加總的 700／1400
- [x] 5.3 `orders.items` 寫入組合時附成分快照
      ✅ `orders.items` 寫入 `[...validatedItems, ...validatedBundles]`。組合與單品共用 name/quantity/unitPrice/subtotal 四欄，下游（信件、後台、訂單明細）照舊讀得到；組合另帶 `bundleItems` 快照。測試驗到三筆成分快照都在
- [x] 5.4 取消訂單依**快照**回補成分庫存（不是依目前的成分設定）
      ✅ 兩條取消路徑（`orders/[id]/cancel`、`admin/orders/[id]`）都改用 `isBundleOrderItem` 判斷後走 `restoreBundleStock`，**依下單當時的快照回補**而非目前的成分設定。原本的寫法會對組合送出 `p_id: undefined`
- [x] 5.5 缺貨錯誤訊息指出是哪一款成分不足
      ✅ 兩層都有：`validateBundleItems` 在下單前指出「庫存不足：品飲組（阿里山金萱茶 不足）」；DB 的 `decrement_bundle_stock` 在競態下 RAISE 的訊息也含成分名，直接透出給客人。測試斷言錯誤訊息含成分名
- [x] 5.6 測試：只含組合／混合單品與組合／組合成分與單品指向同一款茶（庫存合計扣 2）
      ✅ `src/__tests__/orders/create-order-bundle.test.ts` 7 條：只含組合（不對成分逐一扣）／單價取組合定價／成分快照/混合單品與組合（小計 1050）／組合扣減失敗要回補已扣的單品／`splitOrderItems`／`isBundleOrderItem`。**反向驗證**：移除組合失敗時的 `rollbackAll()` 後該條立刻變紅（1 failed）

## 6. 驗收

- [x] 6.1 `/verify` 三項全過
      ✅ 四件套（`/verify` 已改為四項）：49 檔 616 測試、tsc 0 錯誤、lint 0 error（36 warning 為既有債務）、build 成功
- [x] 6.2 併發測試：兩筆訂單同時搶僅剩 1 組，只有一筆成功且庫存不為負
      ✅ 真實資料庫實測。用臨時組合把可售量做成剛好 1（金萱茶包庫存 7、每組需 4），同時送出兩筆「買 1 組」：**成功 1 筆、失敗 1 筆**，失敗訊息「庫存不足：阿里山金萱茶（teabag）」；庫存 7 → 3，沒有超賣也沒有負數，扣減量與成功筆數相符。測後還原為 7，臨時組合已刪
- [x] 6.3 反向驗證：把 `decrement_bundle_stock` 的回滾拿掉，確認「其中一項成分不足」的測試會紅
      ✅ 用對照組證明測試不是空過（不改動正式函式，改以「有無交易保護」對比）：**應用層逐一扣** → 烏龍 50→49、紅烏龍那步回 `data=false`，**第一項被扣掉卻沒還原**（這正是修正前的樣子）；**走 `decrement_bundle_stock`** → 同樣的成分組合，烏龍 50→50 完全沒動，函式回報「庫存不足：紅烏龍茶（75g）」。差別即為交易保護
- [x] 6.4 端對端：下單一組 → 確認三款成分各扣 1 → 取消 → 確認各回補 1
      ✅ 端對端（資料庫層）：扣減前 烏龍50／紅茶53／金萱48 → `decrement_bundle_stock(1,1)` 後 49／52／47（**三款各扣 1**）→ 依成分快照 `increment_stock` 回補後回到 50／53／48（**完全還原**）。**未做 API 層端對端**：`POST /api/orders` 需要真實登入 session，容器內取不到
- [x] 6.5 英文版 `/en` 無中文殘留
      ✅ 短暫開啟 `is_active` 後掃描 `/en/products` 的組合卡渲染文字（濾除 script 內的 messages bundle）：**中文字元 0 個**。卡片文案為 Start Here／Tasting Set／英文描述
- [x] 6.6 ~~確認是否上首頁~~ → **業主決定不上首頁**，只在 `/products` 呈現（同 7.3）

## 7. 待業主提供

- [x] 7.1 ~~組合的外盒與包材成本~~ → 業主 2026-08-13 提供：單包 75g 包材 11.16、禮盒 175–210（本版不用禮盒，改手提袋）
- [x] 7.2 ~~組合售價~~ → **已定 NT$650**（單買合計 700，折 50；差額 350 剛好等於一包金萱 150g，命中免運門檻）
- [x] 7.3 ~~是否上首頁~~ → **業主 2026-08-13 決定：品飲組先不上首頁**，只在 `/products` 呈現
- [x] 7.4 ~~紅烏龍與四季春的 75g~~ → 業主 2026-08-13 說明是**暫時缺貨**；補貨後再評估四款散茶版或禮盒版
- [x] 7.5 ~~手提袋的實際成本~~ → 業主 2026-08-13 提供：手提袋 20–25、不印品牌，另貼品牌貼紙 1 張 2 元 → **合計 22–27**。落在先前敏感度區間內，定價 650 不變（淨利率約 47.6–48.3%）
