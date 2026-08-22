## ADDED Requirements

### Requirement: 開課請求入口的顯示條件與內容
體驗詳細頁 SHALL 在該體驗 `experience_types.accepts_requests = true` 時顯示開課請求入口；為 `false` 時不得顯示任何相關 UI。入口 SHALL 明示三件成交條件：該體驗的開團最低名額數與對應金額、可申請的期間與時段、回覆時效承諾。若 `NEXT_PUBLIC_LINE_TEA_URL` 已設定，入口 SHALL 同時提供「加 LINE 詢問」按鈕。

#### Scenario: 體驗開放請求
- **WHEN** 使用者瀏覽 `accepts_requests = true` 的體驗詳細頁
- **THEN** 月曆區塊下方顯示開課請求入口，內含最低消費金額、名額數與回覆時效文案

#### Scenario: 體驗未開放請求
- **WHEN** 使用者瀏覽 `accepts_requests = false` 的體驗詳細頁
- **THEN** 頁面不顯示開課請求入口、不顯示申請表單、不呼叫請求相關 API

#### Scenario: 未設定 LINE 連結
- **WHEN** `NEXT_PUBLIC_LINE_TEA_URL` 未設定
- **THEN** 入口只顯示線上申請按鈕，不顯示 LINE 按鈕

### Requirement: 申請表單欄位與前端驗證
申請表單 SHALL 包含：體驗種類、希望日期、希望時段、備選日期（選填）、備選時段（選填）、人數、是否包場、聯絡人姓名、電話、Email、LINE ID（選填）、偏好聯絡方式、方便聯絡時段（選填）、備註（選填）。姓名、電話、Email、希望日期、希望時段、人數為必填。前端 SHALL 在必填缺漏時阻擋送出並顯示對應語系的錯誤提示，且不發出 API 請求。

#### Scenario: 必填缺漏
- **WHEN** 使用者未填電話即按送出
- **THEN** 前端顯示該語系的錯誤提示，不發出 API 請求

#### Scenario: 完整填寫送出
- **WHEN** 所有必填欄位合法
- **THEN** 前端呼叫 `POST /api/experience-requests`，成功後顯示含查詢編號的成功畫面

### Requirement: 可申請日期與時段規則
系統 SHALL 拒絕不符下列任一條件的申請：距今少於 `experience_types.request_lead_days`（預設 7）天、距今超過 90 天、`start_time` 不在該體驗 `request_start_times` 的白名單內、日期落在 `experience_blackout_dates`、或該體驗設有 `experience_availability_windows` 但日期不落在任一段之內。前端 SHALL 讓不可申請的日期無法選取並說明原因，後端 SHALL 獨立再驗證一次。

#### Scenario: 日期過近
- **WHEN** 申請日期距今少於 `request_lead_days` 天
- **THEN** API 回 HTTP 400「這個日期太趕了」，前端該日期不可選並提示改用 LINE 或電話聯絡

#### Scenario: 日期超出可申請範圍
- **WHEN** 申請日期距今超過 90 天
- **THEN** API 回 HTTP 400，且不建立記錄

#### Scenario: 非該體驗的白名單時段
- **WHEN** 請求 body 的 `startTime` 不在該體驗 `request_start_times` 之內
- **THEN** API 回 HTTP 400，且不建立記錄

#### Scenario: 各體驗時段可不同
- **WHEN** 黃頭鷺導覽的 `request_start_times` 設為黃昏時段、茶藝體驗維持 `10:00` 與 `14:00`
- **THEN** 兩款體驗的表單各自只顯示自己的時段選項，互不影響

#### Scenario: 公休日
- **WHEN** 申請日期存在於 `experience_blackout_dates`
- **THEN** API 回 HTTP 400，前端該日期以公休樣式顯示且不可選

