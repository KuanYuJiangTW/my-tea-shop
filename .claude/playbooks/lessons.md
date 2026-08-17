# 教訓紀錄（LESSONS）

> 踩坑當下就 append 一條，格式與合格判準見 maintenance.md MAINT-2。滿 30 條照 MAINT-4 精簡。
> **歸檔區在檔末**——重複主題已升格為 judgment.md 的正式規則，原條目壓成一行；
> 完整原文在 git 歷史與 `.claude/backups/lessons.md.20260806.bak`。

## 2026-07-28 「不含惡意字串」是錯的 XSS 斷言，正確的是「惡意字串進不了 script 區塊」
- 情境：修 cvs-callback 反射型 XSS 後寫測試，直覺寫了 `expect(html).not.toContain('window.__pwned')` 與 `expect(html).not.toContain('onload=')`——兩條都失敗。轉義後的 payload 本來就會原樣保留這些「文字」（`&lt;/script&gt;...window.__pwned`），那正是正確行為。另外 `/<div[^>]*\sonload=/` 這種正則也不可靠，因為 `[^>]*` 分不出「真屬性」與「屬性值裡的字」
- 代價：三次來回改斷言，一度以為修正沒生效
- 規則：驗轉義類修正時，斷言要針對「結構」不是「字串存在」——（a）數開閉標籤個數 `html.match(/<script/gi).length`；（b）取出屬性值後檢查裡面沒有未轉義的界定符 `attr).not.toContain('"')`；（c）數標籤內 `="` 出現次數＝預期屬性數；（d）解碼後與原輸入比對確認不失真。絕不用 `not.toContain('<惡意字串>')` 當主要判準
- 去處：暫存於此（與前一條「安全修正需退回舊碼驗證測試會紅」同屬 JUDG-2 證據要求）

## 2026-07-28 修掉一個「永遠通過」的 bug，會讓它蓋住的第二個 bug 一起浮出來
- 情境：修好後台 2FA 的 `verify()` 型別誤用（舊碼任何驗證碼都通過）後，小江立刻回報 authenticator 的碼登不進去。查出 otplib 的 `epochTolerance` 預設是 0——只收當下那 30 秒窗，零時鐘誤差容許。這個設定從專案上線就是錯的，但因為「任何碼都會過」，它從來沒被實際考驗過。同理，當初綁定 2FA 時 setup 的確認步驟也用了同一個壞掉的 verify，代表使用者輸入任何數字都會存下 secret——資料庫裡的 secret 有可能從一開始就跟手機不一致
- 代價：使用者被鎖在正式站後台外面；我的修正被誤認為是故障來源
- 規則：修掉「驗證恆為通過」這類 bug 時，**當下就把同一條路徑上其他從未被真正執行過的邏輯全部檢查一遍**（時間窗／容差／長度限制／錯誤分支），並主動告知使用者「這個修正可能讓既有的隱藏問題浮現」＋提供復原手段（如何從資料庫停用該機制、如何清限流）。不要等使用者回報才查
- 去處：暫存於此

## 2026-07-29 用自己的錯誤假設寫測試，等於沒測——Sanity 時間戳是毫秒不是秒
- 情境：實作 sanity-webhook 的 HMAC 驗證時，照 Stripe 的慣例假設時間戳單位是「秒」，寫了 `Number(ts) * 1000`。但 Sanity 送的是毫秒（`Date.now()`），乘完變成公元五萬年，一律判定「簽章已過期」回 401。10 條測試全過卻沒抓到——因為我的測試也用 `Math.floor(NOW/1000)` 產生秒格式的時間戳，用同一個錯誤假設去驗證錯誤的程式碼
- 代價：小江在 Sanity 後台正確填好 Secret 後，webhook 全部 401，快取更新停擺；他來回測了兩次才從 log 找出原因
- 規則：驗證第三方 webhook／簽章時，**測試資料必須來自該服務的實際請求，不能自己憑格式慣例產生**。做法：先讓一筆真實請求打進來，從 log 或 request dump 取出實際的標頭原文，再據以寫測試。若無法取得真實樣本，至少要在程式碼中同時容納常見的兩種單位（秒／毫秒），並各寫一條測試
- 去處：暫存於此（與「安全修正需退回舊碼驗證測試會紅」互補：那條保證測試有效，這條保證測試的前提正確）

