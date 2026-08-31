# tester 的記憶

一行一條，開頭標日期。寫「下次能直接照做的」，不寫這次測了什麼。

## 這個專案的測試陷阱

- 2026-08-31（種子）**不要手刻 Supabase chain mock**。用 `src/__tests__/points/helpers/supabase-mock.ts` 的 `createChainMock`／`createSelectAwareChainMock`／`createTableRouter`。手刻的少一個鏈式方法，route 加一個 `filter` 就一次紅 7 條、訊息完全不指向原因（lessons.md 2026-08-23）。
- 2026-08-31（種子）**文案測試不要 `import "@/lib/experiences"`**——會把 Supabase client 拉進單元測試而爆掉。改用 `readFileSync` 讀原始碼文字定位，範例：`src/__tests__/experiences/egret-copy.test.ts:31-40`。
- 2026-08-31（種子）`.claude/hooks/*.test.js` **不是 vitest suite**，是用 `node` 直接跑的獨立腳本；`vitest.config.ts` 已把 `.claude` exclude。要驗它們用 `node .claude/hooks/<name>.test.js`。
- 2026-08-31（種子）反向驗證還原時**不要對有未提交變更的檔案下 `git checkout --`**——會把同檔案未 commit 的工作一起洗掉。用備份檔或 `git stash`（已併入 JUDG-2）。

## 假綠的形狀

- 2026-08-31（種子）**只斷言「不該出現的字串不存在」= 假綠**：把整段內容刪掉也會過。禁止類斷言一律寫成雙向——該講的有講、不該講的沒講（`egret-copy.test.ts` 的檔頭有寫明這條）。

## 難以測試的區域

（尚無。發現某段程式碼結構讓測試寫不下去時記在這裡——那通常是實作該重構的訊號。）
