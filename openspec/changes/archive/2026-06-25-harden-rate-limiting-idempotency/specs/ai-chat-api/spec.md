## ADDED Requirements

### Requirement: Global daily usage cap

AI 客服 API SHALL 在每 IP 限流之外，額外套用全站每日總呼叫量上限，以保護外部模型（Groq）額度不被輪換 IP 的攻擊者刷爆。上限 SHALL 可由環境變數 `CHAT_DAILY_LIMIT` 設定，未設定時預設為 1000。

#### Scenario: 全站每日上限達到

- **WHEN** 全站當日（UTC）累計聊天請求數已達 `CHAT_DAILY_LIMIT`
- **THEN** 系統 SHALL 回應 HTTP 429 並提示改用 LINE 聯繫，不再呼叫外部模型

#### Scenario: 跨日重置

- **WHEN** 進入新的 UTC 日期
- **THEN** 系統 SHALL 以新的每日計數重新累計
