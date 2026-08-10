# 提案：國際配送與新會員券的其餘四個觸點

延續 `announcement-bar`。公告條解決了「剛進站」，這份補上客人動線的其餘四段。

## 方案

| # | 位置 | 講什麼 | 為什麼是這裡 |
|---|---|---|---|
| ② | `/products` 篩選列下方 | 國內滿 NT$1,000／海外滿 NT$2,500 免運 | 逛商品時建立信任，不動商品卡 |
| ③ | `/cart` 訂單摘要 | 國際免運進度「還差 NT$X」 | 客單價槓桿。國際客單價本來就高 |
| ④ | `/auth/register` | 註冊送 NT$50 購物金 | 決定要不要填表的當下 |
| ⑤ | 每日 cron | 券到期前 7 天提醒 | 這些人已註冊，只差臨門一腳 |

## 幾個刻意的決定

### ③ 國際那行比國內低調

國內用 `status-warn`（差額是提醒），國際用 `tea-text-muted`（是資訊）。多數客人寄台灣，
國際那行對他們不該有警示強度——它真正的作用是讓「不知道能寄國外」的人第一次知道。

順手把該區既有的 `text-amber-600` 收進 `status-warn`（WORKLOG 排隊工作 1 的既定方向）：
正要在旁邊加第二行提示，留著 amber 會讓新舊兩種樣式並存。

### ④ 註冊成功畫面不秀券碼

原始構想是「註冊成功直接秀券碼」，**做不到**：券是 `/auth/callback` 在信箱驗證後才發，
成功畫面出現時資料庫裡還沒有這張券。

改成把券當作「去點驗證信」的誘因。這反而打在更痛的流失點上——沒點驗證信的人一張券都拿不到。

### ⑤ 只做 7 天一段提醒

points 那套是 7 天 + 3 天兩段。歡迎券效期只有 30 天、面額 NT$50，兩段提醒是騷擾。

**不複製 points cron 的一個缺陷**：它在迴圈外用同一組 where 條件批次 update，
寄信失敗的人一樣被標記成已通知，等於永久漏掉。本 cron 只標記寄送成功的 id。

## ⚠️ 上線前置作業

`supabase/add_coupon_expiry_notification.sql` **必須先在 Supabase 執行**，
`coupons.notification_sent_7d` 不存在時該 cron 每次都會 500。

## 影響範圍

| 檔案 | 動作 |
|---|---|
| `src/lib/shipping-constants.ts` | `DOMESTIC_FREE_THRESHOLD` 改為 export |
| `src/app/products/ProductsClient.tsx` | ② 運送信任標 |
| `src/app/cart/CartClient.tsx` | ③ 國際免運進度 + amber 收進 status-warn |
| `src/app/auth/register/page.tsx` | ④ 券徽章 + 成功畫面說明 |
| `src/lib/email.ts` | 新增 `sendCouponExpiryEmail` |
| `src/app/api/cron/coupon-expiry-notify/route.ts` | 新增 |
| `supabase/add_coupon_expiry_notification.sql` | 新增（**需人工執行**） |
| `vercel.json` | 新增 cron，UTC 04:00（台灣中午 12:00，避開既有五個時段） |
| `messages/{zh,en}.json` | 對應字串 |
