## MODIFIED Requirements

### Requirement: 國際地址顯示

管理後台與會員中心需支援顯示國際地址格式。

#### Scenario: 後台訂單詳情顯示國際地址
- **WHEN** 訂單 shipping_address.type = "international"
- **THEN** 顯示：Address Line 1, Address Line 2, City, State, Postal Code, Country

#### Scenario: 會員中心訂單顯示國際地址
- **WHEN** 會員查看國際訂單
- **THEN** 以國際格式顯示配送地址與配送國家旗幟

#### Scenario: 國際訂單不可修改地址
- **WHEN** 國際訂單嘗試修改收件地址
- **THEN** 不允許修改（國際訂單出貨後無法變更）

#### Scenario: 後台訂單列表國際訂單標識
- **WHEN** 管理員瀏覽訂單列表
- **THEN** 國際訂單顯示「國際」標籤與目的地國家代碼，方便快速辨識
