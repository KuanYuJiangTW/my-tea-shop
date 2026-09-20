## ADDED Requirements

### Requirement: 結帳錯誤訊息可在地化
`POST /api/orders` 的錯誤回應 SHALL 帶一個穩定的錯誤代碼，前端 SHALL 以該代碼查 `messages/` 取得對應語言的字串。

回應形狀：

```jsonc
{ "code": "cart.empty", "message": "購物車不能為空", "error": "購物車不能為空" }
```

- `code`：穩定契約，前端據以查表
- `message`：中文，供伺服器日誌與除錯使用，**SHALL NOT** 由前端直接顯示給客戶
- `error`：保留與既有消費者的相容性，值同 `message`

API **SHALL NOT** 依請求語系回傳不同語言的字串——那會讓 API 同時負責業務與呈現，並使伺服器日誌變成中英混雜而難以搜尋。呈現層的事留在呈現層。

#### Scenario: 英文站結帳失敗
- **WHEN** 客戶在 `/en/checkout` 送出建單請求並被拒絕（例如購物車為空）
- **THEN** 畫面顯示英文錯誤訊息，**SHALL NOT** 出現中文

#### Scenario: 中文站結帳失敗
- **WHEN** 客戶在 `/checkout` 送出建單請求並被拒絕
- **THEN** 畫面顯示中文錯誤訊息，語意與本變更前一致

#### Scenario: 回傳了前端不認識的代碼
- **WHEN** API 回傳的 `code` 在 `messages/` 裡查無對應字串
- **THEN** 顯示該語系的通用錯誤訊息，**SHALL NOT** 顯示原始的 `message` 或空白

### Requirement: 前端不得讓後端字串蓋掉在地化字串
前端顯示錯誤時 SHALL 以「代碼查表 → 查無則通用訊息」為順序，**SHALL NOT** 使用 `json.error ?? t(…)` 這類讓後端字串優先的寫法。

> 這條是本變更的根因。`json.error` 在錯誤回應中一定存在，因此 `?? t(…)` 的在地化 fallback 一次都不會執行——程式碼看起來有做雙語，那一行實際上是死的。四個呼叫點（`CheckoutClient.tsx:408/428/459/489`）全部如此。

#### Scenario: 後端同時回了代碼與中文訊息
- **WHEN** 英文站收到 `{ "code": "cart.empty", "message": "購物車不能為空" }`
- **THEN** 顯示英文字串——後端的中文 `message` 不得勝出

#### Scenario: 這條行為必須被測試釘住
- **WHEN** 有人把前端改回「後端字串優先」的寫法
- **THEN** 測試 SHALL 變紅——現行寫法之所以能長期失效，正是因為沒有任何測試證明 fallback 會執行
