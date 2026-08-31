# cvs-pickup Specification

## Purpose
超商取貨：透過綠界物流 API 開啟地圖、依實況限制可用超商、門市選取結果以 postMessage 回傳。

## Requirements

### Requirement: 超商取貨地圖透過 ECPay 物流 API 開啟
系統 SHALL 呼叫 `POST /api/ecpay/cvs-map`，回傳 ECPay 物流地圖的 `actionUrl` 與簽章參數，由前端開啟彈窗跳轉。

#### Scenario: 取得超商地圖網址
- **WHEN** 前台傳入 `{ cvsCompany: "seven" | "family" | "hilife", isCollection?: boolean }`
- **THEN** 系統回傳 `{ actionUrl, params }`，params 含 `CheckMacValue`（使用物流專用 HASH_KEY/IV），且 `IsCollection` 依 `isCollection` 帶 `"Y"` 或 `"N"`

#### Scenario: 傳入不支援的超商類型
- **WHEN** `cvsCompany` 不在支援清單（含已停用的 `"ok"`）
- **THEN** 系統回傳 HTTP 400

#### Scenario: 貨到付款搭配不代收貨款的超商
- **WHEN** `isCollection` 為 `true` 且該超商不在可代收清單
- **THEN** 系統回傳 HTTP 400，不產生地圖參數

### Requirement: 超商可用性依綠界實況限制
系統 SHALL 只開放綠界 C2C 店到店實際可用的超商，且貨到付款 SHALL 只開放可代收貨款的超商。可選清單與可代收清單 SHALL 分開維護（`src/lib/cvs.ts`），因為兩者曾各自變動。

- OK 超商（`OKMARTC2C`）已被綠界停用，電子地圖一律回「OK超商暫停服務」，不得列為可選項；歷史訂單仍存有 `"ok"`，各處顯示用的名稱對應表 SHALL 保留該鍵。
- 7-ELEVEN、全家、萊爾富三家皆支援代收貨款。代收金額由賣家在綠界後台建物流單時設定，門市櫃台不經手；萊爾富散客走櫃台自填單的店到店不代收，屬另一種服務，不影響本系統。

#### Scenario: 建立貨到付款訂單時帶入不代收的超商
- **WHEN** `POST /api/orders` 的 `paymentMethod` 為 `"cod"`、`deliveryType` 為 `"cvs"`，且 `cvsInfo.company` 不在可代收清單
- **THEN** 系統回傳 HTTP 400，不建立訂單

### Requirement: 門市選取結果透過 postMessage 傳回前台
系統 SHALL 在 `/api/ecpay/cvs-callback` 收到 ECPay 回調後，先驗證 `CheckMacValue` 簽章（使用物流專用 `ECPAY_LOGISTICS_HASH_KEY` / `ECPAY_LOGISTICS_HASH_IV`），驗證通過才產生含 `postMessage` 的 HTML 頁面，將 `{ storeId, storeName, address }` 傳給 opener 視窗，並自動關閉彈窗。

#### Scenario: 使用者選取門市（簽章有效）
- **WHEN** ECPay 物流地圖回調 `POST /api/ecpay/cvs-callback`，且 `CheckMacValue` 驗證通過
- **THEN** 回傳 HTML，執行 `window.opener.postMessage({ type: "cvs-selected", storeId, storeName, address }, BASE_URL)`，然後 `window.close()`

#### Scenario: 簽章驗證失敗
- **WHEN** ECPay 物流地圖回調的 `CheckMacValue` 與計算值不符
- **THEN** 系統回傳 HTTP 400，不執行 postMessage，不關閉視窗
