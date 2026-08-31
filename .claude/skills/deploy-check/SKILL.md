---
name: deploy-check
description: 對 taiwantea.store 正式站（或 Vercel preview）跑上線後驗證——端點狀態碼、robots.txt 的 AI 爬蟲宣告、llms.txt 的價格與設施文案、關鍵資產可取得性。當使用者說「上線了嗎」「部署完檢查一下」「合併後驗一下」「正式站還好嗎」，或剛合併 PR、剛 push 到 main、剛改動對外文案／SEO 檔案時使用。
---

# 上線後驗證

## 為什麼需要這件事

**`git push` 成功不等於已部署。** Vercel 曾漏接一次 webhook，安全修正在線上多躺了 15 分鐘
（lessons.md 2026-08-17）。而且線上的狀態只有線上能回答（JUDG-9）——
本機四件套全綠、Vercel 顯示成功，都不能證明客人現在看到的是對的東西。

另一半是文案：`llms.txt` 曾把導覽價格寫成 250（實際 450），四件套一個都沒抓到——
它只是純文字檔。那支專門餵給 AI 檢索器，錯的價格會被原樣引用出去。

## 怎麼跑

```bash
node .claude/skills/deploy-check/scripts/check-live.mjs
```

驗 Vercel preview：

```bash
node .claude/skills/deploy-check/scripts/check-live.mjs --base https://<preview>.vercel.app
```

**驗「這次改的東西真的上線了」**——這是 push 與「已部署」之間唯一可靠的橋：

```bash
node .claude/skills/deploy-check/scripts/check-live.mjs --expect "/tea-guide/egret::這次新增的標題文字"
```

`--expect <路徑>::<必須出現的字串>` 可以疊加多個。

## 檢查清單放哪

`.claude/skills/deploy-check/checks.json`。每條都帶 `why`，說明壞掉時客人會看到什麼。

**新增條目前先確認它現在是真的**——用 `--base` 對 preview 或正式站跑一次看它會過。
把沒驗證過的斷言寫進清單，等於製造一個會長期紅著、然後被忽略的檢查。

大型資產（影片、大圖）要加 `"method": "HEAD"`，否則 GET 會把整個檔案下載完才回來。

## 失敗時怎麼辦

| 失敗項 | 通常代表 |
|---|---|
| `robots.txt` 出現 `ai-train=no` 或 AI 爬蟲被 Disallow | Cloudflare 的「Managed robots.txt」自己重新開啟了。到 Dashboard → AI Crawl Control → Signals 關掉它。**這會自己復發，不是一次性修好。** |
| `llms.txt` 內容比對失敗 | 對外文案被改壞。派 `copy-guardian` 掃全站文案來源，不要只修這一個檔——同一個錯誤通常散在三處以上 |
| 端點 4xx／5xx | 先看 Vercel 的建置與函式日誌，再判斷是部署沒過還是程式錯誤 |
| 全部逾時 | 先確認自己的網路，不要急著宣告網站掛了 |

## 完成判準

**貼出腳本的實際輸出**，不要轉述。exit code 非 0 就是失敗，不存在「應該只是快取」——
腳本每次請求都已經加了破快取參數。
