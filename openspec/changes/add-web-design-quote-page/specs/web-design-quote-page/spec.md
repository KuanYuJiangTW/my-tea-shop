# web-design-quote-page — 風土數位報價頁（展示）

## ADDED Requirements

### Requirement: 報價頁路由與內容結構
系統 SHALL 於 `/web-design`（英文版 `/en/web-design`）提供報價頁，由上而下包含：品牌 Hero（「每個生意，都有自己的風土」敘事＋本站作為實例的成績重點）、三階報價卡、加購項目、維護月費方案、商業條款（付款節奏 40/30/30、含 2 次修改、報價效期 14 天、網域主機實報實銷）、常見問題、諮詢表單區塊、頁尾一行「實戰課程籌備中」。

#### Scenario: 訪客瀏覽報價頁
- **WHEN** 訪客開啟 `/web-design`
- **THEN** 頁面依上述順序渲染全部區塊，且沿用全站 Header/Footer（SiteChrome）

### Requirement: 三階報價卡
三階報價 SHALL 為：入門 NT$ 39,000 起、進階 NT$ 98,000 起（標示「最多人選」並以視覺強調為主推）、旗艦 NT$ 250,000 起（標明「本網站即為此等級實例」並註明架構可擴充 ERP）。每階 MUST 含「適合誰」、內容清單、交期。

#### Scenario: 主推方案視覺強調
- **WHEN** 訪客瀏覽三階報價卡
- **THEN** 進階（98,000）卡片帶「最多人選」標籤且視覺上與另兩張有區隔

### Requirement: 雙語與 SEO metadata
頁面 SHALL 全部文案雙語（zh／en，字串在 `messages/` 的 `webDesign` namespace，不硬編碼），並 SHALL 提供 metadata（title、description、`langAlternates("/web-design")` 產出的 canonical 與 hreflang）。

#### Scenario: 英文版瀏覽
- **WHEN** 訪客開啟 `/en/web-design`
- **THEN** 全部區塊以英文渲染，無殘留中文硬編碼字串

### Requirement: Footer 徽章入口
全站 Footer SHALL 顯示「本網站設計開發：風土數位」徽章（雙語），連往 `/web-design`（依 locale 經 `lp()` 組路徑）。

#### Scenario: 從茶站頁尾進入
- **WHEN** 訪客在任一非 admin 頁面捲到頁尾並點擊徽章
- **THEN** 導向對應語系的報價頁

### Requirement: LINE 導流按鈕
報價頁的 LINE 按鈕 SHALL 讀取 `NEXT_PUBLIC_LINE_ADD_URL`；未設定時 MUST 隱藏按鈕且不得出現壞連結。

#### Scenario: 環境變數未設定
- **WHEN** `NEXT_PUBLIC_LINE_ADD_URL` 為空
- **THEN** 頁面與表單成功畫面皆不渲染 LINE 按鈕，改顯示「一個工作天內回覆」文案
