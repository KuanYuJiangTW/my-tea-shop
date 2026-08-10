# 提案：全站公告條（國際配送 × 新會員券）

## 問題

兩件已經做好的事，客人在決定要不要買的當下**看不到**：

| 能力 | 實作狀態 | 客人何時才看得到 |
|---|---|---|
| 國際配送（滿 NT$2,500 免國際運費） | 完整。分區運費、ePacket 限重、預估工作天 | **只在 `/checkout` 選了「國際配送」之後**。首頁、商品頁、購物車零提及 |
| 新會員券（NT$50 / 滿 NT$350 / 30 天） | `src/app/auth/callback/route.ts` 自動發放 | **全站零宣傳**，連註冊頁自己都沒提 |

新會員券的問題尤其嚴重：發券時機在 auth callback，客人是**已經決定註冊之後**才拿到。
這張券完全沒有發揮它該有的作用——把猶豫的人推過註冊那道門檻。

站上也沒有任何可以承載這類訊息的元件（`src/components/` 無 banner/announcement）。

## 方案

新增 `AnnouncementBar`，掛在 `SiteChrome` 的 Header 上方。

### 只講一件事，依登入狀態擇一，不做輪播

- **未登入** → 新會員券（帶 CTA 連到 `/auth/register`）
- **已登入 / auth 載入中** → 國際配送

兩則同時出現會互相稀釋：還沒註冊的人需要的是「註冊有好處」，已經是會員的人需要的是
「原來可以寄國外」。輪播等於兩邊都只講一半。

`loading` 期間走配送文案，因為它對登入與否都成立；反過來先顯示「新會員」會讓老客戶
看到一則對自己無效的訊息再閃掉。

### 付款方式限制提前揭露

國際配送目前**僅支援 PayPal**（`checkout.intlPaypalOnly`）。大力宣傳全球配送卻讓客人
一路填完地址才發現不能刷卡，是最痛的流失點。因此配送文案在 `md` 以上直接附註
「（海外訂單以 PayPal 結帳）」。

> 開放 Stripe 收國際卡是更好的長期解，但那是金流高風險區，不在本提案範圍。

### 結帳流程不掛公告條

`/checkout` 排除。人已經決定要買了，這時跳「註冊送 NT$50」只有兩種結果：中斷去註冊
（棄單），或發現自己少拿了折扣而不爽。

## 連帶重構：歡迎券參數抽成常數

新增 `src/lib/coupon-constants.ts`，`auth/callback` 與公告條共用。

理由是**文案與事實不能脫鉤**：這組值原本只寫死在發券端，一旦對外宣傳，
「文案講 NT$50、實際發 NT$30」是會被客訴的那種不同步。值未變動，只換來源。

## 不做什麼

- 不動商品卡（632px 固定高是拍板的硬約束，加元素會破壞三張等高）
- 不引入新的 amber 色（前台正在把 amber 收進 `status-*`，現在加是製造新債）
- 不做 exit-intent 彈窗

## 影響範圍

| 檔案 | 動作 |
|---|---|
| `src/components/AnnouncementBar.tsx` | 新增 |
| `src/lib/coupon-constants.ts` | 新增 |
| `src/components/SiteChrome.tsx` | 掛載 + 排除 `/checkout` |
| `src/app/auth/callback/route.ts` | 硬編碼值改引用常數（值不變） |
| `messages/zh.json`、`messages/en.json` | 新增 `common.announcement` |
