# 任務：PayPal 金流三個防護缺口

## ① 未付款不得推進訂單狀態
- [x] 1.1 `api/admin/orders/[id]/route.ts`：在白名單驗證後、寫入前加付款檢查。
      判斷用「請求中的 paymentStatus ?? 資料庫現值」，讓同一請求標記已付款的情境通過
- [x] 1.2 擋下時回 409（不是 400——這是狀態衝突，不是格式錯誤），且不得寄出貨信
- [x] 1.3 `OrderActions.tsx`：`getActions()` 加 `paymentStatus` 判斷，
      未付款線上訂單只留「取消訂單」＋說明文字
- [x] 1.4 COD 例外必須保留（先出貨後收款）
- [x] 1.5 測試：paypal/pending → shipped 擋下；cod/pending → shipped 放行；
      同請求帶 paymentStatus:paid 放行；cancelled 不受限
      → `src/__tests__/admin/order-payment-guard.test.ts`，8 項全綠

## ② PayPal 收件地址處理
- [x] 2.1 `lib/paypal.ts` `createPayPalOrder`：有地址設 `SET_PROVIDED_ADDRESS`，
      無地址設 `NO_SHIPPING`
- [x] 2.2 測試：兩種分支各驗一次送給 PayPal 的 body
      → `paypal-lib.test.ts` 新增 2 項

## ③ retry 保留國際脈絡
- [x] 3.1 `api/paypal/retry/route.ts`：select 補 `customer_name, shipping_address`
- [x] 3.2 國際訂單組出 PayPal shipping 物件並傳入第 5 個參數
- [x] 3.3 `returnUrl` 依 `shipping_address.type` 決定要不要帶 `intl=1`
- [x] 3.4 測試：國際單帶地址與 intl=1；國內單兩者皆無
      → `retry.test.ts` 新增 2 項，並修正 2 項既有斷言（簽章多了第 5 個參數）

## 驗收
- [x] 4.1 `npm run test` 全綠：**86 檔 / 1142 項通過**
- [x] 4.2 四件套：測試 ✅／`tsc --noEmit` 0 錯 ✅／`lint` 0 error（36 個既有 warning，
      皆不在本次改動的檔案）✅／`next build` 成功 ✅
- [x] 4.3 **反向驗證**（`reverse-verify` 的作法）：把 ① 的守衛條件改成永遠不成立後
      重跑，3 個該紅的測試全紅（409 那三項）、5 個該綠的仍綠——確認測試是承重的，
      不是恰好通過。還原後重新全綠。

## 尚未處理（另案，見 proposal「不在這次範圍」）
- [ ] 未付款訂單的回收 cron——「幾天算放棄」是業主的商業判斷
- [ ] Stripe 支援國際配送——等業主的 Stripe 申請核准
