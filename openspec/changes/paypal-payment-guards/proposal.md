# 提案：PayPal 金流的三個防護缺口

2026-09-01 追查一筆卡在待付款的澳洲訂單（#886085260B）時查出來的。金流本身沒壞——
webhook 註冊正確、2026-05-11 的日本國際單走通過——但有三個缺口會讓「沒收到錢」
變成「賠掉貨」或「客人付不完」。

## 背景：國際客人只有 PayPal 一條路

`CheckoutClient` 在國際配送時只提供 PayPal（ECPay 與貨到付款都隱藏），而 Stripe
的 `/api/stripe/checkout` 明確只收 `home` / `cvs`，且結帳頁根本沒放 Stripe 選項。

**所以 PayPal 的任何摩擦都是 100% 的國際訂單損失**，不是可以攤提的一部分。
這是把這三項排進來的理由。

## 三個缺口

### ① 後台可以在未付款狀態出貨（最嚴重）

`OrderActions.getActions()` 只看 `order_status`，完全沒看 `payment_status`；
`PATCH /api/admin/orders/[id]` 也只驗白名單、不驗付款。

按下「確認出貨」的後果是：寄出貨通知信給客人、狀態轉 `shipped`，但錢沒收到，
**而且庫存從來沒扣過**（PayPal 是 capture 成功才扣）。帳面與實體同時錯。

業主 2026-09-01 已誤按過一次「開始備貨」。那一步本身不出貨，但它讓客人失去了
自助取消的能力（`CANCELLABLE_STATUSES = ["new"]`），所以一樣要擋。

**貨到付款是唯一的例外**——COD 本來就是先出貨後收款，不能一起擋掉。

### ② `createPayPalOrder` 沒設 `shipping_preference`

有傳 `purchase_unit.shipping`，但 `experience_context` 沒設
`shipping_preference: "SET_PROVIDED_ADDRESS"`。預設值 `GET_FROM_FILE` 會忽略我們
給的地址，要客人在 PayPal 端再挑一次——多一個流失點，而且**出貨地址可能與
資料庫不一致**（我們照 DB 出貨，客人以為照他在 PayPal 選的出）。

順帶處理國內單：國內地址我們自己收好了，PayPal 沒必要再問一次，設 `NO_SHIPPING`。
這會改變國內 PayPal 的結帳畫面（少一個地址步驟），是刻意的。

### ③ `/api/paypal/retry` 漏傳國際脈絡

呼叫 `createPayPalOrder` 時沒給第 5 個參數（地址），`returnUrl` 也沒帶 `&intl=1`。
後果有兩層：

- PayPal 端不帶地址，等於 ② 的問題在重新付款時原封不動重現
- 成功頁不會顯示關稅與不可退貨須知，**違反 `order-result` 既有規格**
  （「PayPal 國際訂單付款成功 → 顯示預估配送天數、顯示進口關稅由收件人負擔」）

這條現在就會打到人：寄給那位澳洲客人的信正是引導他走「重新付款」。

## 不在這次範圍

- **未付款訂單的回收 cron**：`vercel.json` 有 `expire-pending-bookings` 但訂單沒有。
  點數與折價券在建單當下就扣（`create-order` 步驟 9），客人不取消就永久卡住。
  這是真的缺口，但要決定「幾天算放棄」是業主的商業判斷，不是我的。另案。
- **Stripe 支援國際**：等業主的 Stripe 申請核准。核准後仍需開發（見背景段）。
