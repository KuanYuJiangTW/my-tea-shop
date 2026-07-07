# WORKLOG — session 工作狀態（context 壓縮與斷線的保險）

> 用法：大任務開工先照模板開一節；每完成一項就更新；session 重啟或發現前文被壓縮成摘要時，先讀最後一節再動工。
> 清理規則：超過 10 節時，把「已完成」的舊節各壓縮成一行結論（規則見 playbooks/maintenance.md）。

## 模板（複製這段開新節）
```
### [YYYY-MM-DD] 任務名
- 目標：一句話
- 驗收條件：
  - [ ] 可驗證的條件（不是「做好」而是「npm run test 全綠」這種）
- 待辦：
  - [ ] …
- 決策紀錄：重要決定一行一個（為什麼選 A 不選 B）
- 狀態：進行中 ／ 已完成（證據：指令輸出或 file:line）
```

---

### [2026-07-07] 設計系統第零階段——產品探索與設計原則提案
- 目標：設計長進場探索（產品定位／介面主角／關鍵場景／門面元件／品牌約束／專屬設計原則），報告經使用者確認後才開始接設計任務
- 驗收條件：
  - [x] 產品面盤點（Explore/sonnet）：19 前台頁＋14 後台頁＋133 API 路由、資料模型、商業規則皆有 file:line
  - [x] 設計面盤點（Explore/sonnet）：色彩雙軌、字體、深色模式現況、13 個元件清點、品牌素材
  - [x] 截圖檢視 6 張（home/products/experience-detail/booking/checkout/admin-dashboard）
  - [x] 載重事實主對話抽驗：tailwind.config.ts 無 darkMode 欄位、components.json baseColor=neutral、public/ 與 src/app/ 無 favicon、--font-sans 被 layout.tsx:14(Geist) 與 globals.css:55(Noto Sans TC) 雙重定義
  - [ ] 使用者確認：設計原則 3 條、預設淺色模式、門面元件 5 件（等回覆）
- 關鍵發現（之後任何設計任務動工前必讀）：
  - 色彩雙軌不相通：shadcn 語意 token 全灰階（globals.css:54-89，oklch chroma=0，含 chart-1~5）；品牌色只在 tea-* 十色階字面色票（tailwind.config.ts:20-31）。按鈕/元件預設色不是品牌綠
  - 深色模式是未啟用 scaffold：.dark 變數表在 globals.css:102-134，但 darkMode 未設定（Tailwind 3 預設 media）、無 ThemeProvider/切換鈕、業務元件 0 處 dark:
  - 字體非單一來源：--font-sans 雙重定義（Geist vs Noto Sans TC）；--font-serif 只靠 CDN @import（globals.css:1），無 next/font
  - 品牌資產缺口：無 logo 圖檔、無 favicon；logo 是 Header.tsx:66-79 手刻 inline SVG；OG 圖（opengraph-image.tsx）與 email（src/lib/email.ts:107-109）各自硬編碼品牌色
  - 積分規則文件過時：tasks.md:26 與 openspec/specs/coupon-and-points/spec.md:21-40 是舊制（200 點起用/100 倍數/固定 10%），現行以 src/lib/points.ts 為準（MIN 10 點、上限依等級 10/15/20%）。已回報使用者，未動文件（code≠spec 屬回報事項）
  - 死碼：TeaBagCard.tsx、ui/border-beam.tsx 全站零引用
  - i18n 實際檔名是 messages/zh.json＋en.json（CLAUDE.md 寫 zh-TW 是指 locale，非檔名）
- 決策紀錄：
  - 探索派 2 個 Explore(sonnet) 並行（產品面／設計面），主對話自讀 README＋6 張截圖＋抽驗載重事實——報告類交付以「雙 agent 交叉＋主對話抽驗」代替 checker（事實抽驗已做，真正的驗收閘門是使用者確認）
- 狀態：進行中（報告已提交對話，等使用者拍板設計原則與門面元件）

### [2026-07-05] 建立制度檔案（Fable 5 建制 session）
- 目標：把判斷力固化成 repo 內制度檔，供未來較小模型的 session 沿用
- 驗收條件：
  - [x] A 環境診斷 → .claude/playbooks/diagnosis.md
  - [x] B CLAUDE.md 重寫為路由
  - [x] C 模型調度守則 → dispatch.md（含 agents/checker.md、agents/judge.md）
  - [x] D 判斷力外化 → judgment.md
  - [ ] E 派工模板 → templates.md
  - [ ] F 維護協議 → maintenance.md + lessons.md
  - [x] G 給未來 session 的信 → letter-to-future-sessions.md
  - [x] 收尾①：checker 對抗審查（FAIL 2 項：缺 citation URL、skill 引用無查證法）→ 已修正
  - [x] 收尾②：機械 read-back（13 檔皆在遠端、行數合規、本地遠端零差異）
  - [x] 收尾③：checker 複驗 2 項修正 PASS；其 meta 發現（letter 本文被改）以交接區更正註記處理
- 決策紀錄：
  - .gitignore 原本整包忽略 .claude/，已改為白名單制（agents/playbooks/backups/WORKLOG 可提交）
  - 路由表用純文字路徑，不用 @import（官方文件確認 @ 會 eager load，深度 4 層）
  - subagent frontmatter 欄位已向官方文件查證：model 可用 sonnet/opus/haiku/inherit 等，effort 可用 low/medium/high/xhigh/max，預設 inherit
  - 制度檔語言：繁中敘述＋英文技術名詞（維護者讀繁中；工具名保持原文避免歧義）
- 狀態：已完成（證據：checker 初審 FAIL 2 項→修正→複驗 PASS；13 檔皆在 origin 分支上；`npm run test` 26 檔/316 測試全綠實測）
