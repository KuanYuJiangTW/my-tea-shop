# 教訓紀錄（LESSONS）

> 踩坑當下就 append 一條，格式與合格判準見 maintenance.md MAINT-2。滿 30 條照 MAINT-4 精簡。
> **歸檔區在檔末**——重複主題已升格為 judgment.md 的正式規則，原條目壓成一行；
> 完整原文在 git 歷史與 `.claude/backups/lessons.md.20260806.bak`。

## 2026-08-01 SELECT 少一個欄位，`??` 的 fallback 就從保險變成預設路徑
- 情境：訂單取消退點寫成 `order.points_discount ?? Math.floor(order.points_used / 100)`，看起來是「有新欄位就用新的，沒有就用舊制換算」的合理防禦。但同一支路由的 `.select(...)` 沒把 `points_discount` 列進去，於是它**永遠**是 undefined，fallback 從「意外時的保險」變成「唯一會走的路」。客人用 500 點折抵，取消只退 5 點
- 代價：正式站上不知多久，每筆會員自助取消的訂單都吃掉客人 99% 的折抵點數；三條掛著正確名字的測試全綠（它們只對本地變數做算術，從未呼叫路由），完全沒擋住
- 規則：Supabase／任何顯式列欄位的查詢，**寫完 `??`、`?.`、`||` 的預設值之後，回頭確認那個欄位真的在 select 清單裡**。更根本的做法是別讓 fallback 靜默生效：(a) 測試的 DB mock 要「只回傳 select() 指名的欄位」，忘了 select 就會自然變紅；(b) 相容用的 fallback 要留下痕跡（log 或 metric），不要靜靜地換一條語意不同的路。同一路徑上「扣」與「還」必須引用**同一個欄位**——這裡扣的是 `points_used`，還的卻是 `points_discount`，1:1 時碰巧相等就沒人發現
- 去處：暫存於此（與 2026-07-30「測試全綠不等於符合規格」互補：那條講測試釘錯了規格，這條講測試根本沒接上程式碼）

## 2026-08-06 把 class 字串抽到共用模組，Tailwind 卻掃不到——content glob 逐目錄列舉的坑
- 情境：狀態徽章的 class 從三個頁面抽到 `src/lib/admin-status.ts` 做單一事實來源。`tailwind.config.ts` 的 content 原本逐目錄列舉 `src/pages`、`src/components`、`src/app`——**不含 `src/lib`**。於是只被該檔引用的 `status-warn` / `status-warn-soft` 完全沒有生成
- 代價：差一步就讓「待付款徽章沒有底色」上線。而且極難察覺——其他 status 色因為前台 `AccountClient.tsx` 也用到而正常生成，只有 admin 獨有的那一組是空的，肉眼掃過 config 與程式碼都看不出問題。抓到它的是「從建置產物 CSS 讀出每個 token 的實際 rgb 再比對」這道驗證
- 規則：**content glob 一律寫 `./src/**/*.{js,ts,jsx,tsx,mdx}`，不要逐目錄列舉**——逐目錄等於埋一條「共用模組不可以含 class 字串」的隱含規則，沒有人會知道。另：**把 class 字串搬到新位置後，必須從建置產物確認該 class 真的生成**，不能只看程式碼改對了
- 去處：暫存於此（本條的「期望值要落在產物上，不是原始碼上」已是 JUDG-8 的第三個判準；留在這裡的是 content glob 這個具體坑）

## 2026-08-08 用「兩兩比對」的數字，否定了一個關於「序列」的設計
- 情境：首頁淺底是 `cream → cream-light → white` 三段依序變亮。我量出三者兩兩只差 2%，判定「視覺上是同一片，等於做了三段變化卻一段都看不出來」，於是收成兩層，全站 101 處 `bg-tea-cream-light` → `bg-tea-cream`
- 代價：業主看 preview 第一眼就發現首頁「本季精選」與「茶山體驗」變同色、關於我們有三段連成一片，全數回退（前台 55 + admin 44 + 五個頁面的段落序列）。他對原版的形容是「好看的漸層」——**那個漸層就是我判定為「看不出來」的東西**。兩兩差 2% 沒錯，但三段累積 4.3% 而且有方向；方向感不會出現在「兩個色的對比值」裡
- 規則：**改動一組「有順序」的視覺元素前，先確認你的量測方式跟它的作用方式是同一件事**。相鄰色差、對比值這類兩兩比較的指標，量不出漸進、節奏、累積這類序列屬性。判斷「這個差異看不看得出來」時，要問的是「在它實際被觀看的情境下」——連續捲動經過三段，和把兩個色塊並排比對，是完全不同的觀看方式
- 去處：暫存於此（與 JUDG-8 同源但方向相反：JUDG-8 講「證據要有鑑別力」，這條講**鑑別力太強也是問題**——用高解析度的尺去量低解析度的效果，會把刻意的細微差異誤判成雜訊。已寫進 `docs/design-system.md` 2.1.1 的警告框）

