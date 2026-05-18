## ADDED Requirements

### Requirement: Rate limit integration 測試
系統 SHALL 驗證 checkout routes 的 rate limit 整合。

#### Scenario: validate-coupon 超過 10 次/分鐘回傳 429
- **WHEN** 同一 IP 在 1 分鐘內發送第 11 次 validate-coupon 請求
- **THEN** 回傳 HTTP 429 `{ error: "操作太頻繁，請稍後再試" }`

#### Scenario: 不同 IP 互不影響
- **WHEN** IP-A 已達限制但 IP-B 尚未
- **THEN** IP-B 的請求正常通過

#### Scenario: stripe checkout rate limit
- **WHEN** 同一 IP 超過限制次數
- **THEN** 回傳 HTTP 429

#### Scenario: ecpay checkout rate limit
- **WHEN** 同一 IP 超過限制次數
- **THEN** 回傳 HTTP 429

### Requirement: 升等流程 integration 測試
系統 SHALL 驗證完整的 issuePoints → updateMembershipSpend → checkAndUpgradeTier → tier_history 流程。

#### Scenario: 消費累積達到 silver 等級自動升等
- **WHEN** standard 用戶累積消費達 3000
- **THEN** tier_id 更新為 silver，tier_history 寫入 reason="upgrade"

#### Scenario: 已是最高等級不再升等
- **WHEN** gold 用戶繼續消費
- **THEN** tier_id 維持 gold，不寫入 tier_history

#### Scenario: 只升不降
- **WHEN** gold 用戶消費金額只符合 silver 門檻
- **THEN** 保持 gold（因 checkAndUpgradeTier 只升不降）

### Requirement: 年度重置 integration 測試
系統 SHALL 驗證年度重置的完整降等流程。

#### Scenario: 降等寫入 tier_history
- **WHEN** gold 用戶 annual_spend 不足 gold 門檻被降等
- **THEN** tier_history 記錄 from_tier=gold, to_tier=silver, reason=annual_reset

#### Scenario: 重置後 annual_spend 歸零
- **WHEN** 年度重置執行
- **THEN** 所有用戶 annual_spend = 0

#### Scenario: 符合保級不降等
- **WHEN** silver 用戶 annual_spend >= 3000
- **THEN** 維持 silver，不寫入降等 tier_history