## 2026-07-30 eslint-config-next 帶進的 react-hooks 規則抓到 tsc 抓不到的 bug
- 情境：lint 修好後首次全 repo 掃描，65 個問題裡有 1 個落在本次新寫的 `ProcessContent.tsx`：`react-hooks/set-state-in-effect`——我用 effect 去「修正」切換茶款後失效的 `activeStep`，在 effect body 直接 setState
- 代價：若沒 lint 就會留著。它不是型別錯誤（`tsc` 全綠）、也不會讓測試紅燈，只會安靜地多一次連鎖 render，並讓「當前步驟」有兩個事實來源
- 規則：**用 effect + setState 去修正另一個 state 之前，先問能不能在 render 時推導**（derive，不要 sync）。這類問題 `tsc` 與單元測試都抓不到，只有 `npm run lint` 會擋
- 去處：暫存於此

## 2026-07-30 我推論出一句帶合規風險的農藥宣稱，還寫上了線
- 情境：製茶過程頁的蜜香紅茶文案。店主給的事實是「蜜香來自小綠葉蟬叮咬（著蜒）」，我據此推論成「**要蜜香就不能用藥**」並寫進 zh/en 共 4 處。店主校對時更正：仍會用藥防治小綠葉蟬以外的病蟲害，**不得寫成不用藥**
- 代價：這是對外的農藥宣稱，若上線等於在營運中的電商頁面對客人做不實的無農藥聲明——風險等級遠高於一般文案錯字。而且它通過了測試、lint、build、checker 前的所有自查，因為那些都不檢查「事實對不對」
- 規則：**寫到下列任一類宣稱時，一律標記為待確認、不得由推論產生**：農藥／有機／無添加、認證與獎項、產地與海拔、成分與含量、保存期限、療效與健康功效、價格與折扣條件。判準是「這句話若不實，會不會構成不實廣告」——會，就必須有店主原話為依據，不能從相鄰事實推導
- 去處：暫存於此。已在 `tea-process.test.ts` 對農藥宣稱加黑名單比對測試防復發；此類宣稱建議日後都比照加測試

## 2026-07-30 「測試全綠」不等於「符合規格」——我寫的測試把違規釘成了正確
- 情境：規格「製程參數不得虛構」把方案 B 限定在**新增**工序，並明文既有溫度時數 SHALL 保留。我誤讀為全面禁用，刪掉 6 步已確認參數，**並寫了一條測試斷言「不得出現溫度時數」**。此後 345 測試全綠、lint 零問題、build 成功，我還拿這些當完成證據回報
- 代價：測試從防線變成掩護。若非 checker 逐條對規格原文，這個違規會帶著「全綠」的背書上線。同時丟失店主已確認的製程事實
- 規則：**寫測試前先讀規格原文那一段，不要憑對規格的印象寫斷言**。禁止類斷言（`not.toMatch`）風險最高——它會把「我以為不該有的東西」永久排除，一旦前提錯了就再也沒人發現。凡是禁止類斷言，必須在註解寫出規格出處（檔名＋節名），並優先寫成**雙向**斷言（該有的要有、不該有的不能有）
- 去處：暫存於此

## 2026-08-01 外部服務的可用性，文件／費率表／實際 endpoint 會各說各話
- 情境：核實四大超商店到店。綠界「門市訂單建立」API 文件把 `OKMARTC2C` 列為合法值，但「門市電子地圖」文件只列三家，服務介紹頁與費率表則完全沒有 OK。拿正式金鑰實打電子地圖才拿到答案：`OKMARTC2C` 回 30 bytes 的「OK超商暫停服務(若有寄件需求，請使用711、全家、萊爾富)」。反過來，萊爾富被懷疑不能代收，查文件三份來源都沒有明說，最後是用綠界官方公開的 C2C 測試特店（2000933）對 `logistics-stage` 送 `HILIFEC2C + IsCollection=Y`，建單成立才定案
- 代價：無（出手前查到了），但站上「OK 超商」這個壞掉的選項已經掛了不知道多久——客人選了只會拿到一片「暫停服務」，直接卡死結帳
- 規則：判斷第三方服務「某個選項現在還能不能用」時，文件與費率表只當線索，**一律以實打 endpoint 為準**。順序：(1) 唯讀端點（地圖、查詢）用正式金鑰打，看回應內容不只看 HTTP 狀態碼——綠界這種會用 200 回傳錯誤字串；(2) 需要建單／寫入才能判定時，去該服務的**測試環境**用官方公開測試帳號打，不要用正式帳號；(3) 做差異對照——同一組參數只改待測的那一個維度，並拿已知可用的選項當對照組，才能分辨「被這個維度擋下」還是「卡在別的必填欄位」
- 去處：暫存於此（JUDG-7「引用外部規範前查第一手來源」的具體化：第一手來源包含 endpoint 本身，不只是文件頁）