## 2026-08-08 為了補 AA 把警示色的彩度砍掉三分之二，等於把警示變成裝飾
- 情境：全站警示色從 Tailwind 的鮮豔色換成低彩度 `status-*`，對比數字全面上升（低庫存 2.15→7.09、表單錯誤 3.67→7.60、優惠券不符 2.69→7.60）。我每一次都拿對比值當「改進」的證據
- 代價：業主看 preview 的評語是「對比度設定較高但是都變醜且也沒有比較好使用，顏色變深反而無法起到提醒作用，下意識會忽略」，六個檔案全數回退。**亮橘 `#F59E0B` 對比只有 2.15 卻會跳出來；深棕 `#92400E` 對比 7.09，看起來卻像普通深色文字**。同一天還發現第七波的近似色收斂（`#F9F6F1`→`#FAF7F2` 那類）也是同一個病——那些微小差異是刻意的漸層，被我當成漂移收掉
- 規則：**WCAG 對比度量的是「可讀性」，不是「顯著性」。改警示色之前先問它的功能是「被讀」還是「被看見」。** 要被看見的（低庫存、表單錯誤、超重提示、狀態徽章）靠彩度與色相差異工作，不要拿 4.5 這個數字去修；要被讀的（內文、標籤、金額明細）才適用 AA。判斷方式：把新舊兩色並排看**不夠**，要放進實際版面看眼睛會不會停在它上面
- 去處：已寫進 `docs/design-system.md` 2.3 的警告框。與同日的「淺底三層」那條同源——都是**用一個維度的數字去否決另一個維度的效果**：那次是拿「兩兩對比」否決「累積漸進」，這次是拿「對比度」否決「顯著性」

## 2026-08-08 只在桌機視窗調節奏與字級，手機付的代價我沒去看
- 情境：第九波為首頁做「慢段／快段」的間距節奏（慢段 96/128px），又把商品描述從 14px 升到 16px（理由是「敘事型內容」）。兩件事我都在桌機視窗驗證過就收工
- 代價：業主用手機看時兩個問題同時炸出來——(a) 慢段手機也吃到 96px，而手機一屏只裝得下一張卡，多 32px 就是「還要再滑一次」；(b) 描述升到 16px 後 `line-clamp-2` 的容量從 43 字掉到 37 字，而實際描述 46–50 字，**截字從 5 個變成 11 個**。第二點更難看見：`line-clamp` 不會報錯，字就是安靜地消失
- 規則：**改間距或字級後，一律用 375px 視窗再看一次**。兩個具體判準：(1) 節奏類的留白只加在 `md:` 以上，手機維持基準值——節奏感在大螢幕才看得出來，小螢幕的垂直空間價值完全不同；(2) 動到 `line-clamp` 容器裡的字級時，用 `scrollHeight > clientHeight` 實測有沒有截字，**字級與行數要一起算**：內容型態決定你想要的字級，容器決定它能給的空間
- 去處：已寫進 `globals.css` 的 `--space-section-xl` 註解（標明只用在 md: 以上）與 `ProductCard.tsx` 的描述註解。與同期兩條同源——都是**拿單一情境的判斷去蓋全部情境**（那兩次是拿兩兩對比蓋累積漸進、拿對比度蓋顯著性，這次是拿桌機蓋手機）

## 2026-08-08 `line-clamp` 只設上限沒設下限，手機單欄時卡片就高矮不齊
- 情境：商品卡描述用 `line-clamp-3`。業主在手機上看到「金萱的上下間距比其他卡片高」。我先在 375px 量，三張卡完全等高（654px），差點回報「找不到問題」
- 代價：**問題只在特定寬度出現**。描述容器寬 ≈ 視窗寬 − 72，14px 中文約每行 寬/14 字，所以 2 行容量隨螢幕寬度變動：375px 是 43 字（三張都 3 行、等高）、414px 是 49 字（48 和 46 字的塞進 2 行、50 字的金萱要 3 行）→ 金萱高 22px。桌機用 grid 有等高機制看不出來，**手機單欄堆疊每張卡各自撐高**，才會露出來
- 規則：**`line-clamp-N` 要配 `min-h-[Nlh]`**——clamp 只設了上限，沒設下限。卡片並排（不論 grid 或單欄堆疊）而內容長度不一時，只有同時鎖上下限才會等高。`lh` 單位＝當前行高，會跟著字級走，不必寫死 px。另一個判準：**「在某個寬度沒問題」不等於「沒問題」**，斷行類的 bug 要掃過 375／390／414／430 四個常見手機寬度
- 去處：已寫進 `ProductCard.tsx` 的描述註解（含 414px 的實測數字）。與同期三條同源——都是拿單一情境的判斷去蓋全部情境，這次是拿單一螢幕寬度蓋所有寬度

## 2026-08-11 字型還沒載完就量版面，量到的是 fallback 字型的尺寸
- 情境：修 Header 在 768px 的水平溢出。`navigate` 之後直接跑 `getBoundingClientRect`，量到 logo 65px、EN 導覽連結合計 336px，據此算出「缺 58px」並照這個預算設計修法。實際上 `next/font` 的三支字型還在載，量到的是 fallback 字型的排版——字型 ready 後 logo 是 106px，真正的缺口是 132px
- 代價：整套尺寸預算算錯。第一版修法（nav gap 收到 20px ＋ 精簡右側）量出 `scrollWidth == clientWidth`，看起來修好了，實際上是**三個英文連結折成兩行硬塞進去**的假通過；而且那個折行在改前就存在，我第一輪完全沒看見。差點照這個假證據回報完成
- 規則：**量版面尺寸的腳本，第一行一律 `await document.fonts.ready`**。並且**每次量寬度都要一起量高度**（`getBoundingClientRect().height`），用高度判斷有沒有折行——單看寬度或 `scrollWidth` 分不出「放得下」與「折行之後才放得下」。要確認量測時機沒問題，就同一段量兩次（載入當下、字型 ready 後）比對，不一致以後者為準
- 去處：暫存於此（JUDG-8「證據要有鑑別力」的延伸：`scrollWidth == clientWidth` 這個證據分不出「真的放得下」與「內容自己折行了」，屬於典型的無鑑別力證據）

