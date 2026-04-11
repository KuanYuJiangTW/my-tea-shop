## MODIFIED Requirements

### Requirement: 門市選取結果透過 postMessage 傳回前台
系統 SHALL 在 `/api/ecpay/cvs-callback` 收到 ECPay 回調後，先驗證 `CheckMacValue` 簽章（使用物流專用 `ECPAY_LOGISTICS_HASH_KEY` / `ECPAY_LOGISTICS_HASH_IV`），驗證通過才產生含 `postMessage` 的 HTML 頁面，將 `{ storeId, storeName, address }` 傳給 opener 視窗，並自動關閉彈窗。

#### Scenario: 使用者選取門市（簽章有效）
- **WHEN** ECPay 物流地圖回調 `POST /api/ecpay/cvs-callback`，且 `CheckMacValue` 驗證通過
- **THEN** 回傳 HTML，執行 `window.opener.postMessage({ type: "cvs-selected", storeId, storeName, address }, BASE_URL)`，然後 `window.close()`

#### Scenario: 簽章驗證失敗
- **WHEN** ECPay 物流地圖回調的 `CheckMacValue` 與計算值不符
- **THEN** 系統回傳 HTTP 400，不執行 postMessage，不關閉視窗