## 2026-08-01 使用者的現場經驗與 API 行為衝突時，先確認是不是兩種不同服務
- 情境：小江說「我去萊爾富寄貨，店員說不能代收貨款」，據此要求把萊爾富的貨到付款關掉。但綠界費率表明列「萊爾富店到店－取貨付款 55元/筆＋代收手續費 0.75%」，撥款結算表也有萊爾富。兩邊都不像講錯。實際是兩種服務：走進櫃台自己填單的萊爾富散客店到店本來就不代收；綠界 C2C 的代收金額是賣家在綠界後台建物流單時填的，門市櫃台全程不經手（費率表註2 自己就寫了「超商門市人員不會先行收取物流運費」）
- 代價：先照現場經驗把萊爾富的貨到付款擋掉，改完、測完、build 完，隔一輪確認後又整套改回來——多繞一趟
- 規則：使用者的第一手觀察與 API／文件衝突時，**不要急著二選一，先問「這是不是同一條路徑」**——同一家廠商常有散客自助版與平台串接版，兩者的能力不同。釐清方式：問使用者當時的實際操作步驟（走櫃台自填單？還是先在後台建單拿編號再去機台印？），並找出「這個能力是在哪一步被設定的」。在釐清前，可以先做兩邊都同意的部分（本例：OK 超商不管誰對都要移除），把有爭議的部分留到最後
- 去處：暫存於此（與 JUDG-3「該不該問使用者」互補：本條是「該問什麼」）

## 2026-08-01 SELECT 少一個欄位，`??` 的 fallback 就從保險變成預設路徑
- 情境：訂單取消退點寫成 `order.points_discount ?? Math.floor(order.points_used / 100)`，看起來是「有新欄位就用新的，沒有就用舊制換算」的合理防禦。但同一支路由的 `.select(...)` 沒把 `points_discount` 列進去，於是它**永遠**是 undefined，fallback 從「意外時的保險」變成「唯一會走的路」。客人用 500 點折抵，取消只退 5 點
- 代價：正式站上不知多久，每筆會員自助取消的訂單都吃掉客人 99% 的折抵點數；三條掛著正確名字的測試全綠（它們只對本地變數做算術，從未呼叫路由），完全沒擋住
- 規則：Supabase／任何顯式列欄位的查詢，**寫完 `??`、`?.`、`||` 的預設值之後，回頭確認那個欄位真的在 select 清單裡**。更根本的做法是別讓 fallback 靜默生效：(a) 測試的 DB mock 要「只回傳 select() 指名的欄位」，忘了 select 就會自然變紅；(b) 相容用的 fallback 要留下痕跡（log 或 metric），不要靜靜地換一條語意不同的路。同一路徑上「扣」與「還」必須引用**同一個欄位**——這裡扣的是 `points_used`，還的卻是 `points_discount`，1:1 時碰巧相等就沒人發現
- 去處：暫存於此（與 2026-07-30「測試全綠不等於符合規格」互補：那條講測試釘錯了規格，這條講測試根本沒接上程式碼）

## 2026-08-01 修好一條路徑不代表修好那個 bug——同一個錯常有第二份拷貝
- 情境：前一輪剛把商品訂單的取消退點改成「以 `point_transactions` 帳本為準」，還寫了 12 條回歸測試、反向驗證 6 次、跑了補償 SQL，整件事看起來收乾淨了。這輪小江問「體驗預約的結帳與取消對不對」，一查——體驗預約是**完全獨立的第二套程式碼**（`/api/bookings/[id]/cancel`、`/api/admin/experience-bookings/[id]/cancel`、`/api/ecpay/experience-checkout`），仍然照 `points_discount` 退、沒有冪等、結帳可重複扣點，一行都沒被上一輪碰到
- 代價：無（小江問了才查），但這條路徑帶著同一個 bug 又多活了一輪。若不是被問到，下次發現可能是客人來客訴
- 規則：**修完一個 bug，用它的「錯誤形狀」而不是它的檔名去 grep 全 repo**。本例的形狀是「讀 `points_discount` 當退還依據」與「退點沒有減去已退」，一條 `grep -rn "points_discount" src/app/api` 就會露出體驗那三支。凡是同一領域有多套並行實作（商品訂單／體驗預約／候補轉正；四條金流路徑），修 A 之後一律逐一開啟 B、C、D 確認，**不要假設它們共用同一個 helper**
- 追記（同日）：後來為了做 cron 才打開 `experience-reminders`，發現**第四份實作**——場次因人數不足自動取消時，只寫了 `refund_status = "pending"`，點數一點都沒退。它躲過前面的 grep，因為那支檔案裡根本沒出現 `points_discount`（漏掉的東西 grep 不到）。補一條做法：**除了 grep 錯誤形狀，還要 grep 那個「狀態轉換」本身**——本例是 `status: "cancelled"`，全 repo 四處，逐一確認每處都做了該做的善後
- 去處：暫存於此（與 2026-08-01「SELECT 少一個欄位」同源：那條講單一路徑的錯，這條講那個錯的複製品）

