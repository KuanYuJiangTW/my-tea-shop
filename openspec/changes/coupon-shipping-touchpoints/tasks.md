# 任務：其餘四個觸點

## ② 商品清單頁運送信任標
- [x] 2.1 `DOMESTIC_FREE_THRESHOLD` 改為 export（文案與計算同源）
- [x] 2.2 `ProductsClient` 篩選列下方加信任標，兩段用 flex-wrap 各自成行
- [x] 2.3 不動 `ProductCard`（632px 固定高是硬約束）
- [x] 2.4 驗證：1280 單行 19px；375 兩行、無水平溢出；色 #637169（tea-text-muted）

## ③ 購物車國際免運進度
- [x] 3.1 新增 `intlFreeShippingHint`，樣式用 `tea-text-muted`（比國內那行低調）
- [x] 3.2 硬編碼 1000 改用 `DOMESTIC_FREE_THRESHOLD`
- [x] 3.3 既有 `text-amber-600` 收進 `status-warn`
- [x] 3.4 驗證三個金額區間：
      800 →「再買 NT$200」(#92400E) +「還差 NT$1,700」(#637169)；
      1200 → 國內提示消失顯示「免費」，國際仍差 NT$1,300；
      2800 → 兩行皆消失

## ④ 註冊頁
- [x] 4.1 標題下方加券徽章，位置在表單**上方**（決定要不要填表的當下）
- [x] 4.2 成功畫面加「完成驗證後會自動存入」
- [x] 4.3 **不秀券碼**——券由 `/auth/callback` 在驗證後才發，此刻不存在
- [x] 4.4 驗證：徽章 #58745F on #EBF3EE；成功畫面以暫時翻轉 `success` 初值實跑後還原
- [x] 4.5 **未真實註冊**（正式 Supabase，不建帳號）

## ⑤ 券到期提醒
- [x] 5.1 `supabase/add_coupon_expiry_notification.sql`（欄位 + 部分索引）
- [x] 5.2 `sendCouponExpiryEmail`（單張/多張文案分支，姓名走 escapeHtml）
- [x] 5.3 `/api/cron/coupon-expiry-notify`：CRON_SECRET 驗證、一人一封、只標記成功者
- [x] 5.4 `vercel.json` 加 UTC 04:00
- [x] 5.5 12 條測試
- [x] 5.6 **反向驗證**：把標記邏輯退回成 points 那種批次 update，
      「寄信失敗不得被標記」與「全部失敗不呼叫 update」兩條確實轉紅，再改回

## 上線前置（人工）
- [ ] 6.1 在 Supabase 執行 `supabase/add_coupon_expiry_notification.sql`。
      **未執行前該 cron 每次都會 500**
- [ ] 6.2 確認 Vercel 專案的 CRON_SECRET 已設定（既有 cron 已在用，應該已有）

## 已知範圍外
- [ ] 7.1 國際配送僅支援 PayPal。本次只做文案揭露，開放 Stripe 收國際卡是金流高風險區，另案
