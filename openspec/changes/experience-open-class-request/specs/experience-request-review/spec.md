## ADDED Requirements

### Requirement: 後台開課請求清單與同日期聚合
後台 SHALL 提供開課請求管理頁，可依狀態、體驗、日期區間篩選，預設顯示 `pending`。清單 SHALL 以「體驗 × 日期 × 時段」為鍵聚合同一時段的多筆請求，顯示該組的請求筆數、合計人數、合計預估營收，並可一次核准整組。

#### Scenario: 同一時段有多筆請求
- **WHEN** 同一體驗、同一日期、同一時段有 3 筆待審請求，人數分別為 2、3、2
- **THEN** 清單顯示為一組，標示「3 筆請求・合計 7 人」，並提供一次核准整組的動作

#### Scenario: 一次核准整組
- **WHEN** 管理員對該組按下核准
- **THEN** 系統只建立一個場次，該組所有請求皆更新為 `approved` 並各自取得專屬預約連結

#### Scenario: 依狀態篩選
- **WHEN** 管理員切換到「已婉拒」分頁
- **THEN** 只列出 `status = "declined"` 的請求

### Requirement: 核准請求即自動建立場次
`POST /api/admin/experience-requests/[id]/approve` SHALL 建立 `experience_sessions` 記錄（`status = "open"`、`visibility = "private"`、`created_from_request_id` 指向該請求），將請求狀態更新為 `approved`，產生 48 小時有效的預約 token，並寄出含專屬預約連結的核准通知信。管理員 SHALL 能在核准時指定該場次為公開成團或私人包場。

#### Scenario: 核准並開放併團
- **WHEN** 管理員核准一筆非包場請求
- **THEN** 建立 `visibility = "private"` 的場次，請求狀態為 `approved`，申請人收到含 48 小時有效連結的核准信

#### Scenario: 核准為私人包場
- **WHEN** 管理員核准一筆 `is_private = true` 的請求
- **THEN** 場次建立後即使申請人付款完成，`visibility` 仍維持 `private`

#### Scenario: 核准非待審請求
- **WHEN** 管理員對 `status = "declined"` 或 `withdrawn` 的請求呼叫核准
- **THEN** API 回 HTTP 409，且不建立場次

### Requirement: 核准前檢查場次衝突
核准前系統 SHALL 檢查該 `(experience_type_id, session_date, start_time)` 是否已存在場次。已存在時 MUST NOT 建立新場次，改為回傳既有場次資訊供管理員選擇「請客人加入既有場次」。

#### Scenario: 該時段已有場次
- **WHEN** 管理員核准的日期時段已有既有場次
- **THEN** API 回 HTTP 409 並帶既有場次的 id、剩餘名額與狀態，後台提示改用「請客人加入既有場次」的回覆

#### Scenario: 請客人加入既有場次
- **WHEN** 管理員選擇「請客人加入既有場次」
- **THEN** 請求狀態更新為 `alternative_offered`，申請人收到帶該場次預約連結的信

### Requirement: 專屬預約連結的有效期與逾期回收
核准產生的 token SHALL 於 48 小時後失效。逾期仍未建立預約時，系統 SHALL 將請求狀態更新為 `expired`，並取消或刪除該筆自動建立且無任何預約的場次。

#### Scenario: 連結逾期
- **WHEN** 核准後 48 小時內申請人未使用連結建立預約
- **THEN** 請求狀態更新為 `expired`，對應場次被回收，該日期時段重新開放

#### Scenario: 場次已有他人預約時不回收
- **WHEN** 逾期回收時該場次已存在任何 `confirmed` 預約
- **THEN** 場次保留，僅將請求標為 `expired`

#### Scenario: 逾期後使用連結
- **WHEN** 申請人在 token 失效後點擊連結
- **THEN** 頁面顯示連結已失效並提供重新申請與聯絡方式

### Requirement: 提供替代方案供申請人一鍵選擇
`POST /api/admin/experience-requests/[id]/alternatives` SHALL 接受 1 至 3 組候選日期時段（或既有場次 id），寫入 `experience_request_alternatives`，將請求狀態更新為 `alternative_offered`，並寄出可一鍵選擇的信件。申請人選定後 SHALL 進入與核准相同的流程。

#### Scenario: 業主提出兩個替代日期
- **WHEN** 管理員送出 2 組候選日期時段
- **THEN** 請求狀態為 `alternative_offered`，申請人收到列出這 2 組選項的信