## 2026-08-01 我從 git 歷史推論線上帳本的內容，被 migration 打臉
- 情境：接上條。要判斷體驗預約舊制「當年到底扣了幾點」，我去 `git show 2e1da44` 讀當時的程式碼，看到 `points: -pointsUsed`，就據此寫進規格檔頭、WORKLOG、lessons、測試註解：「體驗舊制帳本扣的是 `points_used`（3300），照 `points_discount`（33）退會吞掉客人 3267 點」，還說這與商品訂單的舊 bug**方向相反**。小江跑稽核 SQL 回來，帳本實際是 −6 而 `points_used` 是 600。查 `points_system.sql:132` 才發現新制 migration 有一句 `UPDATE point_transactions SET points = ROUND(points/100)` 把**整個帳本**改寫過，而同一份 migration 的 backfill 只處理 `orders`、沒動 `experience_bookings`
- 代價：一個危言聳聽的錯誤結論被寫進四個地方（其中規格檔頭正是為了「不要誤導下一個 session」而寫的），還向使用者報告了不存在的災難情境，事後全部要回頭更正。程式碼修正本身沒錯（帳本法不依賴這個推論），但那是運氣不是判斷
- 規則：**「當年寫進 DB 的是什麼」只能由 DB 回答，程式碼歷史只能回答「當年打算寫什麼」**。兩者之間隔著：insert 靜默失敗（本例 `order_id` FK 擋掉一整批）、後續 migration 改寫、手動修資料。要寫任何關於歷史資料形狀的斷言之前，先跑一段 `SELECT` 看實際列——查詢用 `LEFT JOIN` 才看得到「完全沒有記錄」這種形狀。**在拿到實際輸出之前，規格與文件裡不要寫具體數字**，寧可寫「以帳本為準，原因見稽核 SQL」。連帶檢查：找到任何一句 `UPDATE <表> SET` 的 migration，就要問「它漏掉哪張表沒一起改」——`orders` 被 backfill 而 `experience_bookings` 沒有，兩欄從此永久不一致
- 去處：暫存於此（JUDG-2「完成要有證據」的延伸：對**過去的資料狀態**下斷言，證據只能是查詢輸出，不能是 git log）

## 2026-08-01 派出 checker 之後又改檔，換來一個假 FAIL
- 情境：報價頁交付後派 `checker` 逐條驗收，驗收條件之一是「只涉及產物清單內的檔案」。派工之後我自己發現 `/web-design` 沒進 `src/app/sitemap.ts`，順手補了。checker 回報 11 條裡 10 條 PASS、唯一 FAIL 就是「sitemap.ts 不在授權清單內」——它拿的是我發派當下的清單，那份清單在它讀檔前就過時了
- 代價：一個假 FAIL 混在真 PASS 裡，要人工判讀才知道不是缺陷。危險的是下游處理：若換一個 session 收尾，很可能照著 FAIL 去「修復」，把正確的 sitemap 改動 revert 掉，而那正是讓報價頁被搜尋引擎找到的那一行
- 規則：**從派出 checker 到它回報之間，凍結受驗檔案**。臨時發現要補的東西，二擇一：(a) 記下來，等 checker 回報完再改，改完另派一次；(b) 立刻用 `SendMessage` 通知該 checker 把新檔補進產物清單。無論哪種，回報給使用者時必須逐條點名「哪條 FAIL 是清單過時、哪條是真缺陷」，不可只說「checker 通過了」帶過
- 去處：暫存於此（DISP-6「驗證不自驗」的補充：不自驗之外，還要在驗收期間凍結產物）

