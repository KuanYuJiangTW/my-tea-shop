# 任務：PayPal 金流三個防護缺口

## ① 未付款不得推進訂單狀態
- [ ] 1.1 `api/admin/orders/[id]/route.ts`：在白名單驗證後、寫入前加付款檢查。
      判斷用「請求中的 paymentStatus ?? 資料庫現值」，讓同一請求標記已付款的情境通過
- [ ] 1.2 擋下時回 409（不是 400——這是狀態衝突，不是格式錯誤），且不得寄出貨信
- [ ] 1.3 `OrderActions.tsx`：`getActions()` 加 `paymentStatus` 判斷，
      未付款線上訂單只留「取消訂單」＋說明文字
- [ ] 1.4 COD 例外必須保留（先出貨後收款）
- [ ] 1.5 測試：paypal/pending → shipped 擋下；cod/pending → shipped 放行；
      同請求帶 paymentStatus:paid 放行；cancelled 不受限

## ② PayPal 收件地址處理
- [ ] 2.1 `lib/paypal.ts` `createPayPalOrder`：有地址設 `SET_PROVIDED_ADDRESS`，
      無地址設 `NO_SHIPPING`
- [ ] 2.2 測試：兩種分支各驗一次送給 PayPal 的 body

## ③ retry 保留國際脈絡
- [ ] 3.1 `api/paypal/retry/route.ts`：select 補 `customer_name, shipping_address`
- [ ] 3.2 國際訂單組出 PayPal shipping 物件並傳入第 5 個參數
- [ ] 3.3 `returnUrl` 依 `shipping_address.type` 決定要不要帶 `intl=1`
- [ ] 3.4 測試：國際單帶地址與 intl=1；國內單兩者皆無

## 驗收
- [ ] 4.1 `npm run test` 全綠（鐵律 4：金流屬高風險區，必跑）
- [ ] 4.2 `/verify` 四件套（測試＋型別＋lint＋build）
