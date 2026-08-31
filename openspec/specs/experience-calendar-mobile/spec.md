# experience-calendar-mobile Specification

## Purpose
手機版體驗月曆：格子以圓點顯示場次狀態、點選日期展開當日場次清單、卡片可直接導航至預約頁。手機是主要使用場景。

## Requirements

### Requirement: 月曆格子以圓點顯示場次狀態
月曆每個日期格 SHALL 只顯示日期數字與最多 3 個彩色圓點，不在格內放置文字按鈕。圓點顏色對應場次狀態：綠色（可預約）、灰色（額滿）、紅色（取消）。

#### Scenario: 有可預約場次的日期
- **WHEN** 某日期有至少一個 status 為 `open` 的場次
- **THEN** 格子顯示日期數字與對應數量的綠色圓點（最多 3 個）

#### Scenario: 額滿場次的日期
- **WHEN** 某日期所有場次 status 均為 `full`
- **THEN** 格子顯示日期數字與灰色圓點

#### Scenario: 超過 3 個場次
- **WHEN** 某日期場次數量超過 3
- **THEN** 格子只顯示 3 個圓點，點選後展開清單仍顯示所有場次

#### Scenario: 無場次的日期
- **WHEN** 某日期無任何場次
- **THEN** 格子只顯示日期數字，無圓點

### Requirement: 點選日期展開場次清單
使用者點選有場次的日期時，月曆正下方 SHALL inline 展開該日所有場次的卡片清單。

#### Scenario: 點選有場次的日期
- **WHEN** 使用者點擊月曆中有圓點的日期格
- **THEN** 月曆下方展開場次清單，顯示該日所有場次卡片

#### Scenario: 再次點選同一天折疊
- **WHEN** 使用者點擊已選中的日期格
- **THEN** 場次清單收起，selectedDay 重設為 null

#### Scenario: 點選不同日期切換
- **WHEN** 使用者點擊另一個日期格（非當前選中日）
- **THEN** 場次清單切換顯示新日期的場次

#### Scenario: 切換月份時清單收起
- **WHEN** 使用者點擊上一月或下一月按鈕
- **THEN** selectedDay 重設為 null，場次清單不顯示

### Requirement: 場次卡片可直接導航至預約頁
場次清單中每張場次卡片 SHALL 顯示完整資訊，並提供預約按鈕。

#### Scenario: 可預約場次卡片
- **WHEN** 場次 status 為 `open` 且非過去日期
- **THEN** 卡片顯示開始時間、剩餘名額，「立即預約」按鈕可點擊，點擊後導航至 `/experiences/booking/{sessionId}`

#### Scenario: 額滿場次卡片
- **WHEN** 場次 status 為 `full`
- **THEN** 卡片顯示「額滿」標籤，預約按鈕 disabled

#### Scenario: 取消場次卡片
- **WHEN** 場次 status 為 `cancelled`
- **THEN** 卡片顯示「已取消」標籤，預約按鈕 disabled