## 2026-08-01 catch 裡沒印 response body，401 就被我腦補成「金鑰失效」
- 情境：驗證線上報價頁時，用 PowerShell `Invoke-WebRequest` 帶 `SUPABASE_SERVICE_ROLE_KEY` 打 Supabase REST，拿到 401。我的 catch 只印了 `$_.Exception.Message`（＝「Response status code does not indicate success: 401」），沒印 `$_.ErrorDetails.Message`。於是我推論「金鑰被輪替過、本機失效」，寫進 WORKLOG 並叫小江去 Dashboard 重新複製金鑰
- 代價：向使用者發出一個不存在的故障與一趟白工；錯誤結論一度寫進 WORKLOG（那正是給未來 session 看的檔）。真正原因是 Supabase 新版 API key 會擋「看起來來自瀏覽器」的 secret key 請求——PowerShell 預設 User-Agent 含 `Mozilla`，被判定為瀏覽器。body 裡寫得清清楚楚：`Forbidden use of secret API key in browser`。加 `-UserAgent "node"` 就 200
- 規則：**HTTP 錯誤一律印出 response body 再下結論**。PowerShell 要 `$_.ErrorDetails.Message`（`$_.Exception.Message` 只有狀態碼那句廢話）；curl 用 `-i` 或 `--fail-with-body`。狀態碼只說「失敗」，body 才說「為什麼」——在拿到 body 之前，不要對失敗原因下任何斷言，更不要據此要使用者去改設定。另：本環境用 PowerShell 打任何雲端 API（Supabase／Stripe／綠界）都要顯式 `-UserAgent "node"`，預設 UA 會觸發服務端的瀏覽器防護
- 去處：暫存於此（與 JUDG-2「完成要有證據」同源：錯誤診斷也要有證據，狀態碼不是證據）

## 2026-08-06 把 class 字串抽到共用模組，Tailwind 卻掃不到——content glob 逐目錄列舉的坑
- 情境：狀態徽章的 class 從三個頁面抽到 `src/lib/admin-status.ts` 做單一事實來源。`tailwind.config.ts` 的 content 原本逐目錄列舉 `src/pages`、`src/components`、`src/app`——**不含 `src/lib`**。於是只被該檔引用的 `status-warn` / `status-warn-soft` 完全沒有生成
- 代價：差一步就讓「待付款徽章沒有底色」上線。而且極難察覺——其他 status 色因為前台 `AccountClient.tsx` 也用到而正常生成，只有 admin 獨有的那一組是空的，肉眼掃過 config 與程式碼都看不出問題。抓到它的是「從建置產物 CSS 讀出每個 token 的實際 rgb 再比對」這道驗證
- 規則：**content glob 一律寫 `./src/**/*.{js,ts,jsx,tsx,mdx}`，不要逐目錄列舉**——逐目錄等於埋一條「共用模組不可以含 class 字串」的隱含規則，沒有人會知道。另：**把 class 字串搬到新位置後，必須從建置產物確認該 class 真的生成**，不能只看程式碼改對了
- 去處：暫存於此（與同日兩條同源：批次操作要有事前期望值可對照；這條是「期望值要落在產物上，不是原始碼上」）

## 2026-08-06 PowerShell 把路徑裡的 `[slug]` 當萬用字元，8 個檔被靜默跳過
- 情境：全站 101 處 `bg-tea-cream-light` → `bg-tea-cream` 的批次替換。用 `Get-ChildItem` 取檔案清單再 `Get-Content $_.FullName` 逐檔讀寫。App Router 的動態路由目錄 `[slug]`／`[id]`／`[sessionId]` 在 PowerShell 裡是**字元類別萬用字元**，`Get-Content` 於是找不到檔案
- 代價：8 個檔（含 `experiences/[slug]/page.tsx`、`orders/[id]/page.tsx`）完全沒被改到，只在 stderr 留下一行看似無害的「does not exist, or has been filtered by the -Include or -Exclude parameter」——**指令沒有非零退出，摘要也顯示「檔案數: 26」**。抓到它的只有事前盤點：預期 101、實得 88。更危險的是同一個迴圈裡 `Get-Content` 失敗會讓 `$c` 為 null，而 `[System.IO.File]::WriteAllText(path, $null)` 會**把檔案寫成空的**——這次僥倖沒發生（迴圈在更早的一行就出錯跳過了），但那是運氣不是設計
- 規則：**PowerShell 碰檔案路徑一律用 `-LiteralPath`**（`Get-Content`／`Test-Path`／`Remove-Item`／`Copy-Item` 皆同），本專案是 App Router，`[...]` 目錄到處都是。**批次寫檔前先擋空值**：`if ($null -eq $c) { throw "讀檔失敗: $path" }`，不要讓 null 流進 `WriteAllText`
- 去處：暫存於此（JUDG-8「先數再改」的第二次奏效：這次和正則毀 26 檔那次一樣，救命的都是事前期望值；差別是這次的失敗模式是「靜默少做」而不是「大聲做錯」，更難察覺）

## 2026-08-07 驗證器讀錯目錄，回報「11 個 token 全部沒生成」
- 情境：門面四件打磨，要從建置產物 CSS 確認語意 token 真的生成。腳本讀 `.next/static/css/`——
  但 Next 16 把 CSS 放在 `.next/static/chunks/`。`Get-ChildItem` 加了 `-ErrorAction SilentlyContinue`，
  於是 `$css` 是空字串，每一個 `-match` 都是 false，報告「11 個 token 全部沒生成」
