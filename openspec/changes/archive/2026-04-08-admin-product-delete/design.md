## Context

後台產品管理（`ProductsClient.tsx`）目前支援上下架切換與欄位編輯，但沒有刪除功能。管理員若需刪除商品只能直接操作 Supabase Dashboard，造成操作門檻過高。刪除是不可逆操作，需要確認機制防止誤觸。

## Goals / Non-Goals

**Goals:**
- 每筆商品顯示刪除按鈕
- 點擊後跳出 modal 顯示商品名稱，要求二次確認
- 確認後呼叫 DELETE API 刪除資料，前端同步移除該筆商品
- DELETE API 受後台 session 保護（與現有 PATCH 相同機制）

**Non-Goals:**
- 不實作軟刪除（soft delete）— 直接硬刪除即可
- 不處理刪除關聯訂單資料的 cascade — 目前商品與訂單尚未建立 FK 關聯

## Decisions

**確認 modal 用 inline state 實作，不引入外部 dialog 套件**
`ProductsClient.tsx` 已是 client component，用 `useState` 管理 `confirmDeleteId` 即可，不需要額外依賴。Modal 覆蓋整個畫面並顯示商品名稱，讓管理員明確知道即將刪除哪個商品。

**刪除按鈕僅在非編輯狀態顯示**
編輯中的商品不顯示刪除按鈕，避免操作狀態混亂。

**DELETE API 回傳 HTTP 200 `{ ok: true }`**
與現有 PATCH API 風格一致。若商品不存在仍回傳 200（冪等），避免前端需要處理 404 的邊界情況。

## Risks / Trade-offs

- [硬刪除不可復原] → Modal 顯示商品名稱強制確認，降低誤刪風險
- [若未來訂單建立 FK 關聯，刪除會失敗] → Supabase 會回傳 constraint error，API 將錯誤訊息傳回前端顯示