## 2026-08-11 flex 版面吃緊時，「誰讓步」不指定就由瀏覽器替你決定——它挑了品牌 logo
- 情境：1024px ＋ 英文 ＋ 登入長名字時，header 整列差約 10px。flex 預設每個項目 `flex-shrink: 1`，瀏覽器把缺口分攤下去，結果被壓的是 logo——「霧抉茶」擠成兩行、SVG 從 34 縮到 30。而同一列裡明明有一個**本來就設計成會讓步**的元素（使用者名稱有 `max-w-[80px] truncate`，壓縮它只會多出省略號）
- 代價：這個症狀在站上活了不知多久。它不會報錯、不會溢出、`scrollWidth == clientWidth` 完全正常，只有量高度才看得出來（`brandH` 28 → 56）
- 規則：**一列 flex 裡若有「絕不能變形」的元素（logo、圖示、徽章），就明確標 `flex-shrink-0`，讓缺口落到有 `truncate`／`line-clamp` 的那個元素上**。判準：問「這列不夠寬時，我希望誰先讓步？」——答得出來就把答案寫進 class，答不出來表示版面配置還沒想清楚。特別注意 SVG 圖示：它們是 flex item，不標 `flex-shrink-0` 會被壓成變形的橢圓，而且沒有任何錯誤訊息
- 去處：暫存於此（與同日「字型還沒載完就量版面」同源：兩者的共同點是**沒有溢出不代表版面是對的**，折行與變形都是無聲的）

## 2026-08-11 購物車的商品名是「合成」的，切成 `nameEn` 會讓兩個規格變同名
- 情境：把 `/checkout` order summary 的商品名改成依語系取 `nameEn`。看起來是一行的恆等改動——`ProductCard.tsx:221` 早就這樣寫了，照抄即可
- 代價：差點讓英文版的「茶包組」與「150g 散茶」顯示成同一個名字、客人分不出訂到哪一項。原因是加入購物車時 `name` 被**合成**為 `${p.name} ${labels.teaBagSet}`（`ProductCard.tsx:71`、`TeaBagCard.tsx:24`），但 `nameEn` 沒跟著合成，仍是基礎茶名。切過去等於把後綴弄丟。是讀 `buildVariants` 才發現，grep `nameEn` 看不出來
- 規則：**把某欄位改成「依語系取 `xxxEn`」之前，先查該欄位在寫入端是不是被加工過**（grep 該欄位名在 `addToCart`／snapshot 組裝處的賦值，看右手邊是不是模板字串）。加工過就代表 `xxxEn` 與它不對等，要嘛在顯示層補回加工，要嘛在寫入端一起合成
- 去處：暫存於此。與「SELECT 少一個欄位」同屬「兩個欄位看起來平行、實際不對等」，但那組是查詢面、這組是寫入面

## 2026-08-15 開了 RLS 卻只給 SELECT 政策，等於建了一張業主自己動不了的表
- 情境：品飲組的 `product_bundles` 建表時開 RLS，只寫了「公開讀取 `is_active = true`」的 SELECT 政策——刻意的，寫入只該由伺服器端的 service role 進行。上線後請業主把商品打開，他回報「品飲組卡片我開不了」
- 代價：他在 Supabase 的 Table Editor 點 `is_active` 那個勾，被 RLS 擋掉且沒有明確錯誤；來回一次才查出原因。等於我交付了一張**只能用 SQL 維護的表卻沒附任何介面**，而上下架是他每週都會做的事
- 規則：**新建一張開了 RLS 的表時，先問「業主要用什麼點它」**。若該表有任何需要人工切換的欄位（上下架、顯示與否、審核狀態），三選一：(a) 同時做後台入口，(b) 加對應的寫入政策，(c) 在 SQL 檔頂端明寫「本表只能由 SQL 或 API 維護」並在 WORKLOG 記一筆待辦。**不要讓「安全的預設」變成「沒人維護得動」**
- 去處：暫存於此。與 2026-08-01「SELECT 少一個欄位」同屬「權限／欄位的預設值悄悄改變了行為」，但那組是讀取面、這組是寫入面

## 2026-08-17 `/en` 是 middleware rewrite 不是路由段——三處 `pathname` 判斷同時被繞過
- 情境：業主轉來 Google Search Console 的「網頁未編入索引」通知，查 SEO 時發現根因是 `/en/*` 由 `src/proxy.ts` 內部 rewrite 到無前綴路徑，**沒有 `[locale]` 路由段**。凡是拿 `pathname` 做判斷的邏輯都得自己處理 `/en`，而三處都忘了：(a) 後台守衛 `pathname.startsWith("/admin/")` 對 `/en/admin/...` 不成立 → 未登入可讀後台營收；(b) `langAlternates` 的 `canonical: path` 讓每個英文頁宣告中文頁為正式版本 → 英文頁全被排除索引；(c) `robots.txt` 的 Disallow 清單沒有 `/en` 版本 → `/en/cart` 反而可抓取
- 代價：(a) 是線上安全漏洞，存在期間不明；(b) 讓 16 個英文網址的 SEO 長期歸零，且要等 Google 重新抓取才會恢復。三個都是同一個心智模型缺口造成的，卻分別在三次不同的開發中埋下
- 規則：**改動或新增任何讀 `request.nextUrl.pathname`／依路徑做分支的邏輯前，先確認它有沒有處理 `/en` 前綴**。判斷路由身分一律用 rewrite 後的路徑（`proxy.ts` 的 `routePath`）；面向外部的 URL（canonical、og:url、轉址目的地）一律用帶當前語言前綴的路徑。新增這類邏輯時，測試一律 zh／en 成對寫（見 `src/__tests__/admin/proxy-locale-guard.test.ts` 與 `src/__tests__/seo/canonical.test.ts` 的寫法）
- 去處：暫存於此。與 2026-08-08「兩兩比對否定序列設計」不同類；這條屬「同一個隱含前提在多處各壞一次」，若再出現第二個 locale 就升格為 playbook 規則