#### Scenario: 落在可申請期間之外（季節限制）
- **WHEN** 該體驗設有可申請期間，而申請日期不落在任何一段之內
- **THEN** API 回 HTTP 400，前端該日期不可選並顯示原因與最近的可申請期間

#### Scenario: 未設定可申請期間的體驗不受季節限制
- **WHEN** 該體驗在 `experience_availability_windows` 沒有任何記錄
- **THEN** 季節規則不適用，僅套用前置天數、90 天上限、時段白名單與公休日

#### Scenario: 可申請期間已全部過期
- **WHEN** 該體驗的所有可申請期間結束日皆早於今天
- **THEN** 該體驗沒有任何可申請日期，前台入口顯示「目前非開放季節」而非可填寫的表單

### Requirement: 開團最低名額數與應付金額
系統 SHALL 以 `experience_types.request_min_slots` 作為該體驗客製開課的最低名額數，最低消費為 `request_min_slots × price`，且 `request_min_slots` MUST NOT 大於 `max_participants`。距今 7 至 13 天的急件 SHALL 將最低消費乘以 1.2 並四捨五入至百位。申請人取得的名額數即為 `request_min_slots`（申請人數較多時取申請人數），名額由申請人自行安排，MUST NOT 因實際到場人數少於名額而退費。前端顯示與後端驗證 SHALL 使用同一份計算，不得各自實作。

#### Scenario: 一般申請
- **WHEN** 採茶的 `request_min_slots = 2`、`price = 450`、申請日距今 14 天以上
- **THEN** 最低消費為 900 元，申請人取得 2 個名額

#### Scenario: 單人申請
- **WHEN** 只有 1 人申請採茶，而 `request_min_slots = 2`
- **THEN** 申請成立，應付金額仍為 900 元（2 個名額），前端在送出前即明示此規則

#### Scenario: 申請人數超過最低名額
- **WHEN** 5 人申請採茶，而 `request_min_slots = 2`
- **THEN** 應付金額為 5 × 450 = 2,250 元，名額數為 5

#### Scenario: 急件加價
- **WHEN** 申請日距今 10 天，最低消費原為 1,600 元
- **THEN** 最低消費為 1,900 元

#### Scenario: 最低名額數超過場次上限
- **WHEN** 設定的 `request_min_slots` 大於 `max_participants`
- **THEN** 系統以 `max_participants` 為準，且後台儲存該設定時顯示警告

### Requirement: 建立開課請求
`POST /api/experience-requests` SHALL 驗證欄位（單選值採白名單、人數為 1 至 50 的整數、字串長度上限）後，以 service_role client 寫入 `experience_requests`，狀態為 `pending`，產生不可猜的 token 與人可讀的查詢編號，回傳 `{ requestNo, token }`。未登入亦得提交，`user_id` 於已登入時寫入。

#### Scenario: 合法提交
- **WHEN** 欄位全部合法
- **THEN** `experience_requests` 新增一筆 `status = "pending"` 的記錄，API 回 200 並帶查詢編號與 token

#### Scenario: 未登入提交
- **WHEN** 未登入使用者提交合法申請
- **THEN** 記錄建立成功且 `user_id` 為 null

#### Scenario: 人數非法
- **WHEN** `headcount` 非整數、小於 1 或大於 50
- **THEN** API 回 HTTP 400，且不寫入資料庫

#### Scenario: 選項灌入非法值
- **WHEN** `contactPreference` 帶白名單以外的字串
- **THEN** API 回 HTTP 400，且不寫入資料庫

### Requirement: 防濫用
`POST /api/experience-requests` SHALL 套用 `@/lib/rate-limit` 持久化限流（同一 IP 每日上限），且表單 SHALL 含 honeypot 隱藏欄位——該欄位有值時 API MUST 回成功但靜默丟棄（不寫庫、不寄信）。

#### Scenario: 超過限流
- **WHEN** 同一 IP 當日提交次數超過上限
- **THEN** API 回 HTTP 429，且不寫入資料庫

