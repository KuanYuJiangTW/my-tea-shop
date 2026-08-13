---
description: 跑完整驗證四件套（測試、型別、lint、build）並回報結果
---

執行本專案的完整驗證，依序跑完四項後回報。

## 為什麼是這四項

`npm run lint` **曾經失效**（Next 16 移除 `next lint`），但 2026-07-30 已補上
`eslint.config.mjs`、script 也改成 `eslint`，**現在可用且必須跑**——它抓得到
`tsc` 與單元測試都抓不到的 react-hooks 問題（effect 裡同步 setState 那類）。
門檻是 **0 error**；warning 目前有 36 個，屬既有債務，不列入門檻（見 JUDG-5）。

## 執行

依序執行，前一項失敗仍要跑完後續（要一次看到全部問題，不要一項一項來回）：

1. `npx vitest run` — 測試
2. `npx tsc --noEmit` — 型別檢查
3. `npm run lint` — lint（**只看 error，warning 不阻擋**）
4. `npm run build` — 建置（含 Edge middleware，能抓到只在 build 期浮現的問題）

## 回報格式

用表格給結論，通過的項目只給一行數字，失敗的才展開細節：

| 項目 | 結果 |
|---|---|
| 測試 | ✅ 45 檔 / 587 測試 |
| 型別 | ✅ 零錯誤 |
| Lint | ✅ 0 error（36 warnings，既有債務） |
| Build | ✅ 成功 |

**`tsc` 報一堆 `.next/dev/types/routes.d.ts` 語法錯誤時，不是你的錯**：
那是 dev server 正在寫的產生檔，處於半寫入狀態。停掉 dev server 後
`rm -rf .next/dev` 再跑一次即可（`npm run build` 不會清 `.next/dev`）。
**先確認錯誤路徑是不是 `.next/`**——是的話一律先排除環境，不要去改原始碼。

**失敗時**：貼出實際錯誤輸出（不是轉述），並指出是哪個檔案哪一行。
若錯誤看起來是既有問題而非本次改動造成，**必須用 `git stash` 前後對比證明**，
不能用「應該是既有的」帶過（judgment.md JUDG-5）。

## 完成後

驗證通過**不等於**完成。若這次改動屬於安全修正，還要做反向驗證——
退回修正、確認回歸測試會紅（見 `.claude/skills/reverse-verify/SKILL.md`）。
測試會過和測試有效是兩件事。

$ARGUMENTS
