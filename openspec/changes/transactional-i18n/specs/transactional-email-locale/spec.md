## ADDED Requirements

### Requirement: 訂單語系於建立時決定並持久化
建立訂單時 SHALL 記錄客戶當下所在站別的語系（`zh` 或 `en`），並持久化在訂單記錄上。

語系來源 SHALL 是前端傳入的站別語系（`useLocale()`），**SHALL NOT** 使用 `Accept-Language` 標頭——站上語言由 URL 前綴決定，那才是客戶實際正在閱讀的語言；瀏覽器偏好可能完全不同（例如台灣人刻意瀏覽英文站要送禮給國外朋友）。

持久化是必要的而非方便：出貨信由後台事後手動觸發，當下沒有客戶的 request context。

#### Scenario: 英文站下單
- **WHEN** 客戶在 `/en/checkout` 完成建單
- **THEN** 訂單記錄的語系為 `en`

#### Scenario: 中文站下單
- **WHEN** 客戶在 `/checkout` 完成建單
- **THEN** 訂單記錄的語系為 `zh`

#### Scenario: 前端未傳語系
- **WHEN** 建單請求沒有帶語系欄位（舊版前端或直接打 API）
- **THEN** 訂單語系為 `zh`，建單正常完成——語系缺漏 SHALL NOT 阻擋交易

### Requirement: 交易信件依訂單語系決定內容語言
訂單確認信與出貨信 SHALL 依訂單持久化的語系輸出對應語言的主旨與內文。

沿用 `src/lib/email.ts` 既有的雙語做法（資料型別帶 `locale`、樣板內以 `isEn` 分歧），與體驗開課申請信、接案諮詢信一致。

#### Scenario: 英文訂單的確認信
- **WHEN** 語系為 `en` 的訂單付款成功
- **THEN** 客戶收到英文主旨與英文內文的訂單確認信

#### Scenario: 英文訂單的出貨信
- **WHEN** 後台對語系為 `en` 的訂單觸發出貨通知
- **THEN** 客戶收到英文出貨信——語言取自**訂單**，不取自後台操作者的介面語系

#### Scenario: 中文訂單維持原行為
- **WHEN** 語系為 `zh` 的訂單付款成功或出貨
- **THEN** 信件內容與本變更前完全相同

#### Scenario: PayPal 付款的國際訂單
- **WHEN** 國際訂單經 PayPal 付款成功並觸發 `sendOrderEmails`
- **THEN** 信件語言依訂單語系——PayPal 是國際訂單唯一的付款方式，這條路徑寄錯語言等於所有國際客人都收到看不懂的收據

### Requirement: 語系值受限且不阻擋交易
訂單語系 SHALL 限定為 `zh` 或 `en` 兩個值，並在資料層以約束擋下其他值。

存為字串而非 enum，日後增加語言不必改 schema；但以 CHECK 約束擋掉打錯的值。

#### Scenario: 非法語系值
- **WHEN** 嘗試以 `zh` / `en` 以外的值寫入訂單語系
- **THEN** 資料層拒絕該寫入

#### Scenario: 既有訂單
- **WHEN** 讀取本變更之前建立的訂單
- **THEN** 其語系為 `zh`——既有訂單的信本來就是中文寄出的，回填 `zh` 不改變任何已發生的事實
