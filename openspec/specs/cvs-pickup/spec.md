## ADDED Requirements

### Requirement: 超商取貨地圖透過 ECPay 物流 API 開啟
系統 SHALL 呼叫 `POST /api/ecpay/cvs-map`，回傳 ECPay 物流地圖的 `actionUrl` 與簽章參數，由前端開啟彈窗跳轉。

#### Scenario: 取得超商地圖網址
- **WHEN** 前台傳入 `{ cvsCompany: "seven" | "family" | "hilife" | "ok" }`
- **THEN** 系統回傳 `{ actionUrl, params }`，params 含 `CheckMacValue`（使用物流專用 HASH_KEY/IV）

#### Scenario: 傳入不支援的超商類型
- **WHEN** `cvsCompany` 不在支援清單
- **THEN** 系統回傳 HTTP 400

### Requirement: 門市選取結果透過 postMessage 傳回前台
系統 SHALL 在 `/api/ecpay/cvs-callback` 收到 ECPay 回調後，產生含 `postMessage` 的 HTML 頁面，將 `{ storeId, storeName, address }` 傳給 opener 視窗，並自動關閉彈窗。

#### Scenario: 使用者選取門市
- **WHEN** ECPay 物流地圖回調 `POST /api/ecpay/cvs-callback`
- **THEN** 回傳 HTML，執行 `window.opener.postMessage({ type: "cvs-selected", storeId, storeName, address }, BASE_URL)`，然後 `window.close()`
