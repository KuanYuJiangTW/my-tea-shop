# checker 的記憶

一行一條，開頭標日期。只記「下次能直接照做的」——這次驗了什麼屬於 WORKLOG。
超過 40 條時合併同類、刪掉不再成立的。

## 環境雜訊（不是程式的錯）

- 2026-08-31（種子）`tsc` 報 `.next/dev/types/routes.d.ts` 語法錯誤＝dev server 正在寫入的產生檔，非缺陷。先確認錯誤路徑是不是 `.next/`，是就排除環境，不要去改原始碼。來源：`.claude/commands/verify.md`。
- 2026-08-31（種子）`npm run lint` 目前有 36 個 warning 屬既有債務，門檻只看 **0 error**（JUDG-5）。用 warning 數量判 FAIL 是誤判。

## 沒有鑑別力的證據（JUDG-8）

- 2026-08-31（種子）四件套（test／tsc／lint／build）**完全抓不到純文字檔的內容錯誤**。`public/llms.txt` 曾把導覽價格寫成 250（實際 450）而四項全綠。驗對外文案要直接讀檔比對，不能引用建置結果。
- 2026-08-31（種子）`git push` 成功**不等於已部署**——Vercel 曾漏接一次 webhook，修正在線上多躺 15 分鐘。要驗線上狀態就去打線上 URL，不要用 push 成功當證據（JUDG-9）。

## 驗證招式

- 2026-11-07 驗 openspec 文件：文中引用的路徑／路由逐個確認存在，見 [spec-ghost-paths](feedback_spec_ghost_paths.md)。

- 2026-08-31（種子）新增要進版控的 `.claude/` 子項後，用 `git check-ignore -v <路徑>` 實查——該目錄的 `.gitignore` 是 `.claude/*` 加白名單制，漏加白名單會靜默被忽略。

- 2026-11-07 後台 API 測試常把 `withAdminAuth` mock 成 identity（如 `admin-experience-active.test.ts`）→ 那份測試**證明不了** 401 與 audit action 字串；401 只能靠 `route-auth-coverage.test.ts`（靜態掃描有包 guard），audit 的 action 值無自動測試，驗 spec 的「401／稽核」Scenario 要標「僅靜態涵蓋」。
- 2026-11-07 `npx tsc --noEmit | tail` 的 `$?` 是 tail 的 exit code，不是 tsc 的；看輸出是否為空才準。