## 2026-08-17 `git push` 成功不等於已部署——Vercel 漏接一次 webhook，安全修正在線上多躺了 15 分鐘
- 情境：把後台守衛繞過的修正合併上 main、push 成功，正要回報「已上線」。因為修的是線上安全漏洞，順手實測 production——`/en/admin/dashboard` 仍回 200。等了 15 分鐘還是舊版。查 header 確認不是快取（`x-vercel-cache: MISS`、`age: 0`、`cf-cache-status: DYNAMIC`），業主給的 Vercel 截圖顯示 Production 標記還掛在前一個 commit，部署清單裡**根本沒有**那筆合併。推一個空 commit 重新觸發才上線；下一個 commit 又恢復正常，所以是單次 webhook 漏接
- 代價：15 分鐘。但差一點就把「已修好」寫進回報——若當時收工，業主會以為漏洞已關，而 `/en/admin/dashboard` 的營收資料還是全網可讀
- 規則：**修正若要靠部署才生效（尤其安全修正），push 完必須實測 production 才能宣告完成**。做法：挑一個「改動前後回應明確不同」的端點輪詢（本例是守衛的 307 vs 200，比 HTML 內容可靠），並確認回應不是快取（看 `x-vercel-cache`、`age`、`cf-cache-status`）。逾時未生效時，先看部署清單有沒有那筆 commit——**沒有那筆**代表沒被觸發（推空 commit 重試），**有那筆但失敗**才是建置問題，兩者處置完全不同
- 去處：暫存於此（JUDG-2「完成要有證據」在部署面的具體化：`git push` 的輸出不是上線的證據）

## 2026-08-17 Next 的 metadata 是淺層合併——子頁宣告 openGraph，父層那組就整個消失
- 情境：把英文頁 metadata 雙語化時，順手給首頁與 FAQ 補上 `openGraph: { url: canonical }`。用 production build 驗輸出才發現：**全站的 `og:type`／`og:locale`／`og:site_name` 都不存在**。Next 的 metadata 各個 key 是整體取代而非深層合併，所以有設 `openGraph` 的 9 個頁面從一開始就沒有這三個欄位；沒設的首頁與 FAQ 本來靠繼承留著，被我這一補反而弄掉了。同一個機制還害到 `og:image:alt`——頁面沒明確帶 `images` 時會退回 file convention，而 `app/opengraph-image.tsx` 的 `export const alt` 是模組層常數、寫死中文，英文頁的 alt 就是中文
- 代價：只花一次驗證就抓到，但差別在於「有沒有去看實際輸出」。若只看 tsc／測試／build 全綠就收工，會把兩頁的 og 弄壞還以為是改善
- 規則：**Next metadata 的巢狀欄位（`openGraph`、`twitter`、`robots`、`icons`）一旦要在子頁宣告，就必須把該物件需要的欄位全部寫齊，不能指望繼承父層的其他鍵**。做法是抽一個 `openGraphFor()` 之類的工廠函式集中組裝，所有頁面一律呼叫它，不要各自手寫物件字面值。驗證時**不要只比對你改動的那個欄位**——把 `og:*` 全部 dump 出來數，消失的欄位不會有人報錯
- 去處：暫存於此（與 2026-08-01「SELECT 少一個欄位」同源：都是「你沒寫的那部分被靜默換成別的行為」）

## 2026-08-21 後台「重排」以顯示順序為基準重新編號，把自動規則固化成手動設定
- 情境：體驗排序的前台規則是「釘選 → 季節 → sort_order → id」，後台清單也照這個規則顯示（想讓業主看到實際結果）。重排功能是「把當下看到的順序整份重新編號成 (順位+1)×10」。業主為了測試按了一下移動——那一刻萬鷺朝鳳因為季節排第一，於是 **季節造成的第一名被寫成 sort_order=10**，自動排序悄悄變成手動，季節結束也不會退回
- 代價：只有測試按鈕就中招，而且**沒有任何錯誤訊息**——畫面看起來完全正常，是後來查排序輸入才發現 sort_order 不再是預設值。若沒發現，10/11 賞鳥季結束後首張會一直掛著一個訂不到的活動
- 規則：**當排序（或任何設定）由「自動規則 ＋ 手動基準」疊出來時，編輯介面必須編輯手動基準本身，不能編輯疊加後的結果**。做法：後台分兩區顯示——「實際結果」唯讀，「手動順序」才是可編輯的那份；重新編號一律以手動基準排序後的清單為輸入。同理適用於任何「預設值 ＋ 覆寫」的設定畫面
- 去處：暫存於此（與 JUDG-6「收緊權限前先查誰在用」同類：改動之前要先分清楚你動到的是哪一層）

## 2026-08-23 route 加一個 filter 方法，手刻的 Supabase chain mock 一次紅 7 條、訊息卻不指向原因
- 情境：cron route 新增一段查詢用了 `.in("status", [...])`。該檔的測試自己手刻 chain mock，只定義了 `select/eq/lt/order/update/delete`——沒有 `in`。同一個資料夾裡另一支測試的 mock 有 `in`，所以是「有些檔會過、有些不會」
- 代價：9 條變成 7 failed | 2 passed，而且**每一條的錯誤都長得像業務邏輯壞掉**（回傳 undefined、欄位對不上），沒有一條說「mock 少一個方法」。tsc 全綠，因為 mock 是 `Record<string, unknown>`，型別根本不管
- 規則：**手刻 chain mock 時，未定義的方法要明確炸開並指名自己**——加一層 Proxy 兜底，認得的回 `this`，不認得的 `throw new Error("mock chain 缺 ." + prop + "()")`。同一批測試共用同一個 mock 工廠，不要每個檔各刻一份（本 repo 的 `request-cron` 與 `request-demand` 就是各刻一份才出現落差）。改 route 的查詢鏈之後，跑的是**全部**測試而不是新加的那幾條
- 去處：暫存於此（與 JUDG-8 同源：綠燈與紅燈都要問「它到底在測什麼」）