#### Scenario: 機器人填了 honeypot
- **WHEN** 請求的 honeypot 欄位非空
- **THEN** API 回 200 但資料庫無新記錄且不寄任何信

### Requirement: 申請確認信與業主通知信
寫入成功後系統 SHALL 依 `locale` 寄出申請確認信給申請人（含查詢編號、自助查詢連結、回覆時效承諾、該體驗最低消費），並寄出通知信給 `ADMIN_EMAIL`。寄信失敗 MUST NOT 影響 API 成功回應（僅記錄錯誤）。

#### Scenario: 成功提交後寄信
- **WHEN** 請求寫入成功
- **THEN** 申請人收到含查詢編號與自助查詢連結的確認信，業主收到新請求通知信

#### Scenario: 寄信服務故障
- **WHEN** Resend 拋出例外
- **THEN** API 仍回 200，資料已在庫，錯誤進 log

#### Scenario: 英文語系申請
- **WHEN** 申請的 `locale = "en"`
- **THEN** 申請人收到的確認信為英文

### Requirement: 申請人自助查詢與撤回
`GET /api/experience-requests/[token]` SHALL 回傳該請求的狀態、體驗、日期時段、人數與最低消費，但 MUST NOT 回傳其他請求的任何資料。`DELETE /api/experience-requests/[token]` SHALL 在狀態為 `pending` 或 `alternative_offered` 時將狀態改為 `withdrawn`。查詢頁 SHALL 標記為 noindex 且不進 sitemap。

#### Scenario: 憑 token 查詢
- **WHEN** 使用者以合法 token 存取查詢頁
- **THEN** 顯示該筆請求的目前狀態與內容

#### Scenario: 無效 token
- **WHEN** token 不存在或已過期
- **THEN** API 回 HTTP 404，頁面顯示「查詢連結無效」

#### Scenario: 撤回待審請求
- **WHEN** 申請人對 `status = "pending"` 的請求呼叫撤回
- **THEN** 狀態更新為 `withdrawn`，業主後台不再顯示於待審清單

#### Scenario: 撤回已核准請求
- **WHEN** 請求狀態為 `approved`
- **THEN** API 回 HTTP 409，並提示請直接聯絡業主

### Requirement: 資料表 RLS deny-by-default
`experience_requests`、`experience_request_alternatives`、`experience_blackout_dates` SHALL 啟用 RLS 且不建立任何 anon／authenticated policy；讀寫僅能經 service_role。

#### Scenario: 匿名直連讀取
- **WHEN** 任何使用 anon key 的 client 直接對 `experience_requests` select 或 insert
- **THEN** 被 RLS 拒絕

### Requirement: 一鍵附議既有請求
當某日期時段已有開課請求時，系統 SHALL 提供「＋1 我也想這天」的簡化表單，預填體驗、日期與時段，只需填聯絡資訊即可送出，並以一筆新的 `experience_requests` 記錄寫入。同一 Email 對同一體驗、日期、時段 SHALL 只能成立一筆請求。

#### Scenario: 附議成功
- **WHEN** 使用者在有需求標記的日期按下附議並填妥聯絡資訊
- **THEN** 建立一筆新的 `pending` 請求，該日期時段的累計人數增加

#### Scenario: 重複附議
- **WHEN** 同一 Email 對同一體驗、日期、時段再次送出
- **THEN** API 回 HTTP 409，並提示已收到過該申請

### Requirement: 全流程雙語
開課請求的所有前台文案、表單標籤、錯誤訊息、`alt` 與 `aria-label` SHALL 取自 `messages/` 的 `experienceRequest` 命名空間，zh 與 en 兩份齊備，MUST NOT 在元件中寫死中文字串。

#### Scenario: 英文頁瀏覽入口
- **WHEN** 使用者在 `/en/experiences/[slug]` 瀏覽開課請求入口
- **THEN** 所有可見文案與無障礙標籤皆為英文
