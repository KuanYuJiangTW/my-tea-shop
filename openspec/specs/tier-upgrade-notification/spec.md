# tier-upgrade-notification Specification

## Purpose
升等的即時通知、保級預警的顯示，以及結帳頁的等級提示。讓會員知道自己離下一級還差多少。

## Requirements

### Requirement: 升等即時通知
系統 SHALL 在用戶等級提升時記錄升等事件，並在帳戶頁顯示升等通知。

#### Scenario: 消費觸發升等
- **WHEN** 用戶年消費累計達到更高等級門檻
- **THEN** 系統記錄升等事件，下次進入帳戶頁顯示「恭喜升等為 XX 會員」通知

#### Scenario: 升等 email 通知
- **WHEN** 升等事件觸發
- **THEN** 系統發送 email 通知，包含新等級名稱、新回饋率、新折抵上限

### Requirement: 保級預警顯示
系統 SHALL 在年底前 2 個月，於帳戶頁顯示保級預警。

#### Scenario: 接近年底且消費未達門檻
- **WHEN** 目前為 11-12 月，且用戶當前等級高於 standard，且 annual_spend 未達當前等級 min_annual_spend
- **THEN** 帳戶頁顯示「距離保級還差 NT$XXX，年底前達標可保留 XX 等級」

#### Scenario: 已達標或為 standard
- **WHEN** 用戶 annual_spend 已達當前等級門檻，或為 standard 等級
- **THEN** 不顯示保級預警

### Requirement: 結帳頁等級提示
系統 SHALL 在結帳頁的點數折抵區域顯示用戶等級與折抵上限。

#### Scenario: 顯示等級上限提示
- **WHEN** 用戶在結帳頁且有點數餘額
- **THEN** 顯示「您為 XX 會員，本次最高可折抵 NT$YY」
