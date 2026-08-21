## ADDED Requirements

### Requirement: 公開月曆不顯示私人場次
`GET /api/experience-sessions` SHALL 只回傳 `visibility = "public"` 的場次；`visibility = "private"` 的場次 MUST NOT 出現在公開月曆的任何格子、圓點或場次清單中。

#### Scenario: 月份內含私人場次
- **WHEN** 某月份同時存在 2 個公開場次與 1 個私人場次
- **THEN** API 只回傳 2 筆，月曆該日不因私人場次出現圓點

#### Scenario: 私人場次轉為公開
- **WHEN** 某私人場次的 `visibility` 被更新為 `public`
- **THEN** 下一次月曆查詢即包含該場次，圓點與場次卡片正常顯示

### Requirement: 已有開課請求的日期顯示需求標記
月曆日期格 SHALL 對「已有累計 2 人以上開課請求」的日期顯示需求標記（樣式有別於既有的可預約／額滿／取消圓點）。標記 SHALL 只呈現累計人數，MUST NOT 顯示任何申請人的姓名、電話或 Email。累計未滿 2 人的日期 MUST NOT 顯示標記。

#### Scenario: 該日累計 3 人想開課
- **WHEN** 某日期時段的待審請求合計 3 人
- **THEN** 該日期格顯示需求標記，點選後顯示「已有 3 人想在這天開課」與附議入口

#### Scenario: 該日只有 1 人想開課
- **WHEN** 某日期時段的待審請求合計 1 人
- **THEN** 該日期格不顯示需求標記

#### Scenario: 需求資料不含個資
- **WHEN** 前端呼叫 `GET /api/experience-requests/demand`
- **THEN** 回應只包含日期、時段、累計人數與請求筆數，不含任何聯絡資訊