- 代價：差點回頭去「修」根本沒壞的 token。救回來的是**清單裡混著第九波已驗證生效的
  `rounded-card` 與 `shadow-resting`**——它們不可能沒生成，所以錯的是驗證器不是被驗的東西
- 規則：**任何「掃產物找字串」的驗證，都要在同一次輸出裡帶兩組對照**：一個必定存在
  （如 `.bg-white`）、一個必定不存在（如 `.fill-tea-DOES-NOT-EXIST`）。兩者都答對，
  結果才可信。另外**先印出讀到的資料量**（`$css.Length`），零長度要當成錯誤不是「沒找到」。
  附帶：`hover:`／`focus:` 前綴的 class 在 CSS 裡是 `.hover\:x:hover`，用 `.x` 比對必然落空，要單獨查
- 去處：暫存於此（JUDG-8「證據要有鑑別力」的第三次現形。前兩次是「沒報錯≠有做到」，
  這次是「沒找到≠不存在」——同一個病的另一張臉：失敗與「沒資料」長得一模一樣）

## 2026-08-08 `${x}` 落在普通字串裡不會報錯——用「把來源改名」反向驗證插值真的被解析
- 情境：把 `email.ts` 的 503 處色值 hex 集中成常數，改用 `${C.text}`。只有 backtick 模板字串會解析插值；若某處其實是單／雙引號字串，`${C.text}` 就是**七個普通字元**。這種錯誤 `tsc` 不報、build 不擋、測試也測不到，但客人會收到印著 `${C.text}` 的訂單信
- 代價：本來要靠自寫的「字串上下文掃描器」判斷每個 hex 在哪種字串裡。寫了兩版都失敗——第一版在 `${}` 內遇到物件字面值的 `}` 就提前結束，第二版加了大括號深度仍只認出 117/503。**如果當初沒有「應該是 503」這個期望值，我會拿 117 這個數字繼續往下做**
- 規則：**要確認 `${...}` 真的被解析，就把被引用的來源改名，然後數 `tsc` 的「找不到名稱」錯誤數**——它必須精確等於替換數（本次 503 = 503）。少一個就代表少一處被解析，那處已淪為字面文字。驗完記得還原（用 `try/finally` 確保還原一定執行）。這比任何自製的字串狀態機都可靠，因為判斷交給了編譯器本人
- 去處：暫存於此（與 JUDG-8 同源：把「證據要有鑑別力」推進一步——**與其自己寫檢查器，不如想辦法讓既有工具替你回答**。自製檢查器本身就是要被驗證的東西，本次兩個自製腳本都出過錯）

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

## 2026-08-11 內建瀏覽器擋 eval()，dev 版不會 hydrate，點擊全部沒反應
- 情境：改完 Header 斷點後要驗「768px 點漢堡選單會不會開」。在 dev server（`npm run dev`）上用 `computer` 點兩次，面板都沒展開，`isMenuOpen` 毫無反應。一度懷疑是自己把行動選單面板的斷點改壞了
- 代價：兩次無效點擊＋一次錯誤懷疑。若沒查 console 就會回頭去「修」根本沒壞的斷點
- 規則：**在本環境的內建瀏覽器驗互動，一律用 production build**（`npm run build` ＋ `npx next start -p <另一個埠>`），不要用 dev server。原因：該瀏覽器的 CSP 沒有 `unsafe-eval`，而 React **dev 模式**要用 `eval()` 做除錯功能，於是 client bundle 起不來、頁面永遠停在未 hydrate 狀態——**畫面是對的、量測也正常，只有事件處理器全部無效**，最像「你自己改壞了」。判準：點擊沒反應時先 `read_console_messages`，看到 `eval() is not supported in this environment` 就是這條
- 去處：暫存於此（與上一條同源：兩者都是「渲染看起來正常，但量到／點到的不是真實狀態」）

