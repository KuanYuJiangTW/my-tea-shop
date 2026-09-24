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

- 2026-08-31（種子）新增要進版控的 `.claude/` 子項後，用 `git check-ignore -v <路徑>` 實查——該目錄的 `.gitignore` 是 `.claude/*` 加白名單制，漏加白名單會靜默被忽略。
- 2026-09-24 驗「不含以下字串」條件用 `grep -n -E '字串1|字串2|...'` 對目標檔一次掃完，比逐字串搜快；但要當「逐字比對」處理，不管上下文語意——即使字串出現在無關語境（如「賞鳥五不」通用範本裡的「不損毀棲地」，跟黃頭鷺棲地宣稱無關），只要條件寫的是「不含字串」就照字面判 FAIL，不要自行判讀語意替它開脫。
- 2026-09-24 驗大量出處網址用 `curl -s -o /dev/null -L -A "Mozilla/5.0" -w "%{http_code}"` 批次跑，但 news.ltn.com.tw 這類站台常見第一次 timeout（`000`）、重跑 1-2 次就變 200（CloudFront 瞬斷），要重試排除誤判；若重試多次仍 `000` 且 `Could not resolve host`（DNS NXDOMAIN），才是真的失效，才列為 FAIL。
  - 更正（主對話，同日）：`Could not resolve host` 也可能是**驗收環境自己的 DNS** 出問題。當天 `rhps.cyc.edu.tw` 在 checker 解析失敗，主對話 `nslookup` 解析得到、`curl` 連 3 次皆 200。判 FAIL 前先 `nslookup <host>`；解析不到就回報「不確定：本環境 DNS 解析失敗」，不要直接判網址失效。