## 2026-08-23 兩支 SQL 有執行順序相依時，用 information_schema 檢查解掉，而不是寫在註解裡
- 情境：新增體驗類型的 `add_egret_half_day.sql` 要設 `accepts_requests`／`request_start_times`，但那些欄位是另一支 `add_experience_requests.sql` 才建的。業主是在 Supabase SQL Editor 手動貼上執行的，沒有 migration 工具管順序
- 代價：這次沒出事，但「檔頭註解寫『請先跑另一支』」在人工流程裡等於沒有保護——貼錯順序就是 `42703 column does not exist`，而且是整段 rollback，前面成功的 INSERT 也一起沒了
- 規則：**手動執行的 SQL 之間有欄位相依時，把相依那段包進 `DO $ IF EXISTS (SELECT 1 FROM information_schema.columns …) THEN … END $`**，讓兩支檔任何順序都能跑。這跟前台程式碼用 `42703`／`42P01` 兩段式 fallback 是同一件事的兩端：**這個 repo 的 code 與 schema 一定會有一段時間不同步，兩邊都要能單獨活著**
- 去處：暫存於此
## 2026-08-31 「這只是 WORKLOG」——我替文件變更自我豁免，直接在 main 上 commit＋push
- 情境：PR #17 合併後要把上線驗證寫進 WORKLOG，心裡認定「只改文件、沒有程式碼」就不必開分支，於是 `git checkout main` 之後直接 commit 並 push
- 代價：違反 CLAUDE.md「使用者沒開口就不開 PR、不動 main 分支」，被使用者抓到並要求處理；多花一個 revert PR 把內容照規矩帶回來
- 規則：**切到 main 之後只能讀不能寫**。commit 任何東西之前先確認 `git status -sb` 第一行不是 `## main...`，是就先 `git checkout -b`。**「只改文件」「只改 WORKLOG」「只改 lessons」都不是例外**——會自我豁免的正好都是這類看起來無害的變更
- 去處：暫存於此。與檔末「hook 擋掉複合命令、commit 落到 main」那條互補——那條是**意外**掉到 main，這條是**刻意**切過去，兩種都要靠 commit 前看 `git status -sb` 擋下（JUDG-2）

## 2026-08-31 用 Bash heredoc 寫長檔案，內容裡的單引號讓外層引號配對失敗
- 情境：依 MAINT-4 精簡 WORKLOG 時要先產生一份 200 行的中文片段檔，用 `cat > file <<'EOF'` 寫入。命令直接失敗在 `unexpected EOF while looking for matching '`，檔案沒建立
- 代價：一次無效呼叫。事後定位到報錯行號正好落在含 `shipping_address->>'country'` 的那行；但把同一段單引號內容包成短命令重測**兩次都成功**，成因未確定（疑似長命令在封裝層被重新引號化）
- 規則：**要寫進檔案的多行內容一律用 Write 工具，不要用 Bash heredoc**。heredoc 只留給 commit 訊息這類一次性短文字；內容含 ASCII 單引號又非用不可時，改成先寫檔再 `-F <檔案>`。**同一天第三次發作**：`for k in ...; do grep -c "$k"` 的關鍵詞裡有反引號，bash 當成命令替換直接 `unexpected EOF`——**要 grep 的字串含反引號時，改抽一段不含反引號的子字串來比對**
- 去處：暫存於此。**同一個 turn 裡我還先用了 `python` 才發現它不可用**——而歸檔區早有「本機 `python` 是 Windows Store 空殼，改檔一律用 Node」那條。**歸檔區的條目仍然有效，動手前要讀的是整份 lessons.md 不是只讀未歸檔那半**（MAINT-5 說的退化訊號，這次就是我）

## 2026-08-31 `sed -i` 把 CRLF 檔案靜默改成 LF——而我驗行尾是在它執行「之前」
- 情境：精簡 WORKLOG 後用 `file` 確認行尾仍是 CRLF，之後才用 `sed -i` 修一行失效引用。`sed -i` 重寫整檔時把 910 行的 CRLF 全部換成 LF，沒有任何提示
- 代價：我在給使用者的回報裡寫了「CRLF 維持」——那是 `sed -i` 之前的觀測，說出口時已經不成立。直到下一個 Node 腳本 `split("\r\n")` 切不出行、丟 TypeError 才發現。repo 內容沒受影響（git 索引本來就存 LF），但對外報過一次錯的事實
- 規則：**Windows 專案上不要用 `sed -i` 改 CRLF 檔案**，即使只換一行也用 Node 讀寫並明確 `join("\r\n")`。非用不可時，`sed -i` 之後必須重跑 `file <檔案>` 再宣告行尾
- 去處：暫存於此。更一般的形式是**證據有時效**（JUDG-2）——「我驗過了」要連同「在哪個動作之前驗的」一起記；中間只要再動過檔案，那份證據就作廢

## 2026-08-31 護欄去查動態狀態，查不到卻「放行」——等於沒有護欄

