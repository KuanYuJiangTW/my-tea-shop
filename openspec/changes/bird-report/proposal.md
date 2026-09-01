# 今日鳥況回報

## Why

客人最怕的不是花錢，是**開一小時山路上來卻沒看到鳥**。攻略頁與體驗頁上若有一則第一手的「昨天下午鳥況如何」，是提高到訪意願最有效的一項——而且只有住在賞鳥起點的人給得出來，競爭者複製不了。

現在頁面上完全沒有這種訊息，客人只能自己賭。本季（8/22–10/11）剩不到 41 天，這一季用不到就要等明年。

## What Changes

- 新增「鳥況回報」：一則短文字＋回報時間，由業主在後台更新
- **48 小時自動過期**：超過就完全不顯示。業主不確定、太忙、忘了都不必做任何事——過期的「鳥況良好」比沒有更糟，那是空頭支票，而客人白跑一趟會算在店家頭上
- **季節外不顯示**：沿用 `experience-seasonal-ordering` 既有的季節判斷，不需業主手動開關
- 後台新增一個單欄位頁面：打一行字、按一下送出。設計目標是**在手機上十秒內完成**，因為每天要用
- 顯示於攻略文 `/tea-guide/cattle-egret-viewing-guide` 與體驗頁 `/experiences/cattle-egret-tour`
- 回報時間一律隨文字顯示：「鳥況良好」是宣稱，「8/30 傍晚：鳥況良好」是回報

## Capabilities

### New Capabilities
- `bird-report`：鳥況回報的建立、過期、季節閘門與對外顯示

### Modified Capabilities
<!-- 無。季節判斷沿用 experience-seasonal-ordering 既有的 windows 與 seasonState()，
     不改動它的任何需求；後台權限沿用 admin-auth 既有的 withAdminAuth，同樣不改需求。 -->

## Impact

**新增**
- `supabase/add_bird_report.sql`——業主自行在 SQL Editor 執行（本 repo 沒有 migration 工具）
- 後台頁面與其 API route（`withAdminAuth`）
- 對外顯示元件，中英雙語

**修改**
- `/tea-guide/[slug]` 與 `/experiences/[slug]` 各加一個顯示位置
- `messages/zh.json`、`messages/en.json`

**相依與風險**
- 資料表未建立時（`42703`／`42P01`）全站必須照常運作：對外顯示當作「沒有回報」靜默略過，後台回 503 並指名要跑哪一支 SQL。本 repo 的 code 與 schema 一定會有一段時間不同步，兩邊都要能單獨活著
- 這是**對外的事實宣稱**。寫錯會讓客人白跑，屬於 CLAUDE.md 定義的高風險文案類改動，需回歸測試涵蓋過期與季節閘門