## 2026-08-11 flex 版面吃緊時，「誰讓步」不指定就由瀏覽器替你決定——它挑了品牌 logo
- 情境：1024px ＋ 英文 ＋ 登入長名字時，header 整列差約 10px。flex 預設每個項目 `flex-shrink: 1`，瀏覽器把缺口分攤下去，結果被壓的是 logo——「霧抉茶」擠成兩行、SVG 從 34 縮到 30。而同一列裡明明有一個**本來就設計成會讓步**的元素（使用者名稱有 `max-w-[80px] truncate`，壓縮它只會多出省略號）
- 代價：這個症狀在站上活了不知多久。它不會報錯、不會溢出、`scrollWidth == clientWidth` 完全正常，只有量高度才看得出來（`brandH` 28 → 56）
- 規則：**一列 flex 裡若有「絕不能變形」的元素（logo、圖示、徽章），就明確標 `flex-shrink-0`，讓缺口落到有 `truncate`／`line-clamp` 的那個元素上**。判準：問「這列不夠寬時，我希望誰先讓步？」——答得出來就把答案寫進 class，答不出來表示版面配置還沒想清楚。特別注意 SVG 圖示：它們是 flex item，不標 `flex-shrink-0` 會被壓成變形的橢圓，而且沒有任何錯誤訊息
- 去處：暫存於此（與同日「字型還沒載完就量版面」同源：兩者的共同點是**沒有溢出不代表版面是對的**，折行與變形都是無聲的）

## 2026-08-11 dev server 留下的 .next 會毒化 next build，錯誤指向 next/font 完全無關的地方
- 情境：改完 Header 跑 `npm run build`，失敗於 `Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'`，指向 `noto_sans_tc_*.module.css` 與 `layout.tsx`。我這次只動了三個 Tailwind class，跟字型毫無關係
- 代價：差點花時間去查 `next/font` 設定。實際上停掉 dev server ＋ `rm -rf .next` 後，連跑兩次 build 都 exit 0
- 規則：**`next build` 失敗而錯誤落在 `next/font`、`@vercel/turbopack-*` 或其他你這次沒碰的框架內部模組時，第一步是停掉 dev server ＋ `rm -rf .next` 再跑一次，不要先去查那個模組**。Next 16 的 dev（`.next/dev`）與 build 共用 `.next` 母目錄，dev 寫進去的中繼產物會讓後續 build 解析不到 turbopack 的內部 import。判準：錯誤訊息裡的檔案若不在你的 diff 範圍內，先懷疑快取
- 去處：暫存於此（與歸檔區「perl -pi 批次改檔後 dev server 500——是 .next 的 Tailwind 快取」同一個病灶的第二張臉：那次毒的是 dev，這次毒的是 build）

## 2026-08-11 mock 回傳 select 沒要求的欄位，讓「忘了 select 主鍵」的 bug 綠燈上線
- 情境：要修 `points-expiry-notify` 一個「寄信失敗仍被標記已通知」的問題。讀碼時發現更嚴重的一層：7 天段的查詢是 `.select("user_id, points, expires_at")`（**沒有 `id`**），標記段卻用 `expiring7d.map(t => t.id).filter(Boolean)` 組主鍵清單 → `ids` 恆為空陣列 → `if (ids.length > 0)` 恆為 false → **update 從未執行**
- 代價：`notification_sent_7d` 永遠是 false，所以**同一批人在點數到期前每天都收一封信**（最後 3 天還會 7d+3d 各一封）。這支 cron 已在正式站每日執行。而它有 5 條測試、全綠——因為 `createChainMock` 不管 `select()` 傳什麼都回傳完整物件，測試裡 `t.id` 永遠有值，真實 Supabase 只回傳 select 指定的欄位
- 規則：**驗證「查詢欄位與後續使用是否對得上」時，mock 必須依 `select()` 裁切回傳資料**。本 repo 已備 `createSelectAwareChainMock`（`src/__tests__/points/helpers/supabase-mock.ts`），會記錄 select 的欄位並只回傳那些欄位，另提供 `_selectedCols()` 供直接斷言。凡是「查出來的列之後要拿主鍵回寫」的程式，測試一律用它，並加一條 `expect(cols).toContain("id")`
- 去處：暫存於此。與 2026-08-01「SELECT 少一個欄位，`??` 的 fallback 就從保險變成預設路徑」同源——**同一個坑第二次了**，兩次都是 select 漏欄位而下游靜默拿到 undefined。若再出現第三次，應升格為 playbook 正式規則

## 2026-08-11 購物車的商品名是「合成」的，切成 `nameEn` 會讓兩個規格變同名
- 情境：把 `/checkout` order summary 的商品名改成依語系取 `nameEn`。看起來是一行的恆等改動——`ProductCard.tsx:221` 早就這樣寫了，照抄即可
- 代價：差點讓英文版的「茶包組」與「150g 散茶」顯示成同一個名字、客人分不出訂到哪一項。原因是加入購物車時 `name` 被**合成**為 `${p.name} ${labels.teaBagSet}`（`ProductCard.tsx:71`、`TeaBagCard.tsx:24`），但 `nameEn` 沒跟著合成，仍是基礎茶名。切過去等於把後綴弄丟。是讀 `buildVariants` 才發現，grep `nameEn` 看不出來
- 規則：**把某欄位改成「依語系取 `xxxEn`」之前，先查該欄位在寫入端是不是被加工過**（grep 該欄位名在 `addToCart`／snapshot 組裝處的賦值，看右手邊是不是模板字串）。加工過就代表 `xxxEn` 與它不對等，要嘛在顯示層補回加工，要嘛在寫入端一起合成
- 去處：暫存於此。與「SELECT 少一個欄位」同屬「兩個欄位看起來平行、實際不對等」，但那組是查詢面、這組是寫入面