- 情境：寫 main 分支護欄 hook，規則要先查目前分支。payload 的 `cwd` 是 Git Bash 形式（`/c/Users/...`），node 拿它當 cwd 會直接拋錯。
- 代價：`currentBranch` 回 null → 分支判定整條跳過，護欄靜默失效。端對端測試印出「目前在 未知分支」才發現；只跑單元測試（分支用參數餵）看不出來。
- 規則：護欄類程式碼查不到狀態時，先窮舉備援來源（`payload.cwd` → `CLAUDE_PROJECT_DIR` → `process.cwd()`）；真的全查不到就在訊息裡明說「狀態未知」，不要當成安全而放行。且必做一次端對端實跑，不能只靠把狀態當參數餵的單元測試。
- 去處：暫存於此。

## 2026-08-31 我用「檔案數」評估一個受工具管理的資產，48 份規格有 45 份根本不合格

- 情境：盤點 OpenSpec 成熟度，我數了 48 份 spec、39 個歸檔（後者還數錯，實際 35），給了 90 分。
- 代價：分數錯得離譜。實跑 `openspec validate --specs` 是 **3 通過、45 失敗**——缺必要區段、還帶著只該出現在 delta 的 `## ADDED Requirements` 標題。而且這正是「提案一直堆在 `changes/` 」的機械性原因：`openspec archive` 同步不了主 spec 就直接中止。我把「工具壞了」誤判成「使用者沒整理」。
- 規則：評估任何**有自己驗證器的資產**（openspec、schema、lint 設定、i18n 訊息檔）時，**先跑那個工具自己的驗證指令**，把輸出當分數依據。檔案數、目錄數、commit 數都只是活動量的代理指標，不能拿來當品質結論。
- 去處：暫存於此。與 JUDG-8「證據要有鑑別力」同源——數量從來不是鑑別力。

## 2026-08-31 照工具自己產的說明做，卻繞過了那個工具自己的驗證

- 情境：openspec 的 `opsx:*` command 與 `openspec-*` skill 都把歸檔寫成「手動 `mv` 目錄到 `changes/archive/`」，中間那步「同步 delta 到主 spec」還叫人去用 `openspec-sync-specs`——**那個 skill 根本沒安裝**，所以實際流程就是直接 `mv`。
- 代價：每次歸檔都把 delta 專用的 `## ADDED Requirements` 標題原樣搬進主 spec，累積 **37 份汙染**。之後 `openspec archive` CLI 再也同步不了主 spec（它會中止），提案從此歸檔不掉，堆到 10 個。我一開始還把這誤判成「使用者沒整理」。
- 規則：工具附的 skill／command 若描述了「手動做掉某件事」的步驟，**先查那個工具的 CLI 有沒有對應指令**（`npx <tool> --help`）。有就用 CLI——CLI 通常帶驗證會擋下錯誤，手動步驟不會。另外：這類 vendor 檔（frontmatter 有 `generatedBy`）改了會被 `<tool> update` 蓋掉，**要覆蓋它的規則必須寫在那個工具管不到的地方**（本專案寫在 CLAUDE.md）。
- 去處：已入 CLAUDE.md「技術事實」的 openspec 歸檔那條。

## 2026-08-31 隔離了狀態的第一個來源，卻漏掉備援鏈的另外兩個——PR 綠、合併後 main 紅

- 情境：guard 的 `currentBranch()` 為了不 fail-open，改成依序試 `payload.cwd` → `CLAUDE_PROJECT_DIR` → `process.cwd()`。測試只把 `payload.cwd` 指到非 repo 目錄。
- 代價：CI 上退到 `process.cwd()`＝checkout 在 main 的 repo，分支規則誤觸發，6 個「預期放行」的案例全紅。**而 PR 的 CI 跑在 merge ref 上（分支名不是 main）所以是綠的——這個缺陷只在合併進 main 之後才看得見**，等於帶著綠燈把 main 弄紅。
- 規則：測試若依賴「當下環境的某個狀態」，要把該狀態的**所有取得路徑**都隔離掉，不是只蓋第一個（子行程要同時設 `cwd`、`env`、以及傳進去的 payload）。另外：**CI 在 PR 與在 main 上跑的環境不同**（分支名、觸發事件都不同），對分支／環境敏感的驗證要在兩種情境各跑一次；本機重現法是 `git checkout main` 後把待驗檔案 `git checkout <branch> -- <file>` 拉過來跑。
- 去處：暫存於此。與檔末「護欄查不到狀態卻放行」那條互為一對——那條講不能 fail-open，這條講防 fail-open 的手段會反過來污染測試。

## 已歸檔（2026-08-06 精簡 18 條；2026-08-15 再精簡 2 條；2026-08-25 再精簡 17 條；2026-08-27 再精簡 15 條）

> 過時、已升格為正式規則、或屬於一次性環境事實的條目壓成一行。原文見 git 歷史。

- **這個專案不能跑 npm audit fix（會降級 Next.js）** — 已由 `.claude/hooks/guard-commands.js` 自動攔截，CLAUDE.md 也已註明「不必記」。仍有效的原則：相依套件漏洞一律先 `--dry-run`，**永不用 `--force`**
- **攔截型 hook 會誤擋「提到該指令」的正常操作** — 規則已落進 `.claude/hooks/guard-commands.js` 與其測試檔（比對前先剝掉 heredoc、單引號、雙引號，順序不可換）。寫新的攔截型 hook 時去讀那支測試

