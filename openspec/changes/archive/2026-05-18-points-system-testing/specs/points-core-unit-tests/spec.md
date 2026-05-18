## ADDED Requirements

### Requirement: issuePoints flagging 測試
系統 SHALL 為 `issuePoints()` 的 is_flagged 邏輯提供 unit tests。

#### Scenario: multiplier > 5 時設定 is_flagged = true
- **WHEN** 活動倍率 multiplier = 6
- **THEN** 寫入的 point_transactions 包含 is_flagged = true

#### Scenario: multiplier <= 5 時 is_flagged = false
- **WHEN** 活動倍率 multiplier = 3
- **THEN** 寫入的 point_transactions 包含 is_flagged = false

#### Scenario: multiplier 剛好 5 時不 flag
- **WHEN** 活動倍率 multiplier = 5
- **THEN** is_flagged = false（因為條件是 > 5）

### Requirement: deductPoints 邊界值測試
系統 SHALL 為 `deductPoints()` 提供邊界值 tests。

#### Scenario: points = 0 不寫入
- **WHEN** deductPoints({ points: 0 })
- **THEN** 不呼叫 supabase insert

#### Scenario: 負數 points 不寫入
- **WHEN** deductPoints({ points: -10 })
- **THEN** 不呼叫 supabase insert（因 points <= 0）

#### Scenario: 正常扣點寫入負值
- **WHEN** deductPoints({ points: 50 })
- **THEN** 寫入 points = -50, type = "redeem"

### Requirement: refundPoints 邊界值測試
系統 SHALL 為 `refundPoints()` 提供邊界值 tests。

#### Scenario: points = 0 不寫入
- **WHEN** refundPoints({ points: 0 })
- **THEN** 不呼叫 supabase insert

#### Scenario: 正常退還寫入正值
- **WHEN** refundPoints({ points: 30 })
- **THEN** 寫入 points = 30, type = "refund"

### Requirement: calculateEarning 活動倍率組合測試
系統 SHALL 為 `calculateEarning()` 在不同活動類型組合下的計算提供 tests。

#### Scenario: 無活動時倍率為 1
- **WHEN** 無進行中的 points_campaigns
- **THEN** earned = floor(earnBase × tier.points_rate × 1)

#### Scenario: global 活動取最高倍率
- **WHEN** 有兩個 global 活動（2x 和 3x）
- **THEN** 使用最高的 3x

#### Scenario: first_purchase 活動只對首購生效
- **WHEN** 有 first_purchase 活動且用戶無 earn 記錄
- **THEN** 適用 first_purchase 倍率

#### Scenario: first_purchase 對非首購不生效
- **WHEN** 有 first_purchase 活動但用戶已有 earn 記錄
- **THEN** 不適用，回退到 global 或預設 1x

### Requirement: getValidBalance 準確性測試
系統 SHALL 驗證 `getValidBalance()` 的雙查詢邏輯正確性。

#### Scenario: 正值未過期 + 負值 = 正確餘額
- **WHEN** 正值 100 + 50，負值 -30
- **THEN** 餘額 = 120

#### Scenario: 全部過期回傳 0
- **WHEN** 正值查詢回傳空（全過期），負值 -30
- **THEN** 餘額 = max(0 + (-30), 0) = 0

#### Scenario: 無交易回傳 0
- **WHEN** 正值和負值都為空
- **THEN** 餘額 = 0