## 2026-08-12 Browser pane 不合成畫面、rAF 不執行——「畫面沒動」不能推論程式壞了
- 情境：修 `NumberTicker` 的初始值（SSR 原本吐出 `<span>0</span>+ 年製茶經驗`）。改完在 Browser pane 用 JS 捲到統計區、讀 span 文字，數字一直停在 0
- 代價：判定「`useInView` 沒觸發、三個 effect 互相等待太脆弱」，把一支**本來就正常**的元件從 `motion` 的 `useInView + useSpring` 重寫成自持 `IntersectionObserver` + rAF 並 commit，業主要原本 spring 的手感（過阻尼的長尾巴）又整支改回來——兩個多餘的 commit。真正原因是 pane 的 `document.visibilityState === "hidden"`，rAF 一秒 0 次回呼，任何動畫都不會前進
- 規則：**用 Browser pane 驗任何動畫前先跑探針**——`let n=0; requestAnimationFrame(()=>n++)` 等 1 秒讀 `n`，或直接讀 `document.visibilityState`。`n === 0` 或狀態是 `hidden` 時**不得用「畫面沒動」推論程式有問題**；改驗靜態產物（SSR HTML、computed style、class 名、DOM 文字的非動畫分支），動畫本身交給使用者目視並在完成報告裡標明「未驗」
- 去處：暫存於此。與 `diagnosis.md` 的「失焦」模式同源（環境限制被誤讀成程式缺陷），若再出現第二次應併入該檔的環境事實速查表

## 2026-08-15 `.claude/launch.json` 用 `set VAR=1 && ` 傳環境變數，值會多一個尾空白
- 情境：要量「商品卡加星等列會不會破壞 632px」，但 `product_reviews` 表還沒建（DDL 要業主執行），所以在讀取層加一個 `process.env.MEASURE_REVIEWS === "1"` 的假資料開關，並在 launch.json 的 `runtimeArgs` 用 `cmd /c "set NODE_OPTIONS=... && set MEASURE_REVIEWS=1 && npm run dev"` 傳進去
- 代價：dev server 起來後假資料沒生效，log 仍是真實查詢的「表不存在」。原因是 **cmd 的 `set FOO=1 && ` 會把 `&&` 前的空白一起吃進值**，實際值是 `"1 "`，嚴格比較永遠 false。多花一輪重啟才發現
- 規則：**launch.json 經 `cmd /c set` 傳的環境變數，讀取端一律 `?.trim()` 再比較**（或把該 `set` 放在整串命令最後、緊接 `&&` 前不留空白）。同理適用於任何 `set A=1 && set B=2 && cmd` 的串接
- 去處：暫存於此。屬一次性環境事實，若沒有第二次出現，下次精簡時壓成一行歸檔

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

## 2026-08-17 用猜的函式名 grep 授權守衛，差點回報「23 條 admin 路由全裸奔」
- 情境：確認 `/en/admin` 繞過後，要判斷 API 層是否也失守。我用一串**憑印象猜的**守衛名（`requireAdmin|validate_admin_session|admin_session|getAdminSession|assertAdmin`）grep `src/app/api/admin`，25 條中有 23 條沒命中，看起來像整層裸奔。實際的守衛叫 `withAdminAuth`，不在我的猜測清單裡——那 23 條全都有防護
- 代價：只差一步就把「後台 API 全面失守」寫進回報。真要送出去，業主會以為金流與訂單資料已外洩。實際只多花一次 `Read` 就翻案
- 規則：**要斷言「某目錄的路由缺少守衛」之前，先 Read 其中任一個檔，確認該專案實際使用的守衛識別字，再用那個字去 grep**。不得用猜測的名稱清單推導「不存在」；grep 命中 0 次先當成「我 pattern 寫錯」，不是「程式碼缺這東西」
- 去處：暫存於此。與 JUDG-8「對照組要有鑑別力」同源——這次的無效測試是 pattern 本身沒有鑑別力

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

## 已歸檔（2026-08-06 精簡 18 條；2026-08-15 再精簡 2 條）

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