- **.gitignore 整包忽略 .claude/，制度檔差點推不上去** — 新增要提交的 `.claude/` 子項前先跑 `git check-ignore -v`；`.gitignore` 已改白名單制
- **CLAUDE.md 的 @路徑 會在開場整檔載入** — `CLAUDE.md` 的路由表用純文字路徑，不用 `@`——`@` 會 eager load（深度 4 層）
- **npm ci 在本 repo 目前會失敗（lockfile 不同步）** — npm ci 曾因 lockfile 不同步失敗，**已於 2026-07-05 修復**，本條與其補記均已結案
- **session 中途建立的自訂 agent 不會立刻註冊** — session 中途新建的 `.claude/agents/*.md` 不會即時註冊，需重開 session
- **harness 內建 skill 不在檔案系統，subagent 查不到** — harness 內建 skill 不在檔案系統上，subagent `ls .claude/skills` 查不到，別叫它去找
- **web 環境沒有 gh CLI** — web session 一律用 `mcp__github__*`（已入 diagnosis.md 環境事實表與 CLAUDE.md 開場檢查）
- **收緊權限前，先查「誰在用低權限身分呼叫它」** — **已升格為 JUDG-6**（收緊權限或設定之前，先查誰在用）
- **Bash tool 裡用 PowerShell here-string，commit 標題會多一個 @** — Bash tool 內不可用 PowerShell here-string `@'...'@`，會讓 commit 標題變成 `@`（已由 guard-commands hook 攔截）
- **npm run lint 在本 repo 完全跑不起來（CLAUDE.md 事實過時）** — `npm run lint` 曾因 `next lint` 被 Next 16 移除而全壞，**已於 2026-07-30 補 `eslint.config.mjs` 修復**；仍有效的事實只剩「`next lint` 已被移除」
- **Playwright 有 e2e/ 卻不是專案依賴** — `e2e/` 有 spec 但 playwright 不在 `package.json`；要驗互動請裝在 scratchpad 獨立 package，用 `executablePath: /opt/pw-browsers/chromium`，**不要**往 repo 加依賴
- **用 networkidle 當驗證的等待條件會給出假陰性** — 驗前端狀態一律等該狀態自己的 DOM 證據（`waitForSelector` 等 aria／文字），不要用 networkidle 或裸 `waitForTimeout`
- **pkill -f "<pattern>" 會連自己的父 shell 一起殺** — `pkill -f "<pattern>"` 會連自己的父 shell 一起殺（命令列含該字串）；收埠口改用 `fuser -k <port>/tcp`
- **Bash tool 會把 `git show "rev:path"` 的冒號吃掉** — Bash tool 會吃掉 `git show "rev:path"` 的冒號；改用 `git show rev -- path` 或先 `git cat-file`
- **套件回傳型別改了，`if (!result)` 就成了永遠通過的假驗證** — **已升格為 JUDG-8**。`otplib` v13 的 `verify()` 回傳物件不是 boolean，`if (!result)` 成為永遠通過的假驗證，後台 2FA 形同虛設
- **用 `npx tailwindcss` CLI 驗產物，三次 probe 全是無效測試** — **已升格為 JUDG-8**（對照組要有鑑別力）。該 CLI 讀不到本專案的 TS config，三次 probe 全是無效測試
- **本機的 `python` 是 Windows Store 空殼，改檔靜默失敗還不報錯** — **已升格為 JUDG-8**（沒報錯 ≠ 有做到）。本機 `python` 是安裝引導殼，exit 49、零輸出，三次改檔靜默失敗。改檔一律用 Node
- **批次替換用正則，跳脫掉了變成字元類別，26 檔全毀** — **已升格為 JUDG-8**（先數再改）。正則跳脫掉了變成字元類別 `[#3D4A42]`，26 檔全毀；批次替換一律用 `split/join` 字面替換
- **perl -pi 批次改檔後，dev server 500 且重啟無效——是 .next 的 Tailwind 快取** — 批次改檔後 dev server 報 ENOENT 但檔案存在 → 先 `rm -rf .next` 再重啟（`perl -i` 的 unlink 空窗毒化了 Tailwind 快取），不要懷疑檔案毀損


### 2026-08-25 精簡（升格為 JUDG-9／10／11，或移入 diagnosis.md 環境事實表）

- **拿 `supabase/*.sql` 當線上現況，對業主斷言「這款體驗不存在」** — **已升格為 JUDG-9**。它不但存在，還排了 20 場
- **同一天犯兩次「拿 SQL 當線上現況」（紅茶 1,000／6、半日 650）** — **已升格為 JUDG-9**。第二次補到的做法：PostgREST 被權限擋掉時，curl 正式站頁面同樣算線上證據
- **從 git 歷史推論線上帳本的內容，被 migration 打臉** — **已升格為 JUDG-9**。`UPDATE point_transactions SET points = ROUND(points/100)` 改寫過整個帳本，而同一份 migration 的 backfill 沒動 `experience_bookings`
- **把一個 404 加進 sitemap，因為「子路由存在」被當成「父路由存在」** — **已升格為 JUDG-9**。tsc／lint／build／986 測試沒有一種會問「這個路徑有頁面嗎」；防復發測試在 `src/__tests__/seo/sitemap-routes-exist.test.ts`
- **用猜的函式名 grep 授權守衛，差點回報「23 條 admin 路由全裸奔」** — **已升格為 JUDG-9**。實際的守衛叫 `withAdminAuth`，那 23 條全都有防護
- **外部服務的可用性，文件／費率表／實際 endpoint 各說各話** — **已併入 JUDG-7**（第一手來源包含 endpoint 本身）。綠界文件把 `OKMARTC2C` 列為合法值，實打回的是「OK超商暫停服務」
- **修好一條路徑不代表修好那個 bug——同一個錯常有第二份拷貝** — **已升格為 JUDG-10**。體驗預約是完全獨立的第二套程式碼，連 `experience-reminders` 共四份
- **修掉一個「永遠通過」的 bug，會讓它蓋住的第二個 bug 一起浮出來** — **已升格為 JUDG-10**。2FA 的 `epochTolerance` 預設 0 從上線就是錯的，被「任何碼都會過」蓋住而從未被考驗
- **推論出一句帶合規風險的農藥宣稱，還寫上了線** — **已升格為 JUDG-11**。防復發：`tea-process.test.ts` 有農藥宣稱的黑名單比對
- **環境變數名稱看不出品牌，茶山體驗的客人被導到接案帳號的 LINE** — **已升格為 JUDG-11**。已改名為 `NEXT_PUBLIC_LINE_TEA_URL`／`_TERROIR_URL`；`NEXT_PUBLIC_*` 是 build 時內嵌，改名順序必須是「先加新的 → 部署驗證 → 才刪舊的」
- **`node -e` 的巢狀引號被 shell 吃掉，檔案沒改、全綠是假的** — 環境事實**已移入 diagnosis.md**（連同 2026-08-25 發現的「heredoc 會吃掉一層反斜線」）；判斷面的「突變要用 `git diff --stat` 收尾」**已併入 JUDG-5**
- **PowerShell 把路徑裡的 `[slug]` 當萬用字元，8 個檔被靜默跳過** — **已移入 diagnosis.md 環境事實表**
- **repo 既有 `.ts`／`.json` 是 CRLF，LF 字面值比對會靜默 MISS** — **已移入 diagnosis.md 環境事實表**
- **dev server 留下的 `.next` 會毒化 `next build`** — **已移入 diagnosis.md 環境事實表**
- **內建瀏覽器擋 eval()，dev 版不會 hydrate、點擊全部沒反應** — **已移入 diagnosis.md 環境事實表**
- **Browser pane 不合成畫面、rAF 不執行，「畫面沒動」不能推論程式壞了** — **已移入 diagnosis.md 環境事實表**
- **`launch.json` 經 `cmd /c set` 傳的環境變數會多一個尾空白** — **已移入 diagnosis.md 環境事實表**

