## ADDED Requirements

### Requirement: 公告條依登入狀態擇一顯示

系統 SHALL 在 Header 上方顯示單一則公告，內容依登入狀態決定，且 SHALL NOT 輪播。

#### Scenario: 未登入訪客
- **WHEN** auth 載入完成、無登入使用者，且當前路徑不是註冊頁
- **THEN** 顯示新會員券文案，整條為連結指向 `/auth/register`（`/en` 時為 `/en/auth/register`）

#### Scenario: 未登入但人已經在註冊頁
- **WHEN** auth 載入完成、無登入使用者，且當前路徑為 `/auth/register` 或 `/en/auth/register`
- **THEN** 改顯示國際配送文案——新會員券那則的 CTA 會指向當前頁，點了等於沒事發生；
  配送文案對還沒註冊的人一樣成立，也維持「只講一件事」

#### Scenario: 已登入會員
- **WHEN** auth 載入完成且有登入使用者
- **THEN** 顯示國際配送文案，且 SHALL NOT 為連結（純資訊，無下一步動作）

#### Scenario: auth 尚在載入
- **WHEN** `useAuth()` 的 `loading` 為 true
- **THEN** 顯示國際配送文案——該訊息對登入與否皆成立，不會讓老客戶看到對自己
  無效的訊息再閃掉

### Requirement: 金額與門檻取自單一事實來源

公告文案中的金額 SHALL 由常數插值，SHALL NOT 寫死在翻譯字串裡。

#### Scenario: 國際免運門檻
- **WHEN** 渲染配送文案
- **THEN** 金額取自 `INTERNATIONAL_FREE_SHIPPING_THRESHOLD`（`src/lib/shipping-constants.ts`）

#### Scenario: 歡迎券金額
- **WHEN** 渲染新會員券文案
- **THEN** 金額／門檻／效期取自 `WELCOME_COUPON`（`src/lib/coupon-constants.ts`），
  與 `src/app/auth/callback/route.ts` 實際發券的值同源

### Requirement: 付款方式限制提前揭露

國際配送僅支援 PayPal，配送文案 SHALL 在 `md` 斷點以上附註此限制。

#### Scenario: 桌機顯示附註
- **WHEN** 視窗寬度 ≥ 768px 且顯示配送文案
- **THEN** 附註「（海外訂單以 PayPal 結帳）」一併顯示

#### Scenario: 手機收起附註
- **WHEN** 視窗寬度 < 768px
- **THEN** 附註隱藏——一行塞不下，結帳頁另有 `intlPaypalOnly` 完整說明

### Requirement: 可關閉並記憶 7 天

系統 SHALL 提供關閉鈕；關閉後 SHALL 於 `localStorage` 記錄 7 天靜默期，期間 SHALL NOT 顯示公告條。
讀寫 `localStorage` 失敗時 SHALL 照常顯示，SHALL NOT 因此中斷渲染。

#### Scenario: 關閉公告
- **WHEN** 使用者點擊關閉鈕
- **THEN** 公告條移除，`localStorage.wj-announcement-dismissed-until` 存入 7 天後的時間戳

#### Scenario: 靜默期內再訪
- **WHEN** 現在時間早於已存的時間戳
- **THEN** 公告條不顯示

#### Scenario: 靜默期屆滿
- **WHEN** 現在時間晚於已存的時間戳
- **THEN** 公告條恢復顯示

#### Scenario: localStorage 不可用
- **WHEN** 無痕模式或瀏覽器封鎖儲存，讀寫 localStorage 丟出例外
- **THEN** 例外被吞掉，公告條照常顯示（不得因此白畫面）

### Requirement: 結帳流程不顯示公告條

系統 SHALL NOT 在結帳與後台路徑掛載公告條。

#### Scenario: 結帳頁
- **WHEN** 路徑為 `/checkout` 或 `/en/checkout`
- **THEN** 不掛載公告條——避免在付款前製造離開誘因

#### Scenario: 後台
- **WHEN** 路徑以 `/admin` 開頭
- **THEN** 不掛載（沿用 `SiteChrome` 既有的 chrome 排除）

### Requirement: 版面與可及性

公告條 SHALL 維持 36px 的單行高度且 SHALL NOT 造成水平溢出，配色 SHALL 通過 AA 內文對比，
關閉鈕 SHALL 具備 36×36px 觸控區與 `aria-label`。

#### Scenario: 條高固定
- **WHEN** 於 375／640／768／1280 任一寬度，中文或英文
- **THEN** 公告條高度為 36px，文字單行不斷行，且不造成水平溢出

#### Scenario: 對比與觸控
- **WHEN** 渲染公告條
- **THEN** 底色 `tea-green-dark`（#5C7A67）配白字，對比 4.74 通過 AA 內文門檻；
  關閉鈕觸控區為 36×36px，並有 `aria-label`