#### Scenario: 申請人選定其中一組
- **WHEN** 申請人點選其中一組候選
- **THEN** 系統依該日期時段建立場次、請求狀態更新為 `approved`，並寄出含專屬預約連結的核准信

#### Scenario: 替代方案逾期未回應
- **WHEN** `alternative_offered` 狀態超過 7 天未獲回應
- **THEN** 請求狀態更新為 `expired`

### Requirement: 婉拒請求並附上可預約場次
`POST /api/admin/experience-requests/[id]/decline` SHALL 記錄婉拒原因與可選的自訂訊息，將狀態更新為 `declined`，並寄出婉拒信。婉拒信 MUST 附上該體驗最近的可預約場次（若有）。

#### Scenario: 婉拒且有其他可預約場次
- **WHEN** 管理員婉拒請求，且該體驗未來 60 天內存在 `status = "open"` 的公開場次
- **THEN** 婉拒信中列出最近 3 個可預約場次與預約連結

#### Scenario: 婉拒且無其他場次
- **WHEN** 該體驗未來 60 天內無任何可預約場次
- **THEN** 婉拒信不列場次，改附聯絡方式邀請另約時間

### Requirement: 一鍵聯絡與內部備註
後台每筆請求 SHALL 提供 `tel:` 與 `mailto:` 一鍵聯絡（`mailto:` 主旨與內文預填請求編號、體驗、日期時段、人數），並提供只有管理員可見的內部備註欄位，可隨時編輯儲存。

#### Scenario: 一鍵撥號
- **WHEN** 管理員在手機上點擊聯絡電話
- **THEN** 觸發 `tel:` 撥號，號碼為該請求的聯絡電話

#### Scenario: 記錄電話溝通結果
- **WHEN** 管理員在內部備註填入內容並儲存
- **THEN** 備註寫入 `experience_requests.admin_note`，且不出現在任何寄給客人的信件或客人端 API 回應

### Requirement: 審核動作寫入稽核紀錄
核准、婉拒、提替代方案、撤銷核准 SHALL 寫入既有 `admin_audit_log`，記錄操作者、動作、請求 id 與關鍵參數。

#### Scenario: 核准動作留痕
- **WHEN** 管理員核准一筆請求
- **THEN** `admin_audit_log` 新增一筆記錄，含管理員身分、動作類型與請求 id

### Requirement: 待審請求每日彙整通知
系統 SHALL 每日執行 `/api/cron/experience-request-digest`，彙整 `status = "pending"` 且建立超過 24 小時的請求，寄出一封摘要信給 `ADMIN_EMAIL`。無符合項目時 MUST NOT 寄信。

#### Scenario: 有積壓的待審請求
- **WHEN** cron 執行時存在 3 筆待審超過 24 小時的請求
- **THEN** 寄出一封列出這 3 筆（體驗、日期時段、人數、等待時數）的摘要信

#### Scenario: 沒有積壓
- **WHEN** cron 執行時無任何待審超過 24 小時的請求
- **THEN** 不寄信，回傳處理數量 0

#### Scenario: 未授權呼叫
- **WHEN** 呼叫 cron 端點時 `authorization` 標頭不等於 `Bearer ${CRON_SECRET}`
- **THEN** 回傳 HTTP 401

### Requirement: 申請人付款完成後場次轉為公開
當來自請求的場次收到第一筆 `confirmed` 預約，且該請求 `is_private = false` 時，系統 SHALL 將場次 `visibility` 更新為 `public`，並將請求狀態更新為 `converted`。

#### Scenario: 非包場請求付款完成
- **WHEN** 申請人完成付款，預約狀態變為 `confirmed`，且請求非包場
- **THEN** 場次 `visibility` 更新為 `public`，出現在公開月曆供其他客人加入，請求狀態為 `converted`

#### Scenario: 包場請求付款完成
- **WHEN** 申請人完成付款，且請求 `is_private = true`
- **THEN** 場次維持 `visibility = "private"`，請求狀態為 `converted`

### Requirement: 撤銷核准
管理員 SHALL 能在申請人尚未付款前撤銷核准，系統將請求狀態改回 `pending`、使 token 失效並回收自動建立的場次。

#### Scenario: 撤銷未付款的核准
- **WHEN** 管理員對 `status = "approved"` 且無任何 `confirmed` 預約的請求執行撤銷
- **THEN** 場次被回收、token 失效、請求狀態回到 `pending`，並寫入稽核紀錄

#### Scenario: 撤銷已付款的核准
- **WHEN** 該場次已有 `confirmed` 預約
- **THEN** API 回 HTTP 409，提示應改走既有的場次取消與退款流程