### 2026-08-27 精簡（15 條；多數升格為 JUDG-2／5／7／8 的正式規則）

- **「不含惡意字串」是錯的 XSS 斷言** — **已升格為 JUDG-8**（證據要有鑑別力）。轉義後的 payload 本來就會原樣保留惡意「文字」；斷言要針對結構（數開閉標籤、取出屬性值再驗），不要用 `not.toContain('<惡意字串>')`
- **用自己的錯誤假設寫測試，等於沒測——Sanity 時間戳是毫秒不是秒** — **已併入 JUDG-5**（安全修正另加一關）。驗第三方 webhook／簽章時，測試資料必須來自該服務的實際請求，不能憑格式慣例自己產生
- **eslint-config-next 帶進的 react-hooks 規則抓到 tsc 抓不到的 bug** — **已升格為 JUDG-5 第 2 點**（lint 可用且要跑，門檻 0 error）。用 effect + setState 修正另一個 state 之前，先問能不能在 render 時推導
- **「測試全綠」不等於「符合規格」——我寫的測試把違規釘成了正確** — **已併入 JUDG-8**。寫測試前先讀規格原文那一段；禁止類斷言（`not.toMatch`）必須在註解寫出規格出處，並優先寫成雙向斷言
- **使用者的現場經驗與 API 行為衝突時，先確認是不是兩種不同服務** — **已併入 JUDG-7**（引用外部規範前先查證）
- **派出 checker 之後又改檔，換來一個假 FAIL** — 派出獨立驗證後在它回報前不要再動那些檔；要改就等結果、或重派
- **catch 裡沒印 response body，401 就被我腦補成「金鑰失效」** — **已併入 JUDG-8**（沒報錯 ≠ 有做到的反面：報了錯也要看清楚報什麼）。catch 一律印出 response body 再歸因
- **驗證器讀錯目錄，回報「11 個 token 全部沒生成」** — **已併入 JUDG-8 第 1 點**（對照組要有鑑別力）。驗證腳本要先斷言「我讀的路徑存在且非空」
- **`${x}` 落在普通字串裡不會報錯——用「把來源改名」反向驗證插值真的被解析** — **已併入 JUDG-8**。驗插值用「改來源、看產物跟著變」，不要只看有沒有報錯
- **mock 回傳 select 沒要求的欄位，讓「忘了 select 主鍵」的 bug 綠燈上線** — **已併入 JUDG-8**。mock 只能回傳該次 select 真正要求的欄位，多給就是製造假綠燈
- **反向驗證用 `git checkout --` 還原，把同一個檔案未 commit 的工作一起洗掉** — **已併入 JUDG-2**（commit 前先 `git status -sb`）。反向驗證的突變與還原改用備份檔或 `git stash`，不要對有未提交變更的檔案下 `checkout --`
- **`git add -A` 把前一個 session 遺留的未追蹤檔一起提交了** — **已升格為 JUDG-2**（commit 前先 `git status -sb`）。commit 一律列明確路徑
- **供應商下架模型，聊天小幫手全站掛掉——而健康檢查一路回綠燈** — **已升格為 JUDG-8 第 4 判準**（監控本身也要能變紅）。Groq 下架 `llama-3.3-70b-versatile`，硬編的 model ID 打回 404 被 catch 吞成 503；健康檢查回的是硬編 `{ok:true}`，從沒真的碰過 Groq
- **往 template literal 裡加字串，反引號把整個字串截斷，lint 全綠只有 tsc 會紅** — **已併入 JUDG-5**（四件套不可省 tsc）。在 template literal 內新增文字時內容不得含反引號，要標示程式符號改用「」或直接寫成文字
- **hook 擋掉整條複合命令，前半段的 `git checkout -b` 也沒跑，commit 落到 main** — **已升格為 JUDG-2**（commit 前先 `git status -sb`）。中斷的複合命令是「全部沒做」不是「做到一半」；切分支與提交不要串在同一條命令裡
