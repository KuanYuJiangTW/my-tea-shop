## ADDED Requirements

### Requirement: 後台可切換體驗上架狀態
系統 SHALL 在後台「排序與季節」頁（`/admin/experiences/ordering`）為每一款體驗提供上架／下架開關，並透過 `PATCH /api/admin/experience-types/[id]` 更新 `experience_types.is_active`。

#### Scenario: 管理員下架一款體驗
- **WHEN** 已登入的管理員對 id 為 3 的體驗呼叫 `PATCH /api/admin/experience-types/3`，body 為 `{ "is_active": false }`
- **THEN** 系統把該筆 `is_active` 更新為 `false`，並回傳 HTTP 200

#### Scenario: 未登入不得切換
- **WHEN** 沒有有效 `admin_session` 的請求呼叫 `PATCH /api/admin/experience-types/3`
- **THEN** 系統回傳 HTTP 401，資料庫不變

#### Scenario: body 不合法
- **WHEN** body 的 `is_active` 不是布林值，或 body 帶了 `is_active` 以外的欄位（例如 `price`）
- **THEN** 系統回傳 HTTP 400，資料庫不變

#### Scenario: 體驗不存在
- **WHEN** 管理員對不存在的 id 呼叫此 API
- **THEN** 系統回傳 HTTP 404

#### Scenario: 下架的體驗仍顯示在後台
- **WHEN** 管理員開啟「排序與季節」頁
- **THEN** 已下架的體驗仍列在清單中，以灰階顯示並標示「前台不顯示」，開關可再次切回上架

### Requirement: 切換前須經確認並顯示影響範圍
後台 SHALL 在送出上架／下架請求之前顯示確認視窗；管理員取消時 MUST NOT 送出請求。

#### Scenario: 下架確認視窗列出未來場次與有效預約
- **WHEN** 管理員點擊某款上架中體驗的開關
- **THEN** 確認視窗顯示該體驗未來的 `open` 場次數與有效預約（pending／confirmed）筆數，並說明這些預約不會被取消

#### Scenario: 上架確認視窗提醒立即公開
- **WHEN** 管理員點擊某款下架中體驗的開關
- **THEN** 確認視窗說明客人會立刻看得到並可以預約，管理員確認後才送出

### Requirement: 切換後立即清除前台快取
系統 SHALL 在 `is_active` 更新成功後清除前台頁面快取，使首頁、`/experiences`、體驗詳細頁、茶知識文章、sitemap 的中英文版本在下一次請求時反映新狀態，而不是等待 ISR 到期。

#### Scenario: 下架後列表頁立即不顯示
- **WHEN** 管理員下架某款體驗且 API 回傳 200
- **THEN** 下一次請求 `/experiences` 與 `/en/experiences` 時，回應中不包含該體驗

#### Scenario: 更新失敗不清快取
- **WHEN** 資料庫更新失敗
- **THEN** 系統回傳 HTTP 500，且不清除快取

### Requirement: 切換操作寫入審計日誌
系統 SHALL 在每次上架／下架成功後，於 `admin_audit_logs` 寫入一筆 `action = "update_experience_active"`、`resource_id` 為體驗 id 的紀錄。

#### Scenario: 成功切換留下紀錄
- **WHEN** 管理員成功下架 id 為 3 的體驗
- **THEN** `admin_audit_logs` 新增一筆 `action = "update_experience_active"`、`resource_id = "3"` 的紀錄

### Requirement: 前台只顯示上架中的體驗
系統 SHALL 只在前台（首頁、`/experiences`、體驗詳細頁、sitemap、茶知識文章的體驗卡、AI 客服知識）呈現 `is_active = true` 的體驗。

#### Scenario: 已下架體驗的詳細頁
- **WHEN** 訪客請求已下架體驗的 `/experiences/[slug]`
- **THEN** 系統回傳 404

#### Scenario: 已下架體驗不出現在 sitemap
- **WHEN** 搜尋引擎請求 `/sitemap.xml`
- **THEN** sitemap 中不包含已下架體驗的網址

### Requirement: 已下架體驗不接受新的需求登記
`POST /api/experience-interest` SHALL 拒絕已下架或不存在的體驗。

#### Scenario: 對已下架體驗登記「想來」
- **WHEN** 訪客以已下架體驗的 `experienceTypeId` 呼叫 `POST /api/experience-interest`
- **THEN** 系統回傳 HTTP 400 `{ error: "此體驗目前未開放" }`，不寫入資料表、不寄通知信

### Requirement: 後台場次管理可為下架體驗排場次
後台「場次管理」的體驗選單 SHALL 列出全部體驗，已下架者以「（未上架）」標示，讓管理員可以先排場次再上架。

#### Scenario: 選單包含下架體驗
- **WHEN** 管理員開啟場次管理頁
- **THEN** 體驗選單包含 `is_active = false` 的體驗，名稱後附「（未上架）」
