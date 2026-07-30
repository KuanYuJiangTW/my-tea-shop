---
description: 跑完整驗證三件套（測試、型別、build）並回報結果
---

執行本專案的完整驗證，依序跑完三項後回報。

## 為什麼是這三項

`npm run lint` **已失效**——Next 16 移除了 `next lint`，而本專案沒有 `eslint.config.js`，
跑它只會得到 `Invalid project directory provided, no such directory: .../lint`。
不要去「修」這個錯誤，它不是你造成的；型別檢查由 `tsc --noEmit` 負責。

## 執行

依序執行，前一項失敗仍要跑完後續（要一次看到全部問題，不要一項一項來回）：

1. `npx vitest run` — 測試
2. `npx tsc --noEmit` — 型別檢查
3. `npm run build` — 建置（含 Edge middleware，能抓到只在 build 期浮現的問題）

## 回報格式

用表格給結論，通過的項目只給一行數字，失敗的才展開細節：

| 項目 | 結果 |
|---|---|
| 測試 | ✅ 33 檔 / 417 測試 |
| 型別 | ✅ 零錯誤 |
| Build | ✅ 成功 |

**失敗時**：貼出實際錯誤輸出（不是轉述），並指出是哪個檔案哪一行。
若錯誤看起來是既有問題而非本次改動造成，**必須用 `git stash` 前後對比證明**，
不能用「應該是既有的」帶過（judgment.md JUDG-5）。

## 完成後

驗證通過**不等於**完成。若這次改動屬於安全修正，還要做反向驗證——
退回修正、確認回歸測試會紅（見 `.claude/skills/reverse-verify/SKILL.md`）。
測試會過和測試有效是兩件事。

$ARGUMENTS
