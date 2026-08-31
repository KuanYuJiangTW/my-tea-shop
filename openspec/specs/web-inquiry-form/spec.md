# web-inquiry-form Specification

## Purpose
接案諮詢表單：六題欄位與驗證、寫入資料庫、RLS deny-by-default、防濫用、admin 通知信與成功後的 LINE 導流。

## Requirements

### Requirement: 六題諮詢欄位
表單 SHALL 包含六題：(1) 認識管道（單選：茶網站看到／朋友介紹／搜尋／社群／其他）、(2) 產業與品牌名（文字）、(3) 想解決的痛點（複選：還沒有網站／網站太舊／想收線上訂單／想要預約功能／想被 Google 和 AI 搜到／其他）、(4) 預算區間（單選：5 萬內／5–15 萬／15–30 萬／30 萬以上／還不確定）、(5) 期望上線時程（單選：1 個月內／3 個月內／還在評估）、(6) 聯絡方式（姓名必填＋LINE ID 或 Email 至少一項）與方便聯絡時段（選填）。

#### Scenario: 必填缺漏
- **WHEN** 訪客未填姓名或 LINE ID／Email 皆空即送出
- **THEN** 前端阻擋並顯示雙語錯誤提示，不發出 API 請求

### Requirement: 提交寫入資料庫
`POST /api/web-inquiry` SHALL 驗證欄位（單選／複選值採白名單檢查，非法值回 400）後，以 service_role client 寫入 `web_inquiries` 資料表，成功回 200。

#### Scenario: 合法提交
- **WHEN** 六題填答合法送出
- **THEN** `web_inquiries` 新增一筆完整記錄，API 回 200

#### Scenario: 選項灌入非法值
- **WHEN** 請求 body 的預算欄位帶白名單以外的字串
- **THEN** API 回 400 且不寫入資料庫

### Requirement: 資料表 RLS deny-by-default
`web_inquiries` SHALL 啟用 RLS 且不建立任何 anon／authenticated policy；讀寫僅能經 service_role（API route 與 admin 後台服務層）。

#### Scenario: 匿名直連寫入
- **WHEN** 任何用 anon key 的 client 直接對 `web_inquiries` insert 或 select
- **THEN** 被 RLS 拒絕

### Requirement: 防濫用
API SHALL 套用 `@/lib/rate-limit` 限流，且表單 SHALL 含 honeypot 隱藏欄位——該欄位有值時 API MUST 回成功但靜默丟棄（不寫庫、不寄信）。

#### Scenario: 機器人填了 honeypot
- **WHEN** 請求的 honeypot 欄位非空
- **THEN** API 回 200 但資料庫無新記錄且不寄通知信

### Requirement: admin 通知信 best-effort
寫入成功後系統 SHALL 呼叫 `sendWebInquiryEmail()`（Resend，寄往 `ADMIN_EMAIL`）通知新諮詢摘要；寄信失敗 MUST NOT 影響 API 成功回應（僅記錄錯誤）。

#### Scenario: Resend 故障
- **WHEN** 寄信拋出例外
- **THEN** API 仍回 200，資料已在庫，錯誤進 log

### Requirement: 成功回饋與 LINE 導流
提交成功後表單區 SHALL 顯示成功訊息；若 `NEXT_PUBLIC_LINE_TERROIR_URL` 已設定則同時顯示「加 LINE 立即聊」按鈕，未設定則顯示「一個工作天內回覆」。

#### Scenario: 成功後導 LINE
- **WHEN** 提交成功且 LINE 連結已設定
- **THEN** 成功畫面出現 LINE 按鈕，點擊開啟該連結
