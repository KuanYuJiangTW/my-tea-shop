## 1. 資料層

- [ ] 1.1 寫 `supabase/add_bird_report.sql`：建 `bird_reports`（`id`、`note` text、`reported_at` timestamptz default now()、`created_by` text 選填），開 RLS 且**不開任何對 anon 的寫入政策**；檔頭註明可重複執行
- [ ] 1.2 在同一支 SQL 用 `IF NOT EXISTS` 包起來，確認重跑第二次不會報錯也不會重複建立
- [ ] 1.3 寫 `src/lib/bird-report.ts`：`getLatestBirdReport()` 讀最新一則；查詢錯誤碼為 `42P01`／`42703` 時回 `null` 而不是丟例外

## 2. 過期與季節閘門（純函式，先寫先測）

- [ ] 2.1 在 `src/lib/bird-report.ts` 實作 `isFresh(reportedAt, now)`：48 小時內為 true
- [ ] 2.2 實作 `visibleBirdReport(report, windows, now)`：串起「有文字」「未過期」「在季節內」三個條件，任一不成立回 `null`。季節用 `experience-ordering` 的 `isInSeason()`／`currentWindow()`，不自己算日期
- [ ] 2.3 寫單元測試涵蓋 spec 的每一個 scenario：2 小時前顯示、15 小時前顯示、49 小時前不顯示、5 天前不顯示、空白文字不顯示、缺時間不顯示、季節外不顯示、沒有區間不顯示
- [ ] 2.4 反向驗證：把 48 改成 72，確認「49 小時前不顯示」那條會紅

## 3. 後台

- [ ] 3.1 `src/app/api/admin/bird-report/route.ts`：`GET` 回最新一則與它目前的顯示狀態；`POST` 建立新的一則。兩者都用 `withAdminAuth`
- [ ] 3.2 `POST` 對空字串／純空白回 400；資料表不存在回 503 並指名 `supabase/add_bird_report.sql`
- [ ] 3.3 後台頁面 `src/app/admin/(protected)/bird-report/page.tsx`：一個 textarea ＋ 送出鍵，手機單手可完成
- [ ] 3.4 頁面上顯示「目前對外顯示的是什麼」與狀態（正在顯示／已過期／季節外）——業主打開頁面的第一個問題就是這個
- [ ] 3.5 頁面加一行寫法提示：「寫事實不要寫評價——『下午下雨，四點後零星幾隻』比『鳥況很差』有用」
- [ ] 3.6 加進 `AdminSidebar`

## 4. 對外顯示

- [ ] 4.1 `src/components/BirdReport.tsx`：顯示回報文字與時間；沒有可顯示的回報時回 `null`（不留空區塊）
- [ ] 4.2 時間格式中英雙語，日期計算沿用既有的台北時區處理
- [ ] 4.3 掛到體驗頁 `/experiences/cattle-egret-tour`
- [ ] 4.4 掛到攻略文 `/tea-guide/cattle-egret-viewing-guide`（沿用 `tea-guide-media` 既有的「掛在哪個小標之後」機制）
- [ ] 4.5 `messages/zh.json`／`en.json` 補字串，並確認鍵值兩邊對得上

## 5. 驗證

- [ ] 5.1 測試涵蓋「資料表不存在時對外頁面照常算繪、後台回 503」
- [ ] 5.2 未登入呼叫 `POST` 回 401 且不建立資料
- [ ] 5.3 跑 `/verify`（測試＋型別＋lint 0 error＋build）
- [ ] 5.4 `next start` 實測中英文兩版：有回報時顯示、手動把 `reported_at` 改成 49 小時前後消失
- [ ] 5.5 更新 `.claude/WORKLOG.md`

## 6. 交付給業主

- [ ] 6.1 開 PR，在描述裡寫明「合併後站上沒有任何行為改變，要業主執行 SQL 才會啟用」
- [ ] 6.2 PR 描述附上 `supabase/add_bird_report.sql` 的執行步驟與後台頁面網址
